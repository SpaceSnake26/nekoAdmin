import { writeFile } from "node:fs/promises";
import path from "node:path";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { diffDays, formatIsoDate } from "@/lib/date";
import { db, schema } from "@/server/db";
import type { Letter, LetterGroup, Sender } from "@/server/db/schema";

type LetterWithCtx = Letter & {
  sender: Sender | null;
  group: LetterGroup | null;
  tags: string[];
};

const MD_PATH = path.resolve(process.cwd(), "data", "briefe.md");

/**
 * Render the full briefe.md from current DB state. Deterministic — no LLM call.
 */
export async function renderMarkdownIndex(): Promise<{
  path: string;
  bytes: number;
  letterCount: number;
}> {
  const now = new Date();
  const letters = await loadLettersWithContext();
  const openByDue = letters
    .filter((l) => l.paymentStatus === "open" && l.dueDate)
    .sort(
      (a, b) =>
        (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0),
    );
  const overdue = openByDue.filter((l) => l.dueDate && l.dueDate < now);
  const dueThisWeek = openByDue.filter((l) => {
    if (!l.dueDate) return false;
    const d = diffDays(now, l.dueDate);
    return d >= 0 && d <= 7;
  });
  const openTasks = letters
    .filter((l) => l.taskStatus === "open")
    .sort(
      (a, b) =>
        (a.dueDate?.getTime() ?? Infinity) -
        (b.dueDate?.getTime() ?? Infinity),
    );
  const groups = await loadGroupsWithLetters();
  const groupsWithReminders = [...groups.values()].filter((g) =>
    g.letters.some((l) => (l.reminderLevel ?? 0) > 0),
  );

  const totalOpen = openByDue.reduce((s, l) => s + (l.amount ?? 0), 0);

  const lines: string[] = [];
  const push = (s: string) => lines.push(s);

  push(`# Briefe-Übersicht – nekosys GmbH`);
  push(`_Generiert: ${formatDateTime(now)} · ${letters.length} Briefe total_`);
  push("");

  // TL;DR
  push("## TL;DR – heute relevant");
  if (dueThisWeek.length === 0 && overdue.length === 0 && openTasks.length === 0) {
    push("- Keine offenen Zahlungen oder Aufgaben diese Woche.");
  } else {
    if (overdue.length > 0) {
      push(`- **${overdue.length} überfällige Rechnung(en)** Total ${chf(overdue.reduce((s, l) => s + (l.amount ?? 0), 0))}`);
      for (const l of overdue.slice(0, 5)) {
        push(`  - ${shortId(l)} ${nameOf(l)} ${chf(l.amount)} fällig ${formatIsoDate(l.dueDate)}`);
      }
    }
    if (dueThisWeek.length > 0) {
      push(`- **${dueThisWeek.length} Rechnung(en) diese Woche fällig** Total ${chf(dueThisWeek.reduce((s, l) => s + (l.amount ?? 0), 0))}`);
      for (const l of dueThisWeek.slice(0, 5)) {
        push(`  - ${shortId(l)} ${nameOf(l)} ${chf(l.amount)} fällig ${formatIsoDate(l.dueDate)}`);
      }
    }
    if (openTasks.length > 0) {
      push(`- **${openTasks.length} offene Aufgabe(n)**`);
      for (const l of openTasks.slice(0, 5)) {
        push(`  - ${shortId(l)} ${l.subject ?? l.epostTitle} ${l.dueDate ? "(Frist " + formatIsoDate(l.dueDate) + ")" : ""}`);
      }
    }
  }
  push("");

  // Aggregate
  push("## Aggregate");
  push("| Metrik | Wert |");
  push("|---|---|");
  push(`| Briefe gesamt | ${letters.length} |`);
  push(`| Offen (zahlpflichtig) | ${openByDue.length} |`);
  push(`| Überfällig | ${overdue.length} |`);
  push(`| Total offene Beträge | ${chf(totalOpen)} |`);
  push("");

  // Open invoices
  push("## Offene Rechnungen (sortiert nach Fälligkeit)");
  if (openByDue.length === 0) {
    push("_Keine offenen Rechnungen._");
  } else {
    push("| ID | Datum | Absender | Betrag | Fällig | Ref | Mahnung | Tags |");
    push("|---|---|---|---|---|---|---|---|");
    for (const l of openByDue) {
      push(
        `| ${shortId(l)} | ${formatIsoDate(l.letterDate) ?? "-"} | ${escape(nameOf(l))} | ${chf(l.amount)} | ${formatIsoDate(l.dueDate) ?? "-"} | ${escape(l.reference ?? "-")} | ${l.reminderLevel ?? 0} | ${escape(l.tags.join(", "))} |`,
      );
    }
  }
  push("");

  // Groups with reminders
  if (groupsWithReminders.length > 0) {
    push("## Gruppen mit Mahnungen");
    for (const g of groupsWithReminders) {
      push(`### ${shortGroupId(g.group)} – ${escape(g.group.title)} — ${g.group.status === "open" ? "offen" : "bezahlt"}`);
      const sorted = [...g.letters].sort(
        (a, b) =>
          (a.letterDate?.getTime() ?? a.receivedAt.getTime()) -
          (b.letterDate?.getTime() ?? b.receivedAt.getTime()),
      );
      for (const l of sorted) {
        const level =
          (l.reminderLevel ?? 0) === 0
            ? "Original"
            : (l.reminderLevel ?? 0) === 4
              ? "Betreibung"
              : `${l.reminderLevel}. Mahnung`;
        push(
          `- ${shortId(l)} ${level} ${formatIsoDate(l.letterDate) ?? formatIsoDate(l.receivedAt)} ${chf(l.amount)} fällig ${formatIsoDate(l.dueDate) ?? "-"}`,
        );
      }
      push("");
    }
  }

  // Tasks
  if (openTasks.length > 0) {
    push("## Aufgaben (nicht-zahl)");
    push("| ID | Titel | Frist | Absender |");
    push("|---|---|---|---|");
    for (const l of openTasks) {
      push(
        `| ${shortId(l)} | ${escape(l.subject ?? "-")} | ${formatIsoDate(l.dueDate) ?? "-"} | ${escape(nameOf(l))} |`,
      );
    }
    push("");
  }

  // Sections grouped by area (Bereich)
  const byArea = new Map<string, LetterWithCtx[]>();
  for (const l of letters) {
    const a = l.area ?? "_none";
    const arr = byArea.get(a) ?? [];
    arr.push(l);
    byArea.set(a, arr);
  }
  // Stable order: most-active areas first
  const areasSorted = [...byArea.entries()]
    .filter(([k]) => k !== "_none")
    .sort((a, b) => b[1].length - a[1].length);
  for (const [areaCode, list] of areasSorted) {
    push(`## Bereich: ${areaLabel(areaCode)} (${list.length})`);
    for (const l of list
      .slice()
      .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
      .slice(0, 20)) {
      push(
        `- ${shortId(l)} ${formatIsoDate(l.letterDate) ?? formatIsoDate(l.receivedAt)} ${escape(docTypeShort(l.documentType))} · ${escape(nameOf(l))} — ${escape(l.subject ?? l.epostTitle ?? "")}`,
      );
    }
    if (list.length > 20) push(`  _… ${list.length - 20} weitere_`);
    push("");
  }

  // Full index
  push("---");
  push("");
  push("## Brief-Index (alle, neueste zuerst)");
  push("");
  const sortedByReceived = letters
    .slice()
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
  for (const l of sortedByReceived) {
    push(`### ${shortId(l)} – ${escape(l.subject ?? l.epostTitle ?? "(ohne Titel)")}`);
    push(`- **Eingegangen:** ${formatIsoDate(l.receivedAt)}`);
    if (l.letterDate) push(`- **Briefdatum:** ${formatIsoDate(l.letterDate)}`);
    push(`- **Absender:** ${escape(nameOf(l))}`);
    push(`- **Typ:** ${l.documentType ?? "-"}${l.area ? " · Bereich: " + l.area : ""} (reminderLevel ${l.reminderLevel ?? 0})`);
    if (l.amount != null) {
      push(`- **Betrag:** ${chf(l.amount)}${l.dueDate ? " fällig " + formatIsoDate(l.dueDate) : ""}`);
    }
    if (l.reference) push(`- **Referenz:** ${escape(l.reference)}`);
    if (l.qrIban) push(`- **QR-IBAN:** ${escape(l.qrIban)}`);
    else if (l.iban) push(`- **IBAN:** ${escape(l.iban)}`);
    const status: string[] = [];
    if (l.paymentStatus !== "none") status.push(`Zahlung: ${l.paymentStatus}`);
    if (l.taskStatus !== "none") status.push(`Aufgabe: ${l.taskStatus}`);
    if (status.length > 0) push(`- **Status:** ${status.join(", ")}`);
    if (l.tags.length > 0) push(`- **Tags:** ${escape(l.tags.join(", "))}`);
    if (l.group) push(`- **Gruppe:** ${shortGroupId(l.group)}`);
    push(`- **PDF:** ${path.relative(process.cwd(), l.pdfPath)}`);
    if (l.summary) push(`- **Zusammenfassung:** ${escape(l.summary)}`);
    if (l.recommendedAction) push(`- **Empfehlung:** ${escape(l.recommendedAction)}`);
    push("");
  }

  const content = lines.join("\n");
  await writeFile(MD_PATH, content, "utf-8");
  return { path: MD_PATH, bytes: Buffer.byteLength(content), letterCount: letters.length };
}

async function loadLettersWithContext(): Promise<LetterWithCtx[]> {
  const letters = await db
    .select()
    .from(schema.letters)
    .orderBy(desc(schema.letters.receivedAt));

  const senderIds = [
    ...new Set(letters.map((l) => l.senderId).filter((x): x is string => !!x)),
  ];
  const groupIds = [
    ...new Set(letters.map((l) => l.groupId).filter((x): x is string => !!x)),
  ];

  const senders = senderIds.length
    ? await db
        .select()
        .from(schema.senders)
        .where(inArray(schema.senders.id, senderIds))
    : [];
  const groups = groupIds.length
    ? await db
        .select()
        .from(schema.letterGroups)
        .where(inArray(schema.letterGroups.id, groupIds))
    : [];
  const senderMap = new Map(senders.map((s) => [s.id, s]));
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  const letterIds = letters.map((l) => l.id);
  const tagsJoined = letterIds.length
    ? await db
        .select({
          letterId: schema.letterTags.letterId,
          name: schema.tags.name,
        })
        .from(schema.letterTags)
        .innerJoin(schema.tags, eq(schema.tags.id, schema.letterTags.tagId))
        .where(inArray(schema.letterTags.letterId, letterIds))
    : [];
  const tagMap = new Map<string, string[]>();
  for (const t of tagsJoined) {
    const arr = tagMap.get(t.letterId) ?? [];
    arr.push(t.name);
    tagMap.set(t.letterId, arr);
  }

  return letters.map((l) => ({
    ...l,
    sender: l.senderId ? (senderMap.get(l.senderId) ?? null) : null,
    group: l.groupId ? (groupMap.get(l.groupId) ?? null) : null,
    tags: (tagMap.get(l.id) ?? []).sort(),
  }));
}

async function loadGroupsWithLetters() {
  const all = await db.select().from(schema.letterGroups);
  const result = new Map<string, { group: LetterGroup; letters: Letter[] }>();
  for (const g of all) {
    const ls = await db
      .select()
      .from(schema.letters)
      .where(eq(schema.letters.groupId, g.id))
      .orderBy(asc(schema.letters.receivedAt));
    result.set(g.id, { group: g, letters: ls });
  }
  return result;
}

// --- render helpers ---

function chf(n: number | null | undefined): string {
  if (n == null) return "-";
  return "CHF " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/, "'");
}

function shortId(l: Letter | LetterWithCtx): string {
  return "L_" + l.id.slice(0, 6);
}

function shortGroupId(g: LetterGroup): string {
  return "G_" + g.id.slice(0, 6);
}

function nameOf(l: LetterWithCtx): string {
  return l.sender?.canonicalName ?? l.senderRawName ?? "(unbekannt)";
}

function escape(s: string | null | undefined): string {
  if (!s) return "-";
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function formatDateTime(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 16);
}

function areaLabel(code: string): string {
  // Lightweight server-side label fallback. The proper label is in DB but this
  // file is sync-rendered without a DB call per area-key. Fallback shows the
  // capitalized code, which is good enough.
  if (code === "_none" || !code) return "Ohne Bereich";
  return code.charAt(0).toUpperCase() + code.slice(1);
}

function docTypeShort(t: string | null | undefined): string {
  if (!t) return "?";
  const map: Record<string, string> = {
    rechnung: "Rg",
    mahnung: "Mn",
    betreibung: "Bt",
    verfuegung: "Vf",
    police: "Po",
    vertrag: "Vt",
    bestaetigung: "Bs",
    kontoauszug: "Ka",
    aufforderung: "Au",
    information: "In",
    werbung: "Wb",
    sonstiges: "?",
  };
  return map[t] ?? t.slice(0, 2);
}
