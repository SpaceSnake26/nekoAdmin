import { AlertTriangle } from "lucide-react";

import { EMAIL_TEMPLATES } from "@/lib/email-templates";
import { countNewsletterSignups } from "@/server/queries/newsletter";
import { getLeadStats } from "@/server/queries/leads";
import { TemplateCard } from "@/components/mailing/template-card";

export const dynamic = "force-dynamic";

export default async function MailingPage() {
  const [stats, newsletterCount] = await Promise.all([
    getLeadStats(),
    countNewsletterSignups(),
  ]);

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      <div className="border-b border-border pb-4 mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
          Beschaffung · Lane C
        </div>
        <h1 className="text-2xl font-medium tracking-tight">Mailing</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {EMAIL_TEMPLATES.length} Vorlagen · {stats.total} Leads ·{" "}
          {newsletterCount} Newsletter-Anmeldung
          {newsletterCount === 1 ? "" : "en"}
        </p>
      </div>

      <div className="border border-amber-500/40 bg-amber-500/10 rounded-md p-4 mb-10 flex gap-3 text-sm text-amber-800 dark:text-amber-200">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">
            Lane C: persönliche 1:1-Mails &mdash; nicht für Massenversand.
          </p>
          <p className="text-amber-700 dark:text-amber-300/90">
            Schweizer UWG Art. 3(1)(o) verbietet Massenwerbe-E-Mails ohne
            Opt-In. Diese Vorlagen sind als Ausgangspunkt für individuell
            angepasste Mails an einzelne Apotheken gedacht &mdash; ein Mensch
            schreibt an einen Menschen. Massenversand erfolgt ausschliesslich
            über <strong>/newsletter</strong> an Opt-In-Empfänger im
            Consent-Ledger.
          </p>
        </div>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5 border-t border-border pt-5 mb-12">
        <Stat label="Vorlagen" value={EMAIL_TEMPLATES.length} sub="bereit" />
        <Stat
          label="Empfänger"
          value={stats.total}
          sub="Apotheken in CRM"
        />
        <Stat
          label="Kontaktiert"
          value={stats.byStatus.CONTACTED + stats.byStatus.REPLIED}
          sub="bereits angeschrieben"
        />
        <Stat
          label="Newsletter"
          value={newsletterCount}
          sub="Anmeldung(en)"
        />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-border">
          <h2 className="text-sm font-medium tracking-tight text-foreground/90">
            E-Mail-Vorlagen
          </h2>
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
            {EMAIL_TEMPLATES.length}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-6">
          Platzhalter:{" "}
          <code className="font-mono">{`{{pharmacy_name}}`}</code>,{" "}
          <code className="font-mono">{`{{contact_name}}`}</code>,{" "}
          <code className="font-mono">{`{{city}}`}</code>,{" "}
          <code className="font-mono">{`{{survey_link}}`}</code>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {EMAIL_TEMPLATES.map((t) => (
            <TemplateCard
              key={t.id}
              name={t.name}
              subject={t.subject}
              body={t.body}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className="text-2xl font-medium tabular-nums leading-none text-foreground">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 font-mono tabular-nums">
        {sub}
      </div>
    </div>
  );
}
