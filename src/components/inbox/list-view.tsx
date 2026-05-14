import Link from "next/link";
import { ArrowDown, ArrowUp, Layers } from "lucide-react";

import { diffDays } from "@/lib/date";
import {
  documentTypeLabel,
  formatAmount,
  formatDate,
  reminderLabel,
  shortId,
} from "@/lib/format";
import type { Bucket } from "@/server/queries/letters";
import type { SortKey } from "@/server/queries/letters";

import type { LetterCardData } from "./letter-card";
import { LetterCardStatusPill as StatusPill } from "./letter-card";

interface Base {
  search: string;
  documentType: string;
  area: string;
  paymentStatus: string;
  tags: string[];
  view: string;
  group: string;
}

// ---------- Flat list (classic table) ----------

export function ListFlat({
  letters,
  groupCounts,
  areaLabel,
  sort,
  dir,
  base,
  now,
}: {
  letters: LetterCardData[];
  groupCounts: Map<string, number>;
  areaLabel: Map<string, string>;
  sort: SortKey;
  dir: "asc" | "desc";
  base: Base;
  now: Date;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <SortHead label="Eingang" sortKey="receivedAt" sort={sort} dir={dir} base={base} className="w-24 pl-5" />
            <SortHead label="Absender" sortKey="sender" sort={sort} dir={dir} base={base} className="w-48" />
            <SortHead label="Betreff" sortKey="subject" sort={sort} dir={dir} base={base} />
            <th className="w-24 py-2.5 px-3 text-left font-medium">Typ</th>
            <th className="w-24 py-2.5 px-3 text-left font-medium">Bereich</th>
            <SortHead label="Betrag" sortKey="amount" sort={sort} dir={dir} base={base} className="w-28 text-right" />
            <SortHead label="Frist" sortKey="dueDate" sort={sort} dir={dir} base={base} className="w-24" />
            <th className="w-28 py-2.5 px-3 text-left font-medium">Status</th>
            <th className="w-36 py-2.5 pr-5 text-left font-medium">Tags</th>
          </tr>
        </thead>
        <tbody>
          {letters.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-16 text-center text-sm text-muted-foreground">
                Keine Briefe gefunden.
              </td>
            </tr>
          ) : (
            letters.map((l, i) => (
              <LetterRow
                key={l.id}
                letter={l}
                groupCount={l.groupId ? groupCounts.get(l.groupId) ?? 1 : 1}
                areaLabel={areaLabel}
                now={now}
                index={i}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Grouped list (master + subrows) ----------

export function ListGrouped({
  buckets,
  areaLabel,
  sort,
  dir,
  base,
  now,
}: {
  buckets: Bucket[];
  areaLabel: Map<string, string>;
  sort: SortKey;
  dir: "asc" | "desc";
  base: Base;
  now: Date;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <SortHead label="Eingang" sortKey="receivedAt" sort={sort} dir={dir} base={base} className="w-24 pl-5" />
            <SortHead label="Absender" sortKey="sender" sort={sort} dir={dir} base={base} className="w-48" />
            <SortHead label="Betreff" sortKey="subject" sort={sort} dir={dir} base={base} />
            <th className="w-24 py-2.5 px-3 text-left font-medium">Typ</th>
            <th className="w-24 py-2.5 px-3 text-left font-medium">Bereich</th>
            <SortHead label="Betrag" sortKey="amount" sort={sort} dir={dir} base={base} className="w-28 text-right" />
            <SortHead label="Frist" sortKey="dueDate" sort={sort} dir={dir} base={base} className="w-24" />
            <th className="w-28 py-2.5 px-3 text-left font-medium">Status</th>
            <th className="w-36 py-2.5 pr-5 text-left font-medium">Tags</th>
          </tr>
        </thead>
        <tbody>
          {buckets.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-16 text-center text-sm text-muted-foreground">
                Keine Briefe gefunden.
              </td>
            </tr>
          ) : (
            buckets.flatMap((b, i) => {
              const total = 1 + b.siblings.length;
              const rows: React.ReactNode[] = [];
              // If total === 1: render hero directly, no master-row
              if (total === 1) {
                rows.push(
                  <LetterRow
                    key={b.hero.id}
                    letter={b.hero as unknown as LetterCardData}
                    groupCount={1}
                    areaLabel={areaLabel}
                    now={now}
                    index={i}
                  />,
                );
              } else {
                // Master row
                rows.push(
                  <LetterRow
                    key={`hero-${b.hero.id}`}
                    letter={b.hero as unknown as LetterCardData}
                    groupCount={total}
                    areaLabel={areaLabel}
                    now={now}
                    index={i}
                    isGroupMaster
                  />,
                );
                // Siblings (oldest first)
                for (const s of b.siblings) {
                  rows.push(
                    <LetterRow
                      key={s.id}
                      letter={s as unknown as LetterCardData}
                      groupCount={1}
                      areaLabel={areaLabel}
                      now={now}
                      index={i}
                      isSub
                    />,
                  );
                }
              }
              return rows;
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Shared row ----------

function LetterRow({
  letter,
  groupCount,
  areaLabel,
  now,
  index,
  isGroupMaster,
  isSub,
}: {
  letter: LetterCardData;
  groupCount: number;
  areaLabel: Map<string, string>;
  now: Date;
  index: number;
  isGroupMaster?: boolean;
  isSub?: boolean;
}) {
  const days = letter.dueDate ? diffDays(now, letter.dueDate) : null;
  const overdue = days != null && days < 0 && letter.paymentStatus === "open";
  const soon =
    days != null && days >= 0 && days <= 7 && letter.paymentStatus === "open";
  return (
    <tr
      className={`group border-b border-border/60 last:border-b-0 transition-colors stagger-child ${
        isSub
          ? "bg-muted/10 hover:bg-muted/30"
          : isGroupMaster
            ? "bg-muted/20 hover:bg-muted/40"
            : "hover:bg-muted/30"
      }`}
      style={{ ["--index" as never]: Math.min(index, 25) } as React.CSSProperties}
    >
      <td className="py-3 pl-5 relative">
        {overdue ? (
          <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-destructive rounded-r" />
        ) : soon ? (
          <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-warning rounded-r" />
        ) : null}
        <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {isSub ? <span className="mr-1 text-muted-foreground/50">↳</span> : null}
          {formatDate(letter.receivedAt)}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">
          {shortId(letter.id)}
        </div>
      </td>
      <td className={`py-3 px-3 truncate max-w-48 text-foreground/90 ${isSub ? "text-foreground/70" : ""}`}>
        {letter.canonicalName ?? letter.senderRawName ?? "—"}
      </td>
      <td className="py-3 px-3 max-w-md">
        <Link
          href={`/letters/${letter.id}`}
          className={`hover:text-primary transition-colors leading-snug line-clamp-1 ${
            isGroupMaster ? "font-semibold text-foreground" : "font-medium text-foreground"
          } ${isSub ? "font-normal text-foreground/85" : ""}`}
        >
          {letter.subject ?? letter.reference ?? "(ohne Titel)"}
        </Link>
        {letter.reminderLevel && letter.reminderLevel > 0 ? (
          <div className="text-[11px] text-warning mt-0.5 font-medium">
            {reminderLabel(letter.reminderLevel)}
          </div>
        ) : null}
      </td>
      <td className="py-3 px-3">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {documentTypeLabel(letter.documentType)}
        </span>
      </td>
      <td className="py-3 px-3">
        {letter.area ? (
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {areaLabel.get(letter.area) ?? letter.area}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="py-3 px-3 text-right font-mono tabular-nums text-foreground/90">
        {letter.amount != null
          ? formatAmount(letter.amount, letter.currency ?? "CHF")
          : <span className="text-muted-foreground">—</span>}
      </td>
      <td
        className={`py-3 px-3 font-mono text-xs tabular-nums ${
          overdue ? "text-destructive" : soon ? "text-warning" : "text-muted-foreground"
        }`}
      >
        {letter.dueDate
          ? overdue
            ? `−${Math.abs(days!)}T`
            : soon
              ? `+${days}T`
              : formatDate(letter.dueDate)
          : "—"}
      </td>
      <td className="py-3 px-3">
        <StatusPill
          paymentStatus={letter.paymentStatus}
          taskStatus={letter.taskStatus}
        />
      </td>
      <td className="py-3 pr-5">
        <div className="flex flex-wrap gap-1 items-center">
          {letter.tags.slice(0, 3).map((t) => (
            <span
              key={t.name}
              className={`text-[10px] px-1.5 py-0.5 rounded-sm ${
                t.kind === "auto"
                  ? "text-muted-foreground bg-muted/60"
                  : "text-primary bg-primary/10"
              }`}
            >
              {t.name.replace(/^auto:/, "")}
            </span>
          ))}
          {letter.tags.length > 3 ? (
            <span className="text-[10px] text-muted-foreground">
              +{letter.tags.length - 3}
            </span>
          ) : null}
          {isGroupMaster || (groupCount > 1 && letter.groupId) ? (
            <Link
              href={letter.groupId ? `/groups/${letter.groupId}` : "#"}
              className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
              title={`Gruppe mit ${groupCount} Briefen`}
            >
              <Layers className="size-3" strokeWidth={2} />
              {groupCount}
            </Link>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function SortHead({
  label,
  sortKey,
  sort,
  dir,
  base,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortKey;
  dir: string;
  base: Base;
  className?: string;
}) {
  const active = sort === sortKey;
  const nextDir = active && dir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams({
    q: base.search,
    type: base.documentType,
    area: base.area,
    pay: base.paymentStatus,
    view: base.view,
    group: base.group,
    sort: sortKey,
    dir: nextDir,
  });
  for (const t of base.tags) params.append("tag", t);
  return (
    <th className={`py-2.5 px-3 text-left font-medium ${className ?? ""}`}>
      <Link
        href={`/inbox?${params.toString()}`}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
          active ? "text-foreground" : ""
        }`}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="size-3" strokeWidth={2} />
          ) : (
            <ArrowDown className="size-3" strokeWidth={2} />
          )
        ) : null}
      </Link>
    </th>
  );
}
