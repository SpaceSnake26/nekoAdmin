import { z } from "zod";

/**
 * Document type — universal, hardcoded. 12 values that cover the structural
 * nature of a letter independently of its business area.
 *
 * - rechnung: normale Rechnung mit Zahlfrist (keine Mahnung)
 * - mahnung: Mahnung / Zahlungserinnerung (1./2./letzte)
 * - betreibung: Betreibungsverfahren (Zahlungsbefehl, Betreibungsankündigung)
 * - verfuegung: amtliche Verfügung (Steuer-, AHV-, IV-Entscheid, Veranlagung)
 * - police: Versicherungspolice / Policennachweis / Policenänderung
 * - vertrag: Vertrag oder AGB-Update
 * - bestaetigung: Anmeldebestätigung, Status-Update, Empfangsbestätigung
 * - kontoauszug: Kontoauszug, Zinsausweis, Lohnausweis (kein Zahlungsbezug)
 * - aufforderung: Aktion erforderlich aber keine Zahlung (Lohnmeldung, Fragebogen, Unterschrift)
 * - information: rein informativ, keine Aktion nötig
 * - werbung: Prospekt, Mailing, Katalog
 * - sonstiges: nichts davon
 */
export const DocumentTypeEnum = z.enum([
  "rechnung",
  "mahnung",
  "betreibung",
  "verfuegung",
  "police",
  "vertrag",
  "bestaetigung",
  "kontoauszug",
  "aufforderung",
  "information",
  "werbung",
  "sonstiges",
]);
export type DocumentType = z.infer<typeof DocumentTypeEnum>;

export const LanguageEnum = z.enum(["de", "fr", "it", "en"]);
export type Language = z.infer<typeof LanguageEnum>;

/**
 * Builds the extraction Zod schema dynamically so the `area` enum reflects
 * the user's current area catalog (seeded defaults + custom). Passing an
 * empty list allows any string (fallback).
 *
 * IMPORTANT: dates are ISO YYYY-MM-DD strings here; the pipeline
 * converts them to Date objects before writing to SQLite.
 */
export function buildExtractionSchema(areaCodes: string[]) {
  const areaEnum: z.ZodTypeAny =
    areaCodes.length > 0
      ? z.enum(["", ...areaCodes] as [string, ...string[]])
      : z.string();

  return z.object({
  // Datum auf dem Brief (nicht der Posteingang).
  letterDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date YYYY-MM-DD")
    .nullable()
    .describe("Datum das auf dem Brief steht (NICHT das Empfangsdatum)."),

  // Kurzer, sprechender Titel (3-100 Zeichen). Niemals "Gescannter Brief".
  subject: z
    .string()
    .min(3)
    .max(120)
    .describe(
      'Prägnanter, beschreibender Titel des Briefes. NIEMALS "Gescannter Brief". Format: "{Absender-Kurz} {Anliegen} {Monat YYYY}", z.B. "Vita BVG Letzte Mahnung April 2026"',
    ),

  // Klartext-Name des Absenders.
  senderName: z
    .string()
    .min(2)
    .describe(
      'Vollständiger Klartext-Name des Absenders aus dem Briefkopf. Korrigiere OCR-Fehler ("Schonenvverd" → "Schönenwerd"). Beispiele: "Sammelstiftung Vita / Zurich Schweiz", "Ausgleichskasse des Kantons Solothurn", "ePost Service AG".',
    ),

  // Eindeutige UID falls vorhanden (CHE-XXX.XXX.XXX) oder Aktenzeichen
  senderUid: z
    .string()
    .nullable()
    .describe('Schweizer UID des Absenders, Format "CHE-123.456.789".'),

  senderAddress: z
    .string()
    .nullable()
    .describe("Postadresse des Absenders, einzeilig."),

  senderEmail: z.string().nullable(),
  senderPhone: z.string().nullable(),

  // Zahlung (alle nullable für Nicht-Rechnungen)
  amount: z
    .number()
    .nullable()
    .describe(
      "Effektiv geschuldeter Gesamtbetrag in der Hauptwährung. Bei Mahnungen INKL. Mahnspesen. Z.B. 3354.60 (nicht 3'354.60).",
    ),
  currency: z
    .string()
    .default("CHF")
    .describe('ISO-Code, z.B. "CHF", "EUR".'),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date YYYY-MM-DD")
    .nullable()
    .describe(
      'Fälligkeitsdatum als ISO. "bis 29.04.2026" → "2026-04-29". null wenn keine konkrete Frist.',
    ),
  reference: z
    .string()
    .nullable()
    .describe(
      'QR-Referenz, ESR-Nummer, oder Aktenzeichen. Beispiele: "RF18 5390 0754 7034", "95028075-LEA", "Betr.-Nr. 829697".',
    ),
  iban: z
    .string()
    .nullable()
    .describe("Klassische IBAN, formatiert mit Leerzeichen."),
  qrIban: z
    .string()
    .nullable()
    .describe("QR-IBAN (beginnt mit CH und enthält 30000-31999 als Anteil)."),

  // Dokumenttyp — was ist das für ein Dokument?
  documentType: DocumentTypeEnum.describe(
    "Struktur des Dokuments. Mahnung von Versicherung ist 'mahnung' (NICHT 'police'). Veranlagungsverfügung des Steueramts ist 'verfuegung'. Lohndeklaration-Aufforderung ist 'aufforderung'. Rechnung ohne Mahnungs-Wortlaut ist 'rechnung'.",
  ),
  // Bereich — dynamic enum, siehe areaCodes-Parameter
  area: areaEnum.describe(
    'Business-Bereich dieses Briefes (Fachgebiet des Absenders). Leerer String "" wenn kein Bereich eindeutig passt (z.B. reine Werbung).',
  ),
  reminderLevel: z
    .number()
    .int()
    .min(0)
    .max(4)
    .describe(
      '0 = Original/keine Mahnung, 1 = "1. Mahnung" / "Zahlungserinnerung", 2 = "2. Mahnung", 3 = "Letzte Mahnung", 4 = Betreibung/Zahlungsbefehl.',
    ),
  language: LanguageEnum,

  // Multi-Brief-PDFs (z.B. Mahnung + Beilage vorherige Mahnung)
  containsMultipleSections: z
    .boolean()
    .describe(
      "true wenn das PDF mehrere logisch eigenständige Briefe oder Beilagen enthält (z.B. Letzte Mahnung mit 2. Mahnung als Beilage). Sonst false.",
    ),

  // Aktion / Empfehlung
  recommendedAction: z
    .string()
    .nullable()
    .describe(
      'Konkrete empfohlene Aktion in 1 Satz, z.B. "Bis 29.04.2026 CHF 3354.60 überweisen, sonst Vertragskündigung."',
    ),
  taskTitle: z
    .string()
    .nullable()
    .describe(
      'Wenn category=task: kurzer Titel der Aufgabe, z.B. "AHV-Lohndeklaration einreichen".',
    ),
  taskDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date YYYY-MM-DD")
    .nullable(),

  // Zusammenfassung für briefe.md (1-4 Sätze, Deutsch, sachlich)
  summary: z
    .string()
    .min(20)
    .max(2000)
    .describe(
      "1-4 Sätze auf Deutsch, sachlich, faktisch (max ca. 400 Wörter). Enthält Absender, Anliegen, Betrag/Frist falls relevant, und Multi-Brief-Hinweis falls vorhanden. Bei komplexen Briefen darf länger sein.",
    ),

  // Selbsteinschätzung 0..1
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Selbsteinschätzung der Extraktions-Qualität. 1 = alle Werte sicher abgelesen. <0.7 wenn PDF schlecht lesbar oder Felder unklar.",
    ),
  });
}

// Generic shape for TypeScript inference — tolerates any area string.
export type ExtractionResult = z.infer<ReturnType<typeof buildExtractionSchema>>;
