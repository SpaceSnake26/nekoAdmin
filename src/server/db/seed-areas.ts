import { db, schema } from "./index";

interface SeedArea {
  code: string;
  label: string;
  color: string;
  senderPatterns: string[];
  description: string;
}

const DEFAULT_AREAS: SeedArea[] = [
  {
    code: "ahv",
    label: "AHV",
    color: "emerald",
    senderPatterns: ["AKSO", "Ausgleichskasse", "SVA", "Sozialversicherungsanstalt"],
    description: "AHV/IV/EO-Beiträge und Sozialversicherung",
  },
  {
    code: "bvg",
    label: "BVG",
    color: "teal",
    senderPatterns: ["Vita", "Pensionskasse", "Swisscanto", "Sammelstiftung", "PK "],
    description: "Berufliche Vorsorge / 2. Säule",
  },
  {
    code: "uvg",
    label: "UVG",
    color: "cyan",
    senderPatterns: ["SUVA", "UVG"],
    description: "Unfallversicherung (Berufs-/Nichtberuf)",
  },
  {
    code: "ktg",
    label: "KTG",
    color: "sky",
    senderPatterns: ["KTG", "Krankentaggeld"],
    description: "Krankentaggeld-Versicherung",
  },
  {
    code: "kk",
    label: "Krankenkasse",
    color: "blue",
    senderPatterns: ["Helsana", "Sanitas", "Visana", "CSS", "Swica", "Concordia", "Krankenkasse"],
    description: "Obligatorische und private Krankenversicherung",
  },
  {
    code: "steuern",
    label: "Steuern",
    color: "violet",
    senderPatterns: ["Steueramt", "Steuerverwaltung", "Gemeinde", "Eidgenössische Steuerverwaltung"],
    description: "Kantons-, Gemeinde- und direkte Bundessteuer",
  },
  {
    code: "mwst",
    label: "MwSt",
    color: "purple",
    senderPatterns: ["Mehrwertsteuer", "ESTV"],
    description: "Mehrwertsteuer",
  },
  {
    code: "bank",
    label: "Bank",
    color: "slate",
    senderPatterns: ["UBS", "PostFinance", "Raiffeisen", "ZKB", "Credit Suisse", "Migros Bank"],
    description: "Kontoauszüge, Zinsbescheinigungen, Banking",
  },
  {
    code: "recht",
    label: "Recht",
    color: "rose",
    senderPatterns: ["Betreibungsamt", "Amtschreiberei", "Gericht", "Bezirksgericht", "Anwalt", "Rechtsanwältin"],
    description: "Gerichte, Betreibungsämter, Rechtsanwälte",
  },
  {
    code: "telekom",
    label: "Telekom",
    color: "orange",
    senderPatterns: ["Swisscom", "Sunrise", "Salt", "UPC", "Quickline"],
    description: "Mobil-, Festnetz- und Internet-Verträge",
  },
  {
    code: "miete",
    label: "Miete",
    color: "amber",
    senderPatterns: ["Verwaltung", "Immobilien", "Liegenschaften"],
    description: "Mietverhältnis, Nebenkosten, Vermieter",
  },
  {
    code: "energie",
    label: "Energie",
    color: "yellow",
    senderPatterns: ["AEW", "CKW", "BKW", "Axpo", "Elektrizitätswerk", "EW "],
    description: "Strom, Gas, Wasser, Fernwärme",
  },
  {
    code: "buchhaltung",
    label: "Buchhaltung",
    color: "stone",
    senderPatterns: ["KLARA", "Treuhand", "Revision"],
    description: "Treuhand, Buchhaltungs-Dienste",
  },
  {
    code: "personal",
    label: "Personal",
    color: "lime",
    senderPatterns: [],
    description: "Lohnausweise, Personalakten, Mitarbeiter-Kommunikation",
  },
  {
    code: "marketing",
    label: "Marketing",
    color: "pink",
    senderPatterns: [],
    description: "Eigene Werbung / erhaltene Mailings",
  },
  {
    code: "sonstiges",
    label: "Sonstiges",
    color: "gray",
    senderPatterns: [],
    description: "Kein klar zuordenbarer Bereich",
  },
];

/**
 * Insert default areas if none exist. Called on app boot / migration.
 * Idempotent — won't duplicate or reset user edits.
 */
export async function seedAreasIfEmpty(): Promise<void> {
  const existing = await db.select({ code: schema.areas.code }).from(schema.areas);
  if (existing.length > 0) return;

  await db.insert(schema.areas).values(
    DEFAULT_AREAS.map((a, idx) => ({
      code: a.code,
      label: a.label,
      color: a.color,
      senderPatterns: a.senderPatterns,
      description: a.description,
      sortOrder: idx,
    })),
  );
}
