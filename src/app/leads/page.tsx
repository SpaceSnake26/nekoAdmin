import { LEAD_STATUS_LABELS, LEAD_STATUS_TONE } from "@/lib/lead-format";
import { getLeadStats, listLeads } from "@/server/queries/leads";
import { LEAD_STATUSES, type LeadStatus } from "@/server/db/schema";
import { AddLeadDialog } from "@/components/leads/add-lead-dialog";
import { ScanButton } from "@/components/leads/scan-button";
import { ExportCsvLink } from "@/components/leads/export-csv-link";
import { LeadsFilterBar } from "@/components/leads/leads-filter-bar";
import { LeadsTable } from "@/components/leads/leads-table";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    hasWebshop?: string;
    hasAiChatbot?: string;
    minScore?: string;
  }>;
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = sp.status && sp.status !== "all" ? (sp.status as LeadStatus) : null;
  const hasWebshop =
    sp.hasWebshop && sp.hasWebshop !== "all" ? sp.hasWebshop === "true" : null;
  const hasAiChatbot =
    sp.hasAiChatbot && sp.hasAiChatbot !== "all"
      ? sp.hasAiChatbot === "true"
      : null;
  const minScore = sp.minScore ? Number(sp.minScore) : null;
  const q = sp.q ?? null;

  const [stats, rows] = await Promise.all([
    getLeadStats(),
    listLeads({ q, status, hasWebshop, hasAiChatbot, minScore }),
  ]);

  const webshopPct =
    stats.total > 0 ? Math.round((stats.withWebshop / stats.total) * 100) : 0;

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      <section className="grid grid-cols-12 gap-8 mb-12">
        <div className="col-span-12 lg:col-span-8">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Beschaffung · Leads
          </div>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tighter leading-[1.05] mb-4 text-foreground">
            {stats.total === 0 ? (
              <>Noch keine Leads.</>
            ) : (
              <>
                <span className="text-foreground">{stats.total}</span>{" "}
                <span className="text-muted-foreground">
                  Apotheke{stats.total === 1 ? "" : "n"} im Pipeline.
                </span>
              </>
            )}
          </h1>
          <p className="text-sm text-muted-foreground max-w-[58ch] leading-relaxed">
            Pharmacy-CRM für die Schweizer Digitalagentur-Akquise. Scannen Sie
            Google Maps und local.ch oder legen Sie Leads manuell an.
          </p>
        </div>
        <aside className="col-span-12 lg:col-span-4 flex flex-col justify-end gap-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ScanButton />
            <ExportCsvLink />
            <AddLeadDialog />
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Stat
          label="Total"
          value={stats.total}
          sub="Apotheken"
          accent="sky"
        />
        <Stat
          label="Webshop"
          value={`${stats.withWebshop} / ${stats.total}`}
          sub={`${webshopPct}% Adoption`}
          accent="emerald"
        />
        <Stat
          label="KI-Chatbots"
          value={stats.withChatbot}
          sub="aktiv"
          accent="violet"
        />
        <Stat
          label="High Quality"
          value={stats.highQuality}
          sub="Score ≥ 8"
          accent={stats.highQuality > 0 ? "amber" : "muted"}
        />
      </section>

      <section className="grid grid-cols-12 gap-6 mb-10">
        <div className="col-span-12 lg:col-span-8 border border-border rounded-md p-4 bg-card shadow-sm">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-3 font-semibold">
            Filter
          </div>
          <LeadsFilterBar />
        </div>
        <aside className="col-span-12 lg:col-span-4 border border-border rounded-md p-4 bg-card shadow-sm">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-3 font-semibold">
            Pipeline
          </div>
          <ul className="space-y-2">
            {LEAD_STATUSES.map((s) => {
              const tone = LEAD_STATUS_TONE[s];
              const dot =
                tone === "warn"
                  ? "bg-amber-500"
                  : tone === "success"
                    ? "bg-emerald-500"
                    : tone === "muted"
                      ? "bg-muted-foreground/40"
                      : "bg-sky-500";
              return (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span className={`size-2 rounded-full ${dot}`} />
                  <span className="flex-1 text-foreground/90">
                    {LEAD_STATUS_LABELS[s]}
                  </span>
                  <span className="font-mono tabular-nums text-foreground font-semibold">
                    {stats.byStatus[s]}
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-border">
          <h2 className="text-sm font-medium tracking-tight text-foreground/90">
            Alle Leads
          </h2>
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
            {rows.length}
            {rows.length !== stats.total ? ` / ${stats.total}` : ""}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md bg-muted/20">
            {stats.total === 0
              ? "Noch keine Leads. Starten Sie oben einen Scan."
              : "Keine Treffer für die gewählten Filter."}
          </div>
        ) : (
          <LeadsTable rows={rows} />
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent = "muted",
}: {
  label: string;
  value: number | string;
  sub: string;
  accent?: "sky" | "emerald" | "violet" | "amber" | "muted";
}) {
  const accentMap: Record<typeof accent, { bar: string; ring: string; text: string }> = {
    sky: { bar: "bg-sky-500", ring: "ring-sky-500/10", text: "text-sky-700 dark:text-sky-400" },
    emerald: { bar: "bg-emerald-500", ring: "ring-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400" },
    violet: { bar: "bg-violet-500", ring: "ring-violet-500/10", text: "text-violet-700 dark:text-violet-400" },
    amber: { bar: "bg-amber-500", ring: "ring-amber-500/10", text: "text-amber-700 dark:text-amber-400" },
    muted: { bar: "bg-muted-foreground/30", ring: "", text: "text-foreground" },
  } as const;
  const a = accentMap[accent];
  return (
    <div className={`relative border border-border rounded-md p-4 bg-card shadow-sm ring-1 ${a.ring}`}>
      <div className={`absolute top-0 left-0 h-full w-0.5 ${a.bar} rounded-l-md`} />
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1 font-semibold">
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums leading-none ${a.text}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1.5 font-mono tabular-nums">
        {sub}
      </div>
    </div>
  );
}

