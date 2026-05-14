import Link from "next/link";

import { formatDate } from "@/lib/format";
import { listSurveyResponses, listSurveys } from "@/server/queries/surveys";

export const dynamic = "force-dynamic";

export default async function SurveysPage() {
  const [surveys, responses] = await Promise.all([
    listSurveys(),
    listSurveyResponses(),
  ]);

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto space-y-12">
      <div className="border-b border-border pb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
          Beschaffung
        </div>
        <h1 className="text-2xl font-medium tracking-tight">Umfragen</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {surveys.length} Umfrage{surveys.length === 1 ? "" : "n"} ·{" "}
          {responses.length} Antwort{responses.length === 1 ? "" : "en"}
        </p>
      </div>

      <Block title="Veröffentlichte Umfragen" count={surveys.length}>
        {surveys.length === 0 ? (
          <EmptyState>Noch keine Umfragen angelegt.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {surveys.map((s, i) => (
              <li
                key={s.id}
                className="stagger-child"
                style={{ ["--index" as never]: i } as React.CSSProperties}
              >
                <div className="flex items-center gap-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">
                      {s.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono truncate">
                      /surveys/{s.id}
                    </div>
                  </div>
                  <Link
                    href={`/surveys/${s.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Öffnen
                  </Link>
                  <div className="text-[11px] font-mono tabular-nums text-muted-foreground shrink-0 w-24 text-right">
                    {formatDate(s.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Antworten" count={responses.length}>
        {responses.length === 0 ? (
          <EmptyState>Noch keine Antworten eingegangen.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {responses.map((r, i) => (
              <li
                key={r.id}
                className="stagger-child"
                style={{ ["--index" as never]: i } as React.CSSProperties}
              >
                <div className="flex items-center gap-5 py-4 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground truncate">
                      {r.contactName ?? r.email}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {r.leadPharmacyName ?? r.email}
                      {r.leadCity ? ` · ${r.leadCity}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 w-32 truncate">
                    {r.topPriority ?? "—"}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-muted-foreground shrink-0 w-24 text-right">
                    {formatDate(r.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </div>
  );
}

function Block({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-border">
        <h2 className="text-sm font-medium tracking-tight text-foreground/90">
          {title}
        </h2>
        {typeof count === "number" ? (
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
