import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Cpu, FileText, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { LEAD_STATUS_LABELS } from "@/lib/lead-format";
import { getLead } from "@/server/queries/leads";
import { LEAD_STATUSES, type LeadStatus } from "@/server/db/schema";
import {
  EditableBool,
  EditableNotes,
  EditableSelect,
  EditableText,
} from "@/components/leads/editable";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<LeadStatus, "sky" | "amber" | "emerald" | "muted"> = {
  NEW: "sky",
  CONTACTED: "amber",
  REPLIED: "amber",
  QUALIFIED: "emerald",
  WON: "emerald",
  LOST: "muted",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  return (
    <div className="px-8 py-10 max-w-[1100px] mx-auto">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-sky-500 transition-colors mb-6"
      >
        <ArrowLeft className="size-3.5" />
        Zurück zu Leads
      </Link>

      {/* Hero card */}
      <section className="relative overflow-hidden rounded-lg border border-border bg-card shadow-md mb-10">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-violet-500 to-emerald-500" />
        <div className="p-6 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400 mb-3 font-semibold">
              <Sparkles className="size-3" />
              Lead · {lead.source ?? "manuell"}
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-2">
              <EditableText
                leadId={lead.id}
                field="pharmacyName"
                initial={lead.pharmacyName}
                placeholder="Apothekenname"
              />
            </h1>
            <div className="text-sm text-muted-foreground flex items-center gap-3">
              <div className="min-w-0 flex-1 max-w-[16rem]">
                <EditableText
                  leadId={lead.id}
                  field="city"
                  initial={lead.city}
                  placeholder="Ort"
                />
              </div>
              <span>·</span>
              <span>erfasst {formatDate(lead.createdAt)}</span>
              {lead.lastScanned ? (
                <>
                  <span>·</span>
                  <span>Scan {formatDate(lead.lastScanned)}</span>
                </>
              ) : null}
            </div>
          </div>
          <aside className="col-span-12 lg:col-span-4 flex flex-col items-start lg:items-end gap-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
              Status
            </div>
            <EditableSelect
              leadId={lead.id}
              field="status"
              initial={lead.status}
              glow
              options={LEAD_STATUSES.map((s) => ({
                value: s,
                label: LEAD_STATUS_LABELS[s],
                tone: STATUS_TONE[s],
              }))}
            />
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mt-3">
              Score
            </div>
            <div className="text-2xl font-semibold tabular-nums text-amber-600 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
              {lead.overallScore != null ? lead.overallScore.toFixed(2) : "—"}
            </div>
          </aside>
        </div>
        {lead.tags.length > 0 ? (
          <div className="px-6 pb-5 flex flex-wrap gap-1.5">
            {lead.tags.map((t) => (
              <Badge
                key={t}
                variant="secondary"
                className="text-[10px] font-normal"
              >
                {t}
              </Badge>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-12 gap-6">
        {/* Kontakt */}
        <Section
          title="Kontakt"
          icon={<Building2 className="size-3.5" />}
          accent="sky"
          className="col-span-12 lg:col-span-6"
        >
          <FieldRow label="Ansprechpartner">
            <EditableText
              leadId={lead.id}
              field="contactName"
              initial={lead.contactName}
              placeholder="Ansprechpartner hinzufügen"
            />
          </FieldRow>
          <FieldRow label="E-Mail">
            <EditableText
              leadId={lead.id}
              field="email"
              initial={lead.email}
              type="email"
              placeholder="email@apotheke.ch"
              link
            />
          </FieldRow>
          <FieldRow label="Telefon">
            <EditableText
              leadId={lead.id}
              field="phone"
              initial={lead.phone}
              type="tel"
              placeholder="+41 …"
              mono
            />
          </FieldRow>
          <FieldRow label="Website">
            <EditableText
              leadId={lead.id}
              field="websiteUrl"
              initial={lead.websiteUrl}
              type="url"
              placeholder="https://"
              link
            />
          </FieldRow>
        </Section>

        {/* Digital */}
        <Section
          title="Digital"
          icon={<Cpu className="size-3.5" />}
          accent="violet"
          className="col-span-12 lg:col-span-6"
        >
          <FieldRow label="Webshop">
            <EditableBool
              leadId={lead.id}
              field="hasWebshop"
              initial={lead.hasWebshop}
            />
          </FieldRow>
          <FieldRow label="Shop-URL">
            <EditableText
              leadId={lead.id}
              field="shopUrl"
              initial={lead.shopUrl}
              type="url"
              placeholder="https://shop…"
              link
            />
          </FieldRow>
          <FieldRow label="KI-Produkte">
            <EditableBool
              leadId={lead.id}
              field="hasAiProducts"
              initial={lead.hasAiProducts}
            />
          </FieldRow>
          <FieldRow label="KI-Chatbot">
            <EditableBool
              leadId={lead.id}
              field="hasAiChatbot"
              initial={lead.hasAiChatbot}
            />
          </FieldRow>
        </Section>

        {/* Notizen */}
        <Section
          title="Notizen"
          icon={<FileText className="size-3.5" />}
          accent="emerald"
          className="col-span-12"
        >
          <EditableNotes leadId={lead.id} initial={lead.notes} />
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  accent,
  className,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent: "sky" | "violet" | "emerald" | "amber";
  className?: string;
  children: React.ReactNode;
}) {
  const accentMap = {
    sky: {
      bar: "from-sky-500 to-sky-400",
      icon: "text-sky-600 dark:text-sky-400",
      ring: "ring-sky-500/10",
    },
    violet: {
      bar: "from-violet-500 to-violet-400",
      icon: "text-violet-600 dark:text-violet-400",
      ring: "ring-violet-500/10",
    },
    emerald: {
      bar: "from-emerald-500 to-emerald-400",
      icon: "text-emerald-600 dark:text-emerald-400",
      ring: "ring-emerald-500/10",
    },
    amber: {
      bar: "from-amber-500 to-amber-400",
      icon: "text-amber-600 dark:text-amber-400",
      ring: "ring-amber-500/10",
    },
  } as const;
  const a = accentMap[accent];
  return (
    <section
      className={`relative border border-border rounded-md bg-card shadow-sm ring-1 ${a.ring} overflow-hidden ${className ?? ""}`}
    >
      <div
        className={`absolute top-0 left-0 h-full w-0.5 bg-gradient-to-b ${a.bar}`}
      />
      <header className="px-5 pt-4 pb-3 border-b border-border/60 flex items-center gap-2">
        <span className={a.icon}>{icon}</span>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </header>
      <div className="p-5 space-y-3">{children}</div>
    </section>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 items-center min-h-[2.25rem]">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
        {label}
      </dt>
      <dd className="col-span-2 min-w-0">{children}</dd>
    </div>
  );
}
