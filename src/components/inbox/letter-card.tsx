import Link from "next/link";
import { FileText, Layers } from "lucide-react";

import { diffDays } from "@/lib/date";
import {
  documentTypeLabel,
  formatAmount,
  formatDate,
  reminderLabel,
} from "@/lib/format";

export interface LetterCardData {
  id: string;
  subject: string | null;
  reference: string | null;
  receivedAt: Date;
  letterDate: Date | null;
  dueDate: Date | null;
  amount: number | null;
  currency: string | null;
  documentType: string | null;
  area: string | null;
  reminderLevel: number | null;
  paymentStatus: string;
  taskStatus: string;
  canonicalName: string | null;
  senderRawName: string | null;
  groupId: string | null;
  tags: { name: string; kind: string }[];
  /** Total letters in the same group (incl. this one). 1 or undefined = solo / hide indicator. */
  groupLetterCount?: number;
}

export function LetterCard({
  letter,
  now,
  areaLabel,
  hideOuterBorder,
}: {
  letter: LetterCardData;
  now: Date;
  areaLabel: Map<string, string>;
  hideOuterBorder?: boolean;
}) {
  const days = letter.dueDate ? diffDays(now, letter.dueDate) : null;
  const overdue = days != null && days < 0 && letter.paymentStatus === "open";
  const soon = days != null && days >= 0 && days <= 7 && letter.paymentStatus === "open";
  const paid = letter.paymentStatus === "paid";
  const done = letter.taskStatus === "done";

  return (
    <article
      className={`group relative flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 ${
        hideOuterBorder
          ? ""
          : "rounded-lg border border-border bg-card hover:border-ring/60"
      } ${paid || done ? "opacity-70" : ""}`}
    >
      {/* Status accent bar */}
      {overdue ? (
        <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-destructive z-0" />
      ) : soon ? (
        <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-warning z-0" />
      ) : null}

      {/* Whole-card link overlay (z-0); inner links sit at z-10 to capture clicks first */}
      <Link
        href={`/letters/${letter.id}`}
        aria-label={`Brief ${letter.subject ?? letter.id} öffnen`}
        className="absolute inset-0 z-0"
      />

      {/* Body */}
      <div className="flex p-3 gap-3 relative z-10 pointer-events-none">
        <div
          className="shrink-0 w-20 h-28 relative rounded border border-border bg-muted/40 bg-no-repeat bg-cover bg-top overflow-hidden"
          style={{ backgroundImage: `url(/api/thumbnail/${letter.id})` }}
          aria-hidden="true"
        >
          <FileText
            className="absolute inset-0 m-auto size-5 text-muted-foreground/30"
            strokeWidth={1.5}
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex flex-wrap items-center gap-x-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground leading-none mb-1.5">
            <span>{documentTypeLabel(letter.documentType)}</span>
            {letter.area ? (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-primary/80">
                  {areaLabel.get(letter.area) ?? letter.area}
                </span>
              </>
            ) : null}
            {letter.reminderLevel && letter.reminderLevel > 0 ? (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-warning">
                  {reminderLabel(letter.reminderLevel)}
                </span>
              </>
            ) : null}
          </div>
          <h3 className="text-sm font-medium leading-snug text-foreground line-clamp-2 mb-1">
            {letter.subject ?? letter.reference ?? "(ohne Titel)"}
          </h3>
          <p className="text-xs text-muted-foreground truncate mb-auto">
            {letter.canonicalName ?? letter.senderRawName ?? "—"}
          </p>
          <div className="flex items-baseline justify-between gap-2 mt-2 pt-2 border-t border-border/60">
            <span className="text-sm font-mono tabular-nums text-foreground">
              {letter.amount != null
                ? formatAmount(letter.amount, letter.currency ?? "CHF")
                : <span className="text-muted-foreground/60">—</span>}
            </span>
            {letter.dueDate ? (
              <span
                className={`text-[11px] font-mono tabular-nums ${
                  overdue
                    ? "text-destructive"
                    : soon
                      ? "text-warning"
                      : "text-muted-foreground"
                }`}
              >
                {overdue
                  ? `−${Math.abs(days!)}T`
                  : soon
                    ? `+${days}T`
                    : formatDate(letter.dueDate)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border/60 bg-muted/20 text-[11px] min-h-[2.25rem] relative z-10 pointer-events-none">
        <StatusPill paymentStatus={letter.paymentStatus} taskStatus={letter.taskStatus} />
        <div className="flex items-center gap-1 flex-wrap justify-end min-w-0">
          {letter.tags.slice(0, 2).map((t) => (
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
          {letter.tags.length > 2 ? (
            <span className="text-[10px] text-muted-foreground">
              +{letter.tags.length - 2}
            </span>
          ) : null}
          {letter.groupLetterCount && letter.groupLetterCount > 1 && letter.groupId ? (
            <Link
              href={`/groups/${letter.groupId}`}
              className="pointer-events-auto inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors ml-1"
              title={`Teil einer Gruppe mit ${letter.groupLetterCount} Briefen`}
            >
              <Layers className="size-3" strokeWidth={2} />
              {letter.groupLetterCount}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function StatusPill({
  paymentStatus,
  taskStatus,
}: {
  paymentStatus: string;
  taskStatus: string;
}) {
  if (paymentStatus === "paid" || taskStatus === "done") {
    return (
      <div className="inline-flex items-center gap-1.5 text-primary">
        <span className="size-1.5 rounded-full bg-primary" />
        {paymentStatus === "paid" ? "bezahlt" : "erledigt"}
      </div>
    );
  }
  if (paymentStatus === "open") {
    return (
      <div className="inline-flex items-center gap-1.5 text-foreground/80">
        <span className="size-1.5 rounded-full bg-foreground/40" />
        offen
      </div>
    );
  }
  if (taskStatus === "open") {
    return (
      <div className="inline-flex items-center gap-1.5 text-foreground/80">
        <span className="size-1.5 rounded-full bg-warning" />
        Aufgabe
      </div>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

export { StatusPill as LetterCardStatusPill };
