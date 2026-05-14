import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  FileText,
  Pencil,
} from "lucide-react";

import { eq } from "drizzle-orm";

import { ScrollIntoViewOnMount } from "@/components/letter/scroll-into-view";
import { StatusToggles } from "@/components/letter/status-toggles";
import { TagEditor } from "@/components/letter/tag-editor";
import { db, schema } from "@/server/db";
import {
  documentTypeLabel,
  formatAmount,
  formatDate,
  reminderLabel,
  shortId,
} from "@/lib/format";
import { getLetterWithContext } from "@/server/queries/letter";

export const dynamic = "force-dynamic";

export default async function LetterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getLetterWithContext(id);
  if (!data) notFound();

  const { letter, sender, group, groupLetters, tags } = data;
  const edited = new Set(letter.userEditedFields ?? []);
  const areaRow = letter.area
    ? (await db
        .select({ label: schema.areas.label })
        .from(schema.areas)
        .where(eq(schema.areas.code, letter.area))
        .limit(1))[0]
    : null;

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] bg-background">
      {/* Left — PDF */}
      <div className="flex-1 min-w-0 flex flex-col border-r border-border">
        <div className="h-10 shrink-0 flex items-center justify-between px-5 border-b border-border bg-card">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Link href="/inbox" className="hover:text-foreground transition-colors">
              <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            </Link>
            <FileText className="size-3.5" strokeWidth={1.75} />
            <span className="font-mono">
              {letter.pageCount ?? "?"} {letter.pageCount === 1 ? "Seite" : "Seiten"}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span className="truncate max-w-64">{letter.epostFileName}</span>
          </div>
          <a
            href={`/api/pdf/${letter.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Original
            <ExternalLink className="size-3" strokeWidth={1.75} />
          </a>
        </div>
        <iframe
          src={`/api/pdf/${letter.id}#view=FitH`}
          className="flex-1 w-full bg-muted/30"
          title={letter.subject ?? "PDF"}
        />
      </div>

      {/* Right — metadata */}
      <aside className="w-[28rem] shrink-0 overflow-y-auto">
        <div className="p-6 space-y-7">
          {/* Title block */}
          <header>
            <div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="font-mono">L_{shortId(letter.id)}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{documentTypeLabel(letter.documentType)}</span>
              {areaRow ? (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-primary/80">{areaRow.label}</span>
                </>
              ) : null}
              {letter.reminderLevel && letter.reminderLevel > 0 ? (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-warning">{reminderLabel(letter.reminderLevel)}</span>
                </>
              ) : null}
            </div>
            <h1 className="text-2xl font-medium tracking-tight leading-[1.15] text-foreground">
              {letter.subject ?? "(ohne Titel)"}
              {edited.has("subject") ? <EditedMark /> : null}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {sender?.canonicalName ?? letter.senderRawName ?? "Unbekannter Absender"}
              {edited.has("senderRawName") ? <EditedMark /> : null}
            </p>
            {letter.extractionConflict ? (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 border border-destructive/30 bg-destructive/10 rounded-md">
                <AlertTriangle className="size-3.5 text-destructive mt-0.5 shrink-0" strokeWidth={1.75} />
                <div className="text-[11px] text-destructive leading-snug">
                  ePost klassifizierte als <span className="font-mono">{JSON.stringify(letter.epostDocTypes)}</span>, Claude als <span className="font-mono">{letter.documentType}</span> — bitte prüfen.
                </div>
              </div>
            ) : null}
          </header>

          {/* Actions */}
          <StatusToggles
            letterId={letter.id}
            paymentStatus={letter.paymentStatus}
            taskStatus={letter.taskStatus}
            hasAmount={letter.amount != null && letter.amount > 0}
            isTask={letter.documentType === "aufforderung" || letter.taskStatus !== "none"}
          />

          {/* Summary */}
          {letter.summary ? (
            <Section label="Zusammenfassung">
              <p className="text-sm leading-relaxed text-foreground/85">
                {letter.summary}
              </p>
            </Section>
          ) : null}

          {/* Recommended action — elevated */}
          {letter.recommendedAction ? (
            <Section label="Empfohlene Aktion" accent>
              <p className="text-sm leading-relaxed text-foreground">
                {letter.recommendedAction}
              </p>
            </Section>
          ) : null}

          {/* Facts */}
          <Section label="Fakten">
            <dl className="divide-y divide-border/60">
              <Fact label="Eingegangen" value={formatDate(letter.receivedAt)} />
              {letter.letterDate ? (
                <Fact
                  label="Briefdatum"
                  value={formatDate(letter.letterDate)}
                  edited={edited.has("letterDate")}
                />
              ) : null}
              {letter.amount != null ? (
                <Fact
                  label="Betrag"
                  value={formatAmount(letter.amount, letter.currency ?? "CHF")}
                  mono
                  edited={edited.has("amount")}
                />
              ) : null}
              {letter.dueDate ? (
                <Fact
                  label="Fälligkeit"
                  value={formatDate(letter.dueDate)}
                  edited={edited.has("dueDate")}
                />
              ) : null}
              {sender?.uid ? <Fact label="UID" value={sender.uid} mono /> : null}
              {letter.reference ? (
                <Fact
                  label="Referenz"
                  value={letter.reference}
                  mono
                  edited={edited.has("reference")}
                  copy
                />
              ) : null}
              {letter.qrIban ? (
                <Fact
                  label="QR-IBAN"
                  value={letter.qrIban}
                  mono
                  edited={edited.has("qrIban")}
                  copy
                />
              ) : null}
              {letter.iban ? (
                <Fact
                  label="IBAN"
                  value={letter.iban}
                  mono
                  edited={edited.has("iban")}
                  copy
                />
              ) : null}
              <Fact
                label="Sprache"
                value={letter.language?.toUpperCase() ?? "—"}
              />
            </dl>
          </Section>

          {/* Tags */}
          <Section label="Tags">
            <TagEditor
              letterId={letter.id}
              initialTags={tags.map((t) => ({
                id: t.id,
                name: t.name,
                color: t.color,
                kind: t.kind,
              }))}
            />
          </Section>

          {/* Group timeline — current letter inkl., farbig markiert */}
          {group && groupLetters.length > 1 ? (
            <Section label={`Gruppe · ${group.title} · ${groupLetters.length} Briefe`}>
              <ol className="space-y-2 relative before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                {groupLetters.map((s) => {
                  const isCurrent = s.id === letter.id;
                  const dot = (
                    <span
                      className={`absolute left-0 top-1.5 size-2.5 rounded-full ring-2 ring-background ${
                        isCurrent
                          ? "bg-primary scale-125 shadow-[0_0_0_3px] shadow-primary/20"
                          : "bg-border"
                      }`}
                    />
                  );
                  const inner = (
                    <>
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={`font-medium truncate ${
                            isCurrent ? "text-primary" : ""
                          }`}
                        >
                          {s.subject}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-muted-foreground shrink-0">
                          {formatDate(s.letterDate ?? s.receivedAt)}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        {reminderLabel(s.reminderLevel) ? (
                          <span className="text-warning">
                            {reminderLabel(s.reminderLevel)}
                          </span>
                        ) : null}
                        {s.amount != null ? (
                          <span className="font-mono tabular-nums">
                            {formatAmount(s.amount, s.currency ?? "CHF")}
                          </span>
                        ) : null}
                      </div>
                    </>
                  );
                  const li = (
                    <li
                      key={s.id}
                      className={`flex items-start gap-3 relative pl-4 -mx-2 px-2 py-1 rounded scroll-mt-20 ${
                        isCurrent ? "bg-primary/5" : ""
                      }`}
                    >
                      {dot}
                      {isCurrent ? (
                        <div className="flex-1 min-w-0 text-sm">{inner}</div>
                      ) : (
                        <Link
                          href={`/letters/${s.id}`}
                          className="flex-1 min-w-0 hover:text-primary transition-colors text-sm group"
                        >
                          {inner}
                        </Link>
                      )}
                    </li>
                  );
                  return isCurrent ? (
                    <ScrollIntoViewOnMount key={s.id} className="contents">
                      {li}
                    </ScrollIntoViewOnMount>
                  ) : (
                    li
                  );
                })}
              </ol>
            </Section>
          ) : null}

          {/* Audit */}
          <Section label="KI-Extraktion">
            <dl className="grid grid-cols-2 gap-y-1.5 text-[11px]">
              <dt className="text-muted-foreground">Modell</dt>
              <dd className="font-mono">{letter.extractionModel ?? "—"}</dd>
              <dt className="text-muted-foreground">Confidence</dt>
              <dd className="font-mono tabular-nums">
                {letter.extractionConfidence != null
                  ? `${(letter.extractionConfidence * 100).toFixed(0)} %`
                  : "—"}
              </dd>
              <dt className="text-muted-foreground">API-Titel</dt>
              <dd className="truncate font-mono text-[10px]">{letter.epostTitle ?? "—"}</dd>
              <dt className="text-muted-foreground">API-Typen</dt>
              <dd className="font-mono text-[10px]">{JSON.stringify(letter.epostDocTypes)}</dd>
            </dl>
          </Section>
        </div>
      </aside>
    </div>
  );
}

function Section({
  label,
  children,
  accent,
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section>
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 mb-2 font-medium">
        {label}
      </div>
      <div
        className={
          accent
            ? "border-l-2 border-primary pl-3 py-0.5"
            : ""
        }
      >
        {children}
      </div>
    </section>
  );
}

function Fact({
  label,
  value,
  mono,
  edited,
  copy: _copy,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  edited?: boolean;
  copy?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 text-sm">
      <dt className="text-muted-foreground text-[12px] shrink-0">{label}</dt>
      <dd
        className={`text-right truncate max-w-[60%] ${mono ? "font-mono text-[12px] tabular-nums" : ""}`}
      >
        {value ?? "—"}
        {edited ? <EditedMark /> : null}
      </dd>
    </div>
  );
}

function EditedMark() {
  return (
    <span
      title="Manuell bearbeitet — wird bei Re-Extract nicht überschrieben"
      className="inline-flex items-center justify-center ml-1.5 align-baseline size-3.5 rounded-sm bg-primary/15 text-primary"
    >
      <Pencil className="size-2.5" strokeWidth={2} />
    </span>
  );
}
