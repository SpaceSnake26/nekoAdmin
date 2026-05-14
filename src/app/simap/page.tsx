import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  pickTranslation,
  searchTenders,
  simapProjectUrl,
  zurichDateDaysAgo,
  type SIMAPProject,
} from "@/lib/simap-api";

export const dynamic = "force-dynamic";

// Keyword searches (German — simap.ch is primarily DE/FR/IT)
const KEYWORDS = [
  "Website",
  "Webshop",
  "Webauftritt",
  "CMS",
  "CRM",
  "Webapplikation",
  "E-Commerce",
  "Onlineshop",
];

// CPV codes for web / software development
const WEB_CPV_CODES = [
  "72413000", // WWW site design services
  "72420000", // Internet development services
  "72421000", // Internet client app development
  "72422000", // Internet server app development
  "72230000", // Custom software development
  "72262000", // Software development services
  "72263000", // Software implementation services
];

const SUBTYPE_LABELS: Record<string, string> = {
  construction: "Bau",
  service: "Dienstleistung",
  supply: "Lieferung",
  project_competition: "Projektwettbewerb",
  idea_competition: "Ideenwettbewerb",
  project_study: "Projektstudie",
  idea_study: "Ideenstudie",
  request_for_information: "Anfrage",
};

const PROCESS_LABELS: Record<string, string> = {
  open: "Offen",
  selective: "Selektiv",
  invitation: "Einladung",
  direct: "Freihändig",
  no_process: "—",
};

async function fetchWebDevTenders(): Promise<SIMAPProject[]> {
  const from = zurichDateDaysAgo(180);
  const baseParams = {
    newestPubTypes: ["tender"],
    newestPublicationFrom: from,
    projectSubTypes: ["service", "supply"],
  };

  const results = await Promise.all([
    ...KEYWORDS.map((search) => searchTenders({ ...baseParams, search })),
    searchTenders({ ...baseParams, cpvCodes: WEB_CPV_CODES }),
  ]);

  const seen = new Set<string>();
  const deduped: SIMAPProject[] = [];
  for (const batch of results) {
    for (const project of batch) {
      if (!seen.has(project.id)) {
        seen.add(project.id);
        deduped.push(project);
      }
    }
  }

  deduped.sort((a, b) => b.publicationDate.localeCompare(a.publicationDate));
  return deduped;
}

export default async function SimapPage() {
  const tenders = await fetchWebDevTenders();

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-5">
      <div className="border-b border-border pb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
          Beschaffung
        </div>
        <h1 className="text-2xl font-medium tracking-tight">SIMAP — Webprojekte</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {tenders.length} Ausschreibungen · Webseiten, Webshops, CMS, CRM &amp; Webapplikationen ·
          Quelle:{" "}
          <a
            href="https://www.simap.ch"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            simap.ch
          </a>
        </p>
      </div>

      {tenders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Ausschreibungen gefunden.</p>
      ) : (
        <ul className="divide-y border rounded-md">
          {tenders.map((t) => (
            <TenderRow key={t.id} tender={t} />
          ))}
        </ul>
      )}

      <p className="text-[11px] text-muted-foreground">
        Nur Ausschreibungen (Publikationstyp «Ausschreibung») der letzten 180 Tage · Dienstleistungen &amp; Lieferungen ·
        Eingabefrist auf simap.ch prüfen — abgelaufene Ausschreibungen ohne Zuschlag können enthalten sein.
      </p>
    </div>
  );
}

function formatPubDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function TenderRow({ tender }: { tender: SIMAPProject }) {
  const title = pickTranslation(tender.title);
  const authority = pickTranslation(tender.procOfficeName);
  const canton = tender.orderAddress?.canton;
  const subtypeLabel = SUBTYPE_LABELS[tender.projectSubType] ?? tender.projectSubType;
  const processLabel = PROCESS_LABELS[tender.processType] ?? tender.processType;

  return (
    <li className="p-4 hover:bg-muted/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <a
            href={simapProjectUrl(tender.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline inline-flex items-center gap-1.5"
          >
            <span className="truncate max-w-[640px] inline-block">{title}</span>
            <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
          </a>
          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-mono text-[11px]">{tender.projectNumber}</span>
            <span>·</span>
            <span>{authority}</span>
            {canton && (
              <>
                <span>·</span>
                <span className="font-medium text-foreground/70">{canton}</span>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <Badge variant="outline" className="text-[10px] font-mono tabular-nums">
            {formatPubDate(tender.publicationDate)}
          </Badge>
          <div className="flex gap-1">
            {subtypeLabel && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                {subtypeLabel}
              </Badge>
            )}
            {processLabel && processLabel !== "—" && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                {processLabel}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
