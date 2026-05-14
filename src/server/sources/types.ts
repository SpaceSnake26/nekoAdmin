/**
 * Abstraction for "where do incoming letters come from?".
 *
 * Currently only EpostApiSource is implemented; the interface stays
 * minimal so a future ImapSource or ScannerInboxSource can slot in.
 */

export interface SourceLetterRef {
  /** Stable id from the upstream source. Used as the dedup key in `letters.epost_id`. */
  externalId: string;
  /** Wall-clock time the letter was received in the source inbox. */
  receivedAt: Date;
  /** Original filename (often unhelpful for ePost scans, but useful when present). */
  fileName: string | null;
  /** Source-given title (often "Gescannter Brief" for ePost). */
  title: string | null;
  /** Source-given coarse classification (e.g. ePost's `documentTypes`). */
  docTypes: string[] | null;
  /** Anything else the source returned about this letter — stored verbatim as `apiSnapshot`. */
  rawSnapshot: unknown;
}

export interface LetterSource {
  /** Name used in `letters.source` and shown in /settings. */
  readonly name: string;
  /** List references newer than `since`, sorted oldest → newest. */
  list(opts: { since: Date }): Promise<SourceLetterRef[]>;
  /** Download the letter's PDF bytes. */
  fetchPdf(externalId: string): Promise<Buffer>;
}
