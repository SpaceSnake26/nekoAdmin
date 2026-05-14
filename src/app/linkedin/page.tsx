import Link from "next/link";
import { AlertTriangle, Handshake, MessageSquare, Pause, Play, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { getLinkedInProvider } from "@/lib/linkedin-provider";

export const dynamic = "force-dynamic";

export default async function LinkedInPage() {
  const provider = getLinkedInProvider();
  const [health, conversations] = await Promise.all([
    provider.health(),
    provider.listConversations(40),
  ]);

  const invitePct = health.dailyCaps.invites
    ? Math.min(100, Math.round((health.todayInvites / health.dailyCaps.invites) * 100))
    : 0;
  const dmPct = health.dailyCaps.dms
    ? Math.min(100, Math.round((health.todayDms / health.dailyCaps.dms) * 100))
    : 0;

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      <section className="grid grid-cols-12 gap-8 mb-10">
        <div className="col-span-12 lg:col-span-8">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3 flex items-center gap-2">
            <Handshake className="size-3.5 text-sky-500" />
            Beschaffung · LinkedIn · Lane B
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-3 text-foreground">
            {health.configured && health.reachable ? (
              health.paused ? (
                <span className="text-amber-600 dark:text-amber-400">
                  OpenOutreach pausiert.
                </span>
              ) : (
                <>
                  Heute:{" "}
                  <span className="text-sky-600 dark:text-sky-400">
                    {health.todayInvites}
                  </span>{" "}
                  Einladungen ·{" "}
                  <span className="text-violet-600 dark:text-violet-400">
                    {health.todayDms}
                  </span>{" "}
                  DMs
                </>
              )
            ) : (
              <span className="text-muted-foreground">
                OpenOutreach nicht verbunden.
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground max-w-[60ch] leading-relaxed">
            1:1 LinkedIn-Outreach via Sales Navigator. Schweizer Rechtsrahmen:
            keine Massensendung &mdash; nur direkte, personalisierte
            Nachrichten an einzelne Profile.
          </p>
        </div>
        <aside className="col-span-12 lg:col-span-4 flex flex-col items-end gap-2">
          <Badge
            variant="secondary"
            className={`gap-1 ${
              health.paused
                ? "bg-amber-500/15 text-amber-700 border-amber-500/40"
                : health.configured && health.reachable
                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {health.paused ? (
              <Pause className="size-3" />
            ) : (
              <Play className="size-3" />
            )}
            {health.paused
              ? "pausiert"
              : health.configured
                ? "aktiv"
                : "offline"}
          </Badge>
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono">
            {health.workingHours.start}–{health.workingHours.end}
          </span>
        </aside>
      </section>

      {!health.configured ? <SetupHint /> : null}
      {health.lastWarningAt ? (
        <div className="border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm rounded-md p-4 mb-10 flex gap-3">
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
          <div>
            <strong>LinkedIn-Warnung</strong> registriert am{" "}
            {formatDate(health.lastWarningAt)}. OpenOutreach pausiert
            automatisch für 24 h.
          </div>
        </div>
      ) : null}

      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        <CapCard
          label="Einladungen"
          today={health.todayInvites}
          cap={health.dailyCaps.invites}
          pct={invitePct}
          accent="sky"
        />
        <CapCard
          label="DMs"
          today={health.todayDms}
          cap={health.dailyCaps.dms}
          pct={dmPct}
          accent="violet"
        />
        <CapCard
          label="Profile-Views"
          today={health.todayProfileViews}
          cap={health.dailyCaps.profileViews}
          pct={
            health.dailyCaps.profileViews
              ? Math.min(
                  100,
                  Math.round(
                    (health.todayProfileViews / health.dailyCaps.profileViews) *
                      100,
                  ),
                )
              : 0
          }
          accent="amber"
        />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-border">
          <h2 className="text-sm font-medium tracking-tight text-foreground/90 flex items-center gap-2">
            <MessageSquare className="size-3.5 text-sky-500" />
            Konversationen
          </h2>
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
            {conversations.length}
          </span>
        </div>
        {conversations.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md bg-muted/20">
            Noch keine Konversationen. OpenOutreach schreibt Events an{" "}
            <code className="font-mono">/api/linkedin/event</code>.
          </div>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-md bg-card shadow-sm">
            {conversations.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <span
                  className={`text-[10px] uppercase tracking-wider font-medium w-20 shrink-0 ${
                    c.status === "replied"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : c.status === "accepted"
                        ? "text-sky-600 dark:text-sky-400"
                        : c.status === "ignored"
                          ? "text-destructive"
                          : "text-muted-foreground"
                  }`}
                >
                  {c.status}
                </span>
                {c.leadId ? (
                  <Link
                    href={`/leads/${c.leadId}`}
                    className="flex-1 min-w-0 truncate text-foreground hover:text-sky-500 hover:underline"
                  >
                    {c.recipientName}
                  </Link>
                ) : (
                  <span className="flex-1 min-w-0 truncate text-foreground">
                    {c.recipientName}
                  </span>
                )}
                <span className="text-xs text-muted-foreground shrink-0 truncate max-w-[28ch]">
                  {c.lastMessage ?? "—"}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums shrink-0 w-20 text-right">
                  {formatDate(c.lastEventAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 text-[11px] text-muted-foreground border-t border-border pt-4 flex items-start gap-2">
        <AlertTriangle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
        <p>
          OpenOutreach automatisiert Sales Navigator als angemeldeter Benutzer
          und verstösst damit gegen LinkedIn ToS §8.2. Niedrige Tageslimits,
          Arbeitszeit-Fenster und 24 h-Auto-Pause bei Warnungen reduzieren das
          Risiko &mdash; eliminieren es aber nicht. Backup: Lane C (manuelle
          1:1-Mails).
        </p>
      </div>
    </div>
  );
}

function CapCard({
  label,
  today,
  cap,
  pct,
  accent,
}: {
  label: string;
  today: number;
  cap: number;
  pct: number;
  accent: "sky" | "violet" | "amber";
}) {
  const accentMap = {
    sky: { bar: "bg-sky-500", ring: "ring-sky-500/10", text: "text-sky-600 dark:text-sky-400" },
    violet: { bar: "bg-violet-500", ring: "ring-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
    amber: { bar: "bg-amber-500", ring: "ring-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  } as const;
  const a = accentMap[accent];
  return (
    <div className={`relative border border-border rounded-md p-4 bg-card shadow-sm ring-1 ${a.ring} overflow-hidden`}>
      <div className={`absolute top-0 left-0 h-full w-0.5 ${a.bar}`} />
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1 font-semibold">
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums leading-none ${a.text}`}>
        {today}
        <span className="text-muted-foreground text-base font-normal"> / {cap}</span>
      </div>
      <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${a.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 font-mono tabular-nums">
        {pct}% Tageslimit
      </div>
    </div>
  );
}

function SetupHint() {
  return (
    <div className="border border-border rounded-md p-5 mb-10 bg-muted/30">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2 font-medium">
        OpenOutreach verbinden
      </div>
      <ol className="text-sm text-foreground/90 leading-relaxed space-y-2 list-decimal list-inside">
        <li>
          OpenOutreach auf dem VPS deployen (
          <a
            href="https://github.com/eracle/OpenOutreach"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            github.com/eracle/OpenOutreach
          </a>
          ). In Niklas&apos; LinkedIn-Account (mit Sales-Nav-Abo) einloggen.
        </li>
        <li>
          Schreibrechte auf{" "}
          <code className="font-mono text-xs">db.sqlite3</code> + Read-only-Mount
          in unseren VPS unter{" "}
          <code className="font-mono text-xs">OPENOUTREACH_DB_PATH</code>.
        </li>
        <li>
          Webhook-Skript in OpenOutreach: POST{" "}
          <code className="font-mono text-xs">
            {`{NEXT_PUBLIC_APP_URL}/api/linkedin/event?secret=…`}
          </code>{" "}
          bei jedem Event.
        </li>
        <li>
          Variablen in <code className="font-mono">.env.local</code>:
          <pre className="text-xs font-mono bg-background border border-border rounded-sm mt-2 p-2 leading-relaxed">
            {`LINKEDIN_PROVIDER=openoutreach
OPENOUTREACH_DB_PATH=/srv/openoutreach/db.sqlite3
LINKEDIN_EVENT_SECRET=<64 random chars>
OPENOUTREACH_DAILY_INVITES_CAP=25
OPENOUTREACH_DAILY_DMS_CAP=10
OPENOUTREACH_DAILY_PROFILE_VIEWS_CAP=40
OPENOUTREACH_WORKING_HOURS=09:00-17:00`}
          </pre>
        </li>
      </ol>
    </div>
  );
}
