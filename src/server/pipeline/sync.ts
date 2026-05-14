import { eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { Letter } from "@/server/db/schema";
import { parseIsoDate } from "@/lib/date";
import type { LetterSource } from "@/server/sources";
import { getActiveSource } from "@/server/sources";

import { applyAutoTags } from "./auto-tag";
import { extractLetter } from "./extract";
import { groupLetter } from "./group";
import { ingestLetter } from "./ingest";
import { renderMarkdownIndex } from "./markdown-index";
import { resolveSender } from "./normalize-sender";
import { applySenderDefaultTags } from "./sender-tags";

const DEFAULT_CONCURRENCY = 3;

export interface SyncOptions {
  /** Only pull letters received on/after this date. */
  since: Date;
  /** Max concurrent extraction calls. */
  concurrency?: number;
  /** If set, only process this many letters (oldest first). Useful for trial runs. */
  limit?: number;
  /** Override the source — default is `getActiveSource()` (ePost API). */
  source?: LetterSource;
  /** Progress callback for UI / CLI. */
  onProgress?: (e: ProgressEvent) => void;
}

export type ProgressEvent =
  | { type: "listed"; total: number }
  | {
      type: "letter";
      index: number;
      total: number;
      letterId: string;
      status: "new" | "existing" | "error";
      error?: string;
      subject?: string;
    }
  | { type: "finished"; syncRunId: string; newLetters: number; extracted: number; failed: number };

export interface SyncSummary {
  syncRunId: string;
  totalListed: number;
  newLetters: number;
  extracted: number;
  failed: number;
}

/**
 * Full sync run: list → ingest → extract → normalize sender → group → auto-tag → render markdown.
 * Each letter is an isolated unit — a failure on one doesn't abort the rest.
 */
export async function runSync(opts: SyncOptions): Promise<SyncSummary> {
  const source = opts.source ?? getActiveSource();
  const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;

  const syncRunId = crypto.randomUUID();
  await db.insert(schema.syncRuns).values({
    id: syncRunId,
    source: source.name,
    status: "running",
  });

  try {
    const refs = await source.list({ since: opts.since });
    const slice = opts.limit ? refs.slice(0, opts.limit) : refs;
    opts.onProgress?.({ type: "listed", total: slice.length });

    let newCount = 0;
    let extractedCount = 0;
    let failedCount = 0;

    // Simple promise-pool with `concurrency` in flight.
    let i = 0;
    const total = slice.length;
    const inFlight = new Set<Promise<void>>();

    const runOne = async (index: number) => {
      const ref = slice[index];
      try {
        const ingest = await ingestLetter(source, ref);
        if (ingest.isNew) newCount++;

        // Only extract new or still-raw letters.
        const row = (await db
          .select()
          .from(schema.letters)
          .where(eq(schema.letters.id, ingest.letterId))
          .limit(1))[0];

        if (!row) throw new Error("letter row disappeared after ingest");

        if (row.status === "raw" || row.status === "error") {
          const ex = await extractLetter({
            pdfPath: row.pdfPath,
            apiFileName: row.epostFileName,
          });
          await persistExtraction(row, ex);
          extractedCount++;

          const refreshed = (await db
            .select()
            .from(schema.letters)
            .where(eq(schema.letters.id, row.id))
            .limit(1))[0];

          await applyAutoTags(refreshed);
          await applySenderDefaultTags(refreshed);
          await groupLetter(refreshed);
        } else {
          // Already extracted — only re-apply tags + grouping (cheap)
          await applyAutoTags(row);
          await applySenderDefaultTags(row);
          if (!row.groupId) await groupLetter(row);
        }

        opts.onProgress?.({
          type: "letter",
          index,
          total,
          letterId: ingest.letterId,
          status: ingest.isNew ? "new" : "existing",
        });
      } catch (err) {
        failedCount++;
        const message = err instanceof Error ? err.message : String(err);
        opts.onProgress?.({
          type: "letter",
          index,
          total,
          letterId: ref.externalId,
          status: "error",
          error: message,
        });
        // Best-effort mark as error
        await db
          .update(schema.letters)
          .set({ status: "error", extractionError: message.slice(0, 2000) })
          .where(eq(schema.letters.epostId, ref.externalId));
      }
    };

    while (i < slice.length || inFlight.size > 0) {
      while (inFlight.size < concurrency && i < slice.length) {
        const idx = i++;
        const p = runOne(idx).finally(() => inFlight.delete(p));
        inFlight.add(p);
      }
      if (inFlight.size > 0) await Promise.race(inFlight);
    }

    await renderMarkdownIndex();

    await db
      .update(schema.syncRuns)
      .set({
        status: "success",
        finishedAt: new Date(),
        newLetters: newCount,
        extractedLetters: extractedCount,
        failedLetters: failedCount,
      })
      .where(eq(schema.syncRuns.id, syncRunId));

    const summary: SyncSummary = {
      syncRunId,
      totalListed: slice.length,
      newLetters: newCount,
      extracted: extractedCount,
      failed: failedCount,
    };
    opts.onProgress?.({
      type: "finished",
      syncRunId,
      newLetters: newCount,
      extracted: extractedCount,
      failed: failedCount,
    });
    return summary;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.syncRuns)
      .set({
        status: "error",
        finishedAt: new Date(),
        errorMessage: message,
      })
      .where(eq(schema.syncRuns.id, syncRunId));
    throw err;
  }
}

/**
 * Write the extraction result onto the Letter row, handling:
 * - conversion of ISO date strings → Date objects
 * - extractionConflict flag against epostDocTypes
 * - search_text concatenation
 * - skipping fields the user has manually overridden (never overwrite userEditedFields)
 */
async function persistExtraction(
  row: Letter,
  ex: Awaited<ReturnType<typeof extractLetter>>,
): Promise<void> {
  const { result } = ex;
  const protectedSet = new Set(row.userEditedFields ?? []);

  const areaValue = result.area && result.area !== "" ? result.area : null;

  const desired = {
    letterDate: parseIsoDate(result.letterDate),
    subject: result.subject,
    senderRawName: result.senderName,
    amount: result.amount,
    currency: result.currency,
    dueDate: parseIsoDate(result.dueDate),
    reference: result.reference,
    iban: result.iban,
    qrIban: result.qrIban,
    documentType: result.documentType,
    area: areaValue,
    reminderLevel: result.reminderLevel,
    language: result.language,
    containsMultipleSections: result.containsMultipleSections,
    recommendedAction: result.recommendedAction,
    summary: result.summary,
  } as const;

  type Assignable = Partial<typeof schema.letters.$inferInsert>;
  const update: Assignable = {};
  for (const [field, value] of Object.entries(desired)) {
    if (protectedSet.has(field)) continue;
    (update as Record<string, unknown>)[field] = value as unknown;
  }

  // Conflict: API docTypes vs extracted documentType
  const apiTypes = (row.epostDocTypes ?? []).map((t) => t.toLowerCase());
  const conflict =
    apiTypes.length > 0 &&
    !apiTypes.some((t) => compatibleDocType(t, result.documentType));

  update.extractionModel = ex.modelUsed;
  update.extractionConfidence = result.confidence;
  update.extractionRawJson = result as never;
  update.extractionConflict = conflict;
  update.extractionError = null;
  update.pageCount = ex.preOcr.pageCount;
  update.status = "extracted";

  // First-time defaults for payment/task status. Never touch these on re-extract
  // (row.paymentStatus would already be "paid"/"open"/etc. from a previous pass or user action).
  const isFirstExtraction = row.status === "raw";
  if (isFirstExtraction && !protectedSet.has("paymentStatus")) {
    const isPaymentBearing =
      result.amount != null &&
      result.amount > 0 &&
      ["rechnung", "mahnung", "betreibung", "verfuegung"].includes(
        result.documentType,
      );
    if (isPaymentBearing) update.paymentStatus = "open";
  }
  if (isFirstExtraction && !protectedSet.has("taskStatus")) {
    if (result.documentType === "aufforderung") update.taskStatus = "open";
  }

  // Search text: concat raw OCR + extracted strings
  const searchParts = [
    ex.preOcr.rawText,
    result.subject,
    result.senderName,
    result.senderAddress,
    result.senderEmail,
    result.reference,
    result.iban,
    result.qrIban,
    result.summary,
    result.recommendedAction,
  ].filter(Boolean);
  update.searchText = searchParts.join("\n").slice(0, 60_000);

  await db
    .update(schema.letters)
    .set(update)
    .where(eq(schema.letters.id, row.id));

  // Resolve sender (uses updated senderRawName unless protected)
  const effectiveSenderName = protectedSet.has("senderRawName")
    ? row.senderRawName
    : result.senderName;
  if (effectiveSenderName) {
    const senderId = await resolveSender(
      effectiveSenderName,
      result.senderUid,
    );
    await db
      .update(schema.letters)
      .set({ senderId })
      .where(eq(schema.letters.id, row.id));
  }
}

function compatibleDocType(apiType: string, extracted: string): boolean {
  const a = apiType.toLowerCase();
  const e = extracted.toLowerCase();
  // ePost's documentTypes use categories like "Invoice", "HR" — we map them
  // loosely to our v2 enum so ePost says "Invoice" and Claude says "rechnung"
  // or "mahnung" → no conflict.
  if (a === "invoice" && ["rechnung", "mahnung", "betreibung"].includes(e)) return true;
  if (a === "hr" && ["kontoauszug", "aufforderung", "bestaetigung"].includes(e)) return true;
  return false;
}
