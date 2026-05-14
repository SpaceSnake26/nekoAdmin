import type { LetterSource, SourceLetterRef } from "./types";

const ALL_LETTER_TYPES = [
  "CLASSIC_LETTER",
  "SMART_LETTER",
  "SMART_LETTER_ANSWER",
  "SIMPLE_SHORT_MESSAGE",
  "INCAMAIL",
  "SECURESEND",
] as const;

/** Shape of a letter as returned by `GET /epost/v2/letters` (we only type what we read). */
interface EpostListItem {
  id: string;
  letterTitle: string | null;
  fileName: string | null;
  senderParticipantId: string | null;
  senderUserId: string | null;
  senderCaseId: string | null;
  senderEndToEndId: string | null;
  documentTypes: string[] | null;
  letterContentReference: string;
  letterType: string;
  receivedDateTime: string;
  documentMessage: string | null;
  readStatus: "READ" | "UNREAD";
  remainingDayToDelete: number;
}

export class EpostApiSource implements LetterSource {
  readonly name = "epost-api";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = "https://api.epost.ch",
  ) {
    if (!apiKey) throw new Error("EPOST_API_KEY is required");
  }

  async list({ since }: { since: Date }): Promise<SourceLetterRef[]> {
    const params = new URLSearchParams();
    for (const t of ALL_LETTER_TYPES) params.append("letter-types", t);
    params.set("from-date", since.toISOString().slice(0, 10));
    params.set("limit", "1000");
    params.set("letter-folder", "INBOX_FOLDER");

    const res = await fetch(
      `${this.baseUrl}/epost/v2/letters?${params.toString()}`,
      { headers: { "X-API-KEY": this.apiKey, Accept: "application/json" } },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ePost list failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const items = (await res.json()) as EpostListItem[];
    return items
      .map((item) => ({
        externalId: item.id,
        receivedAt: new Date(item.receivedDateTime),
        fileName: item.fileName,
        title: item.letterTitle,
        docTypes: item.documentTypes,
        rawSnapshot: item,
      }))
      .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
  }

  async fetchPdf(externalId: string): Promise<Buffer> {
    const res = await fetch(
      `${this.baseUrl}/epost/v2/letters/${encodeURIComponent(externalId)}/content`,
      { headers: { "X-API-KEY": this.apiKey } },
    );
    if (!res.ok) {
      throw new Error(`ePost fetchPdf ${externalId} failed: ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
}
