import { asc, desc, eq, sql } from "drizzle-orm";

import { AreasEditor } from "@/components/settings/areas-editor";
import { ThemeSegmented } from "@/components/theme-toggle";
import { db, schema } from "@/server/db";
import { formatDate, formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [recentSyncs, areas] = await Promise.all([
    db
      .select()
      .from(schema.syncRuns)
      .orderBy(desc(schema.syncRuns.startedAt))
      .limit(10),
    db
      .select({
        code: schema.areas.code,
        label: schema.areas.label,
        color: schema.areas.color,
        description: schema.areas.description,
        senderPatterns: schema.areas.senderPatterns,
        isHidden: schema.areas.isHidden,
        sortOrder: schema.areas.sortOrder,
        letterCount: sql<number>`(select count(*) from letters where letters.area = areas.code)`,
      })
      .from(schema.areas)
      .orderBy(asc(schema.areas.sortOrder)),
  ]);

  const hasKey = Boolean(process.env.EPOST_API_KEY);
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="px-8 py-10 max-w-3xl mx-auto space-y-12">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
          Konfiguration
        </div>
        <h1 className="text-2xl font-medium tracking-tight">Einstellungen</h1>
      </header>

      <Section label="Erscheinungsbild">
        <Row
          title="Farb-Modus"
          description="Wähle Hell, Dunkel oder folge dem System."
        >
          <ThemeSegmented />
        </Row>
      </Section>

      <section>
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 mb-3 font-medium">
          Bereiche (Klassifikation)
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Bereiche ordnen Briefe einem Business-Feld zu (BVG, AHV, Steuern…). Die Sender-Patterns
          werden Claude bei jeder Extraktion mitgegeben — neue oder umbenannte Bereiche wirken sofort.
          Versteckte Bereiche tauchen nicht in den Filtern auf, bleiben aber an bestehenden Briefen.
        </p>
        <AreasEditor areas={areas} />
      </section>

      <Section label="Schnittstellen">
        <Row title="ePost Public API" description={process.env.EPOST_BASE_URL ?? "—"}>
          <StatusPill ok={hasKey} okLabel="Verbunden" failLabel="Kein Key" />
        </Row>
        <Row title="Anthropic API" description="Für Extraktion und Klassifikation">
          <StatusPill ok={hasAnthropic} okLabel="Verbunden" failLabel="Kein Key" />
        </Row>
        <Row title="Standard-Modell" description={process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6"}>
          <span className="text-xs font-mono text-muted-foreground">Sonnet</span>
        </Row>
        <Row
          title="Fallback-Modell"
          description={process.env.ANTHROPIC_FALLBACK_MODEL ?? "claude-opus-4-7"}
        >
          <span className="text-xs font-mono text-muted-foreground">
            Bei Confidence &lt; 70 %
          </span>
        </Row>
      </Section>

      <Section label="Sync-Verlauf">
        {recentSyncs.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
            Noch kein Sync durchgeführt.
          </div>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-md overflow-hidden">
            {recentSyncs.map((s) => (
              <li
                key={s.id}
                className="px-4 py-3 flex items-center justify-between gap-4 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-mono text-xs text-foreground/90 tabular-nums">
                    {formatDate(s.startedAt)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatRelative(s.startedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-mono tabular-nums text-muted-foreground">
                  <span>
                    <span className="text-foreground font-semibold">
                      {s.newLetters}
                    </span>{" "}
                    neu
                  </span>
                  <span>
                    <span className="text-foreground font-semibold">
                      {s.extractedLetters}
                    </span>{" "}
                    extrahiert
                  </span>
                  {s.failedLetters > 0 ? (
                    <span className="text-destructive">
                      {s.failedLetters} Fehler
                    </span>
                  ) : null}
                </div>
                <StatusPill
                  ok={s.status === "success"}
                  okLabel="OK"
                  failLabel={s.status === "running" ? "läuft" : "Fehler"}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 mb-3 font-medium">
        {label}
      </div>
      <div className="space-y-0 divide-y divide-border border border-border rounded-md bg-card">
        {children}
      </div>
    </section>
  );
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-4 flex items-center justify-between gap-6">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {description ? (
          <div className="text-[12px] text-muted-foreground mt-0.5 truncate">
            {description}
          </div>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function StatusPill({
  ok,
  okLabel,
  failLabel,
}: {
  ok: boolean;
  okLabel: string;
  failLabel: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] ${
        ok ? "text-primary" : "text-destructive"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${ok ? "bg-primary" : "bg-destructive"}`}
      />
      {ok ? okLabel : failLabel}
    </span>
  );
}
