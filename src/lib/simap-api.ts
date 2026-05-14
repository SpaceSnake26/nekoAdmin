const SIMAP_BASE = "https://www.simap.ch/api";

export interface SIMAPTranslation {
  de?: string | null;
  fr?: string | null;
  it?: string | null;
  en?: string | null;
}

export interface SIMAPOrderAddress {
  canton?: string | null;
  city?: string | null;
  country?: string | null;
  street?: string | null;
  zip?: string | null;
}

export interface SIMAPProject {
  id: string;
  title: SIMAPTranslation;
  projectNumber: string;
  projectType: string;
  projectSubType: string;
  processType: string;
  lotsType: string;
  publicationId: string;
  publicationDate: string;
  publicationNumber: string;
  pubType: string;
  corrected: boolean;
  procOfficeName: SIMAPTranslation;
  orderAddress?: SIMAPOrderAddress | null;
}

interface SIMAPSearchResponse {
  projects: SIMAPProject[];
  pagination: { lastItem?: string; itemsPerPage?: number };
}

type QueryParams = Record<string, string | string[] | undefined>;

function buildUrl(path: string, params: QueryParams): string {
  const url = new URL(SIMAP_BASE + path);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) url.searchParams.append(key, v);
    } else {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export async function searchTenders(params: QueryParams): Promise<SIMAPProject[]> {
  const url = buildUrl("/publications/v2/project/project-search", params);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const data: SIMAPSearchResponse = await res.json();
    return data.projects ?? [];
  } catch {
    return [];
  }
}

export function pickTranslation(t: SIMAPTranslation | null | undefined): string {
  if (!t) return "—";
  return t.de ?? t.fr ?? t.it ?? t.en ?? "—";
}

export function simapProjectUrl(projectId: string): string {
  return `https://www.simap.ch/de/project-detail/${projectId}`;
}

export function zurichDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
