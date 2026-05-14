/**
 * One-shot: generate JPEG thumbnails for every letter that doesn't have one yet.
 * Safe to re-run — generateThumbnail() skips existing files.
 *
 *   npm run backfill:thumbnails
 */
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: true });

import { db, schema } from "../src/server/db";
import { generateThumbnail } from "../src/server/pipeline/thumbnail";

async function main() {
  const letters = await db
    .select({ id: schema.letters.id, pdfPath: schema.letters.pdfPath })
    .from(schema.letters);
  console.log(`→ ${letters.length} Briefe werden geprüft…\n`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const start = Date.now();

  for (let i = 0; i < letters.length; i++) {
    const l = letters[i];
    const idx = String(i + 1).padStart(3);
    try {
      const res = await generateThumbnail(l.pdfPath, l.id);
      if (res.skipped) {
        skipped++;
      } else {
        generated++;
        process.stdout.write(
          `[${idx}/${letters.length}] ${l.id.slice(0, 8)}  ${(res.bytes / 1024).toFixed(1)} KB\n`,
        );
      }
    } catch (err) {
      failed++;
      console.log(
        `[${idx}/${letters.length}] ${l.id.slice(0, 8)}  FEHLER: ${(err as Error).message}`,
      );
    }
  }

  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\n✓ Fertig in ${secs}s — ${generated} neu · ${skipped} übersprungen · ${failed} Fehler`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
