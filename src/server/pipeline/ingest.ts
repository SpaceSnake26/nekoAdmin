import { writeFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";

import { sha256 } from "@/lib/hash";
import { db, schema } from "@/server/db";
import type { SourceLetterRef } from "@/server/sources";
import type { LetterSource } from "@/server/sources";

import { generateThumbnail } from "./thumbnail";

export interface IngestResult {
  letterId: string;
  isNew: boolean;
  pdfPath: string;
  pdfHash: string;
}

const PDFS_DIR = path.resolve(process.cwd(), "data", "pdfs");

/**
 * Download the PDF for a source ref, dedup by sha256, and upsert the Letter row.
 * Idempotent — running twice on the same ref is safe.
 */
export async function ingestLetter(
  source: LetterSource,
  ref: SourceLetterRef,
): Promise<IngestResult> {
  // Skip early if we already have this epostId.
  const existingByExternal = await db
    .select({ id: schema.letters.id, pdfPath: schema.letters.pdfPath, pdfHash: schema.letters.pdfHash })
    .from(schema.letters)
    .where(eq(schema.letters.epostId, ref.externalId))
    .limit(1);
  if (existingByExternal.length > 0) {
    return {
      letterId: existingByExternal[0].id,
      isNew: false,
      pdfPath: existingByExternal[0].pdfPath,
      pdfHash: existingByExternal[0].pdfHash,
    };
  }

  const pdfBytes = await source.fetchPdf(ref.externalId);
  const pdfHash = sha256(pdfBytes);

  // Content-level dedup — another source or a re-run might have the same PDF already.
  const existingByHash = await db
    .select({ id: schema.letters.id, pdfPath: schema.letters.pdfPath })
    .from(schema.letters)
    .where(eq(schema.letters.pdfHash, pdfHash))
    .limit(1);
  if (existingByHash.length > 0) {
    // Backfill epostId on the existing row so future syncs short-circuit.
    await db
      .update(schema.letters)
      .set({ epostId: ref.externalId })
      .where(eq(schema.letters.id, existingByHash[0].id));
    return {
      letterId: existingByHash[0].id,
      isNew: false,
      pdfPath: existingByHash[0].pdfPath,
      pdfHash,
    };
  }

  const letterId = crypto.randomUUID();
  const pdfPath = path.join(PDFS_DIR, `${letterId}.pdf`);
  await writeFile(pdfPath, pdfBytes);

  await db.insert(schema.letters).values({
    id: letterId,
    source: source.name,
    epostId: ref.externalId,
    epostTitle: ref.title,
    epostFileName: ref.fileName,
    epostDocTypes: ref.docTypes ?? [],
    apiSnapshot: ref.rawSnapshot as never,
    pdfPath,
    pdfHash,
    receivedAt: ref.receivedAt,
    status: "raw",
    userEditedFields: [],
  });

  // Best-effort thumbnail generation — never block ingest if it fails.
  try {
    await generateThumbnail(pdfPath, letterId);
  } catch (err) {
    console.warn(
      `Thumbnail-Generierung fehlgeschlagen für ${letterId}: ${(err as Error).message}`,
    );
  }

  return { letterId, isNew: true, pdfPath, pdfHash };
}
