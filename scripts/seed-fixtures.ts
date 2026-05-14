/**
 * Seed the DB with the 6 fixture letters by running them through the full sync
 * pipeline (ingest → extract → sender → group → auto-tag → markdown).
 *
 * Safe to re-run — idempotent on pdfHash + epostId.
 *
 * Usage:
 *   npm run seed:fixtures
 */
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: true });

import { runSync } from "../src/server/pipeline/sync";
import { FixturesSource } from "../src/server/sources/fixtures";

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY fehlt in .env.local");
    process.exit(1);
  }

  const source = new FixturesSource();
  console.log("Seeding DB from 6 fixture letters...\n");

  const summary = await runSync({
    source,
    since: new Date("2024-01-01T00:00:00Z"),
    concurrency: 3,
    onProgress: (e) => {
      if (e.type === "listed") {
        console.log(`→ ${e.total} letters to process`);
      } else if (e.type === "letter") {
        const pct = Math.round(((e.index + 1) / e.total) * 100);
        const prefix = e.status === "error" ? "✗" : e.status === "new" ? "+" : "=";
        console.log(
          `  [${String(e.index + 1).padStart(2)}/${e.total}] ${prefix} ${e.letterId.slice(0, 12)}${e.error ? "  ERR: " + e.error : ""}  (${pct}%)`,
        );
      } else if (e.type === "finished") {
        console.log(
          `\n✓ Sync done. new=${e.newLetters} extracted=${e.extracted} failed=${e.failed}`,
        );
      }
    },
  });

  console.log(`\nSync run ${summary.syncRunId.slice(0, 8)} complete.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
