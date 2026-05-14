import { listLeads } from "@/server/queries/leads";
import { LEAD_STATUS_LABELS } from "@/lib/lead-format";
import type { LeadStatus } from "@/server/db/schema";

function csvCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const status = sp.get("status");
  const hasWebshop = sp.get("hasWebshop");
  const hasAiChatbot = sp.get("hasAiChatbot");
  const minScore = sp.get("minScore");
  const q = sp.get("q");

  const rows = await listLeads({
    q: q || null,
    status: status && status !== "all" ? (status as LeadStatus) : null,
    hasWebshop:
      hasWebshop && hasWebshop !== "all" ? hasWebshop === "true" : null,
    hasAiChatbot:
      hasAiChatbot && hasAiChatbot !== "all" ? hasAiChatbot === "true" : null,
    minScore: minScore ? Number(minScore) : null,
  });

  const header = [
    "Apotheke",
    "Ort",
    "Quelle",
    "Status",
    "Kontakt",
    "E-Mail",
    "Telefon",
    "Website",
    "Webshop",
    "Shop-URL",
    "KI-Chatbot",
    "Score",
    "Erfasst",
  ];

  const lines = [header.map(csvCell).join(";")];
  for (const l of rows) {
    lines.push(
      [
        l.pharmacyName,
        l.city ?? "",
        l.source ?? "",
        LEAD_STATUS_LABELS[l.status as LeadStatus] ?? l.status,
        l.contactName ?? "",
        l.email ?? "",
        l.phone ?? "",
        l.websiteUrl ?? "",
        l.hasWebshop ? "Ja" : "Nein",
        l.shopUrl ?? "",
        l.hasAiChatbot ? "Ja" : "Nein",
        l.overallScore != null ? l.overallScore.toFixed(2) : "",
        l.createdAt.toISOString(),
      ]
        .map(csvCell)
        .join(";"),
    );
  }

  const body = "﻿" + lines.join("\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${stamp}.csv"`,
    },
  });
}
