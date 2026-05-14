import { readFile } from "node:fs/promises";
import path from "node:path";

import type { LetterSource, SourceLetterRef } from "./types";

/**
 * Test source that reads PDFs from data/fixtures/ and serves them with
 * the real ePost metadata we captured during analysis. Use for seeding
 * the DB without spending live API quota.
 */
export class FixturesSource implements LetterSource {
  readonly name = "fixtures";

  private readonly fixtures: Record<string, Fixture> = {
    A_scanned_invoice: {
      id: "69e1e8c46831ce77cc02840d",
      filename: "260417153000174.pdf",
      title: "Gescannter Brief",
      docTypes: ["Invoice"],
      receivedDateTime: "2026-04-17T08:01:07.954Z",
    },
    B_scanned_unclassified: {
      id: "69e0975837dadb35b64043af",
      filename: "260416153000125.pdf",
      title: "Gescannter Brief",
      docTypes: [],
      receivedDateTime: "2026-04-16T08:01:28.595Z",
    },
    C_named_invoice: {
      id: "69cea841ac15435d1cb30d42",
      filename: "Rechnung Nr._602645.pdf",
      title: "Rechnung Nr._602645.pdf",
      docTypes: ["INVOICE"],
      receivedDateTime: "2026-04-02T17:32:49.020Z",
    },
    D_vita: {
      id: "68553160a82a2657c3c9f640",
      filename: "250620153000102.pdf",
      title: "VITA",
      docTypes: ["Invoice"],
      receivedDateTime: "2025-06-20T10:01:04.550Z",
    },
    E_betreibung: {
      id: "669e891943033a5abfad517f",
      filename: "240722153001757.pdf",
      title: "Abrechnung Betreibungsamt",
      docTypes: [],
      receivedDateTime: "2024-07-22T16:30:17.735Z",
    },
    F_AKSO: {
      id: "692f3169ba708110c776d691",
      filename: "251202153005286.pdf",
      title: "AKSO Lohndeklaration",
      docTypes: [],
      receivedDateTime: "2025-12-02T18:35:20.809Z",
    },
  };

  private readonly dir = path.resolve(process.cwd(), "data", "fixtures");

  async list(): Promise<SourceLetterRef[]> {
    return Object.entries(this.fixtures).map(([key, f]) => ({
      externalId: f.id,
      receivedAt: new Date(f.receivedDateTime),
      fileName: f.filename,
      title: f.title,
      docTypes: f.docTypes,
      rawSnapshot: { fixtureKey: key, ...f },
    }));
  }

  async fetchPdf(externalId: string): Promise<Buffer> {
    const [key] = Object.entries(this.fixtures).find(
      ([, f]) => f.id === externalId,
    ) ?? [];
    if (!key) throw new Error(`unknown fixture id ${externalId}`);
    return readFile(path.join(this.dir, `${key}.pdf`));
  }
}

interface Fixture {
  id: string;
  filename: string;
  title: string;
  docTypes: string[];
  receivedDateTime: string;
}
