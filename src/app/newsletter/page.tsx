import { ExternalLink } from "lucide-react";

import { formatDate } from "@/lib/format";
import { getEmailProvider } from "@/lib/email-provider";
import {
  getEmailEventStats,
  recentEmailEvents,
} from "@/server/queries/email-events";
import { listNewsletterSignups } from "@/server/queries/newsletter";
import { EmailProviderSyncButton } from "@/components/newsletter/email-provider-sync-button";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  send: "Versand",
  open: "Geöffnet",
  click: "Klick",
  bounce: "Bounce",
  unsubscribe: "Abgemeldet",
};

const EVENT_TONES: Record<string, string> = {
  send: "text-muted-foreground",
  open: "text-foreground",
  click: "text-primary",
  bounce: "text-destructive",
  unsubscribe: "text-warning",
};

export default async function NewsletterPage() {
  const provider = getEmailProvider();
  const [email, eventStats, recentEvents, signups] = await Promise.all([
    provider.checkConnection(),
    getEmailEventStats(),
    recentEmailEvents(20),
    listNewsletterSignups(),
  ]);
  const providerLabel =
    provider.name === "listmonk"
      ? "Listmonk"
      : provider.name === "mautic"
        ? "Mautic"
        : "Provider";

  const openRate =
    eventStats.sends > 0
      ? Math.round((eventStats.opens / eventStats.sends) * 100)
      : 0;
  const clickRate =
    eventStats.sends > 0
      ? Math.round((eventStats.clicks / eventStats.sends) * 100)
      : 0;

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      <section className="grid grid-cols-12 gap-8 mb-12">
        <div className="col-span-12 lg:col-span-8">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Beschaffung · Newsletter
          </div>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tighter leading-[1.05] mb-4 text-foreground">
            {email.configured ? (
              email.reachable ? (
                <>
                  <span className="text-foreground">
                    {email.contactCount ?? 0}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    Kontakt{email.contactCount === 1 ? "" : "e"} in {providerLabel}.
                  </span>
                </>
              ) : (
                <>
                  <span className="text-destructive">{providerLabel}</span>{" "}
                  <span className="text-muted-foreground">
                    nicht erreichbar.
                  </span>
                </>
              )
            ) : (
              <>
                <span className="text-muted-foreground">{providerLabel}</span>{" "}
                noch nicht verbunden.
              </>
            )}
          </h1>
          <p className="text-sm text-muted-foreground max-w-[60ch] leading-relaxed">
            {email.configured
              ? `Verbunden mit ${email.baseUrl}. Klicks, Öffnungen und Abmeldungen werden über den Webhook live in das CRM gespiegelt.`
              : provider.name === "listmonk"
                ? "Setzen Sie LISTMONK_BASE_URL, LISTMONK_USERNAME und LISTMONK_PASSWORD in der .env.local, um Newsletter, Klick-Tracking und Lead-Sync zu aktivieren."
                : "Setzen Sie MAUTIC_BASE_URL, MAUTIC_USERNAME und MAUTIC_PASSWORD in der .env.local."}
          </p>
        </div>
        <aside className="col-span-12 lg:col-span-4 flex flex-col justify-end gap-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {email.configured && email.reachable ? (
              <a
                href={email.baseUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {providerLabel} öffnen
                <ExternalLink className="size-3" />
              </a>
            ) : null}
            <EmailProviderSyncButton
              providerLabel={providerLabel}
              disabled={!email.configured || !email.reachable}
            />
          </div>
        </aside>
      </section>

      {!email.configured ? (
        <SetupHint providerName={provider.name} />
      ) : !email.reachable ? (
        <div className="border border-destructive/30 bg-destructive/10 text-destructive text-sm rounded-md p-4 mb-12 font-mono break-all">
          {email.error ?? `Unbekannter Fehler beim Erreichen von ${providerLabel}.`}
        </div>
      ) : null}

      <section className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-5 border-t border-border pt-5 mb-12">
        <Stat label="Versendet" value={eventStats.sends} sub="Mails" />
        <Stat
          label="Öffnungen"
          value={eventStats.opens}
          sub={`${openRate}% Rate`}
        />
        <Stat
          label="Klicks"
          value={eventStats.clicks}
          sub={`${clickRate}% CTR`}
          tone={eventStats.clicks > 0 ? "accent" : "default"}
        />
        <Stat label="Bounces" value={eventStats.bounces} sub="hart/soft" />
        <Stat
          label="Abgemeldet"
          value={eventStats.unsubscribes}
          sub="DNC"
        />
      </section>

      <div className="grid grid-cols-12 gap-8">
        <section className="col-span-12 lg:col-span-8">
          <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-border">
            <h2 className="text-sm font-medium tracking-tight text-foreground/90">
              Letzte Ereignisse ({providerLabel} Webhook)
            </h2>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {recentEvents.length}
            </span>
          </div>
          {recentEvents.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Noch keine Ereignisse empfangen. Konfigurieren Sie in{" "}
              {providerLabel} einen Webhook auf{" "}
              <code className="font-mono">
                /api/{provider.name}/webhook?secret=…
              </code>
              .
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-4 py-3 text-sm"
                >
                  <span
                    className={`text-[10px] uppercase tracking-wider font-medium w-20 shrink-0 ${EVENT_TONES[e.eventType] ?? "text-muted-foreground"}`}
                  >
                    {EVENT_LABELS[e.eventType] ?? e.eventType}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-foreground">
                    {e.email}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 truncate max-w-[24ch]">
                    {e.emailName ?? e.campaignName ?? "—"}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums shrink-0 w-20 text-right">
                    {formatDate(e.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="col-span-12 lg:col-span-4">
          <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-border">
            <h2 className="text-sm font-medium tracking-tight text-foreground/90">
              Newsletter-Anmeldungen
            </h2>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {signups.length}
            </span>
          </div>
          {signups.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Noch keine direkten Anmeldungen.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {signups.slice(0, 10).map((s) => (
                <li key={s.id} className="py-2.5 text-sm">
                  <div className="text-foreground truncate">{s.email}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span className="font-mono tabular-nums">
                      {formatDate(s.createdAt)}
                    </span>
                    {s.pharmacyName ? (
                      <>
                        <span>·</span>
                        <span className="truncate">{s.pharmacyName}</span>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: number | string;
  sub: string;
  tone?: "default" | "accent";
}) {
  const color = tone === "accent" ? "text-primary" : "text-foreground";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className={`text-2xl font-medium tabular-nums leading-none ${color}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 font-mono tabular-nums">
        {sub}
      </div>
    </div>
  );
}

function SetupHint({ providerName }: { providerName: string }) {
  if (providerName === "listmonk") {
    return (
      <div className="border border-border rounded-md p-5 mb-12 bg-muted/30">
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2 font-medium">
          Listmonk verbinden
        </div>
        <ol className="text-sm text-foreground/90 leading-relaxed space-y-2 list-decimal list-inside">
          <li>
            Listmonk auf dem VPS deployen (`docker compose up` aus dem{" "}
            <a
              href="https://github.com/knadh/listmonk"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              offiziellen Compose-File
            </a>
            ). Postgres läuft mit.
          </li>
          <li>Admin-User anlegen, eine Subscribers-Liste anlegen (List-ID notieren).</li>
          <li>
            Variablen in <code className="font-mono">.env.local</code>:
            <pre className="text-xs font-mono bg-background border border-border rounded-sm mt-2 p-2 leading-relaxed">
              {`EMAIL_PROVIDER=listmonk
LISTMONK_BASE_URL=https://newsletter.nekosys.ch
LISTMONK_USERNAME=api
LISTMONK_PASSWORD=••••
LISTMONK_DEFAULT_LIST_ID=1
LISTMONK_WEBHOOK_SECRET=<64 random chars>`}
            </pre>
          </li>
          <li>
            In Listmonk → Settings → Bounces &amp; Webhooks einen POST-Hook auf{" "}
            <code className="font-mono text-xs">
              {`{NEXT_PUBLIC_APP_URL}/api/listmonk/webhook?secret=…`}
            </code>{" "}
            anlegen für subscriber.opened, subscriber.clicked,
            subscriber.bounced, subscriber.unsub, campaign.sent.
          </li>
        </ol>
        <p className="text-xs text-muted-foreground mt-4">
          Vollständige Strategie:{" "}
          <code className="font-mono">docs/MARKETING-STRATEGY.md</code>
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-md p-5 mb-12 bg-muted/30">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2 font-medium">
        Mautic verbinden (Legacy)
      </div>
      <ol className="text-sm text-foreground/90 leading-relaxed space-y-2 list-decimal list-inside">
        <li>
          Mautic selbst hosten (Docker:{" "}
          <code className="font-mono text-xs">mautic/mautic</code>).
        </li>
        <li>
          API-Zugang aktivieren: Einstellungen → Konfiguration → API → „API
          aktivieren" und „HTTP Basic Auth zulassen". Einen Service-Benutzer
          anlegen.
        </li>
        <li>
          Variablen in <code className="font-mono">.env.local</code>:
          <pre className="text-xs font-mono bg-background border border-border rounded-sm mt-2 p-2 leading-relaxed">
            {`EMAIL_PROVIDER=mautic
MAUTIC_BASE_URL=https://mautic.nekosys.ch
MAUTIC_USERNAME=api-bot
MAUTIC_PASSWORD=••••••
MAUTIC_WEBHOOK_SECRET=<64 random chars>`}
          </pre>
        </li>
        <li>
          In Mautic einen Webhook anlegen, der auf{" "}
          <code className="font-mono text-xs">
            {`{NEXT_PUBLIC_APP_URL}/api/mautic/webhook?secret=…`}
          </code>{" "}
          postet.
        </li>
      </ol>
      <p className="text-xs text-muted-foreground mt-4">
        Strategie + Empfehlungen:{" "}
        <code className="font-mono">docs/MARKETING-STRATEGY.md</code>
      </p>
    </div>
  );
}
