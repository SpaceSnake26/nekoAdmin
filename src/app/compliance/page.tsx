import { desc, isNotNull, isNull, sql } from "drizzle-orm";
import { Check, ShieldCheck, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { db, schema } from "@/server/db";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  newsletter: "Newsletter",
  survey: "Umfrage",
  "existing-customer": "Bestandskunde",
  "linkedin-reply": "LinkedIn-Antwort",
  manual: "Manuell",
};

const BASIS_TONE: Record<string, string> = {
  "UWG-opt-in": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
  "existing-customer": "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/40",
  "legitimate-interest": "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40",
  manual: "bg-muted text-muted-foreground border-border",
};

export default async function CompliancePage() {
  const [rows, stats] = await Promise.all([
    db
      .select()
      .from(schema.consentLedger)
      .orderBy(desc(schema.consentLedger.acceptedAt))
      .limit(200),
    db
      .select({
        active: sql<number>`count(*) filter (where revoked_at is null)`,
        revoked: sql<number>`count(*) filter (where revoked_at is not null)`,
        newsletter: sql<number>`count(*) filter (where kind = 'newsletter' and revoked_at is null)`,
        existingCustomer: sql<number>`count(*) filter (where kind = 'existing-customer' and revoked_at is null)`,
        linkedinReply: sql<number>`count(*) filter (where kind = 'linkedin-reply' and revoked_at is null)`,
      })
      .from(schema.consentLedger),
  ]);

  const s = stats[0] ?? {
    active: 0,
    revoked: 0,
    newsletter: 0,
    existingCustomer: 0,
    linkedinReply: 0,
  };

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      <section className="mb-10 border-b border-border pb-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          System · Compliance · UWG / DSG
        </div>
        <h1 className="text-3xl font-medium tracking-tight">Consent-Ledger</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Append-only-Protokoll jeder Einwilligung und jeder Abmeldung &mdash;
          benötigt für jede kommerzielle E-Mail nach Schweizer UWG Art. 3.
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
        <StatCard label="Aktive Opt-Ins" value={Number(s.active)} accent="emerald" />
        <StatCard label="Newsletter" value={Number(s.newsletter)} accent="sky" />
        <StatCard label="LinkedIn-Antwort" value={Number(s.linkedinReply)} accent="violet" />
        <StatCard label="Bestandskunden" value={Number(s.existingCustomer)} accent="amber" />
        <StatCard label="Widerrufen" value={Number(s.revoked)} accent="muted" />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-border">
          <h2 className="text-sm font-medium tracking-tight text-foreground/90">
            Einträge (max. 200, neueste zuerst)
          </h2>
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
            {rows.length}
          </span>
        </div>
        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md bg-muted/20">
            Noch keine Einträge. Sobald jemand via{" "}
            <code className="font-mono">/api/newsletter/signup</code> oder eine
            Umfrage einwilligt, erscheint hier eine Zeile.
          </div>
        ) : (
          <div className="border border-border rounded-md bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "60px" }} />
                <col style={{ width: "240px" }} />
                <col style={{ width: "130px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "220px" }} />
                <col style={{ width: "110px" }} />
              </colgroup>
              <thead className="bg-muted/70 border-b-2 border-border">
                <tr>
                  <th className="px-3 h-10 text-left text-[10px] uppercase tracking-[0.12em] font-semibold text-foreground/85">
                    Aktiv
                  </th>
                  <th className="px-3 h-10 text-left text-[10px] uppercase tracking-[0.12em] font-semibold text-foreground/85 border-l border-border">
                    E-Mail
                  </th>
                  <th className="px-3 h-10 text-left text-[10px] uppercase tracking-[0.12em] font-semibold text-foreground/85 border-l border-border">
                    Art
                  </th>
                  <th className="px-3 h-10 text-left text-[10px] uppercase tracking-[0.12em] font-semibold text-foreground/85 border-l border-border">
                    Rechtsgrundlage
                  </th>
                  <th className="px-3 h-10 text-left text-[10px] uppercase tracking-[0.12em] font-semibold text-foreground/85 border-l border-border">
                    Quelle
                  </th>
                  <th className="px-3 h-10 text-right text-[10px] uppercase tracking-[0.12em] font-semibold text-foreground/85 border-l border-border">
                    Zeitpunkt
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-b border-border/70 hover:bg-sky-500/[0.06] ${
                      i % 2 === 1 ? "bg-muted/30" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-center">
                      {r.revokedAt ? (
                        <X className="size-4 text-destructive inline" />
                      ) : (
                        <Check className="size-4 text-emerald-500 inline drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                      )}
                    </td>
                    <td className="px-3 py-2 truncate border-l border-border/70 text-foreground">
                      {r.email}
                    </td>
                    <td className="px-3 py-2 border-l border-border/70 text-xs">
                      {KIND_LABEL[r.kind] ?? r.kind}
                    </td>
                    <td className="px-3 py-2 border-l border-border/70">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] uppercase tracking-wider font-semibold border ${
                          BASIS_TONE[r.legalBasis] ?? BASIS_TONE.manual
                        }`}
                      >
                        {r.legalBasis}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-l border-border/70 text-xs text-muted-foreground truncate font-mono">
                      {r.source}
                    </td>
                    <td className="px-3 py-2 border-l border-border/70 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                      {formatDate(r.revokedAt ?? r.acceptedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-10 border-t border-border pt-4 text-[11px] text-muted-foreground space-y-1">
        <p>
          Jede Massensendung wird gegen diesen Ledger geprüft: Empfänger ohne
          aktiven Eintrag werden ausgeschlossen.
        </p>
        <p>
          Unsubscribe-Link in jeder Mail:{" "}
          <code className="font-mono">/api/unsubscribe?token=…</code> (HMAC-signiert).
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "sky" | "emerald" | "violet" | "amber" | "muted";
}) {
  const map = {
    sky: { bar: "bg-sky-500", ring: "ring-sky-500/10", text: "text-sky-700 dark:text-sky-400" },
    emerald: { bar: "bg-emerald-500", ring: "ring-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400" },
    violet: { bar: "bg-violet-500", ring: "ring-violet-500/10", text: "text-violet-700 dark:text-violet-400" },
    amber: { bar: "bg-amber-500", ring: "ring-amber-500/10", text: "text-amber-700 dark:text-amber-400" },
    muted: { bar: "bg-muted-foreground/30", ring: "", text: "text-foreground" },
  } as const;
  const a = map[accent];
  return (
    <div className={`relative border border-border rounded-md p-4 bg-card shadow-sm ring-1 ${a.ring}`}>
      <div className={`absolute top-0 left-0 h-full w-0.5 ${a.bar} rounded-l-md`} />
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1 font-semibold">
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums leading-none ${a.text}`}>
        {value}
      </div>
    </div>
  );
}
