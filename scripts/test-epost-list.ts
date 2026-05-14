/**
 * CLI: smoke-test the EpostApiSource against the real API.
 * Lists letters since 2025-10-01, prints summary stats and downloads the
 * newest letter to verify the PDF download path works.
 *
 * Usage:
 *   npm run test:epost
 */
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: true });

import { writeFile } from "node:fs/promises";
import path from "node:path";

import { sha256 } from "../src/lib/hash";
import { getActiveSource } from "../src/server/sources";

async function main() {
  if (!process.env.EPOST_API_KEY) {
    console.error("EPOST_API_KEY missing in .env.local");
    process.exit(1);
  }
  const source = getActiveSource();

  const since = new Date("2025-10-01T00:00:00Z");
  console.log(`Listing letters from ${source.name} since ${since.toISOString()}...`);
  const t0 = Date.now();
  const refs = await source.list({ since });
  console.log(`  → ${refs.length} letters in ${Date.now() - t0}ms\n`);

  const titleCounts = new Map<string, number>();
  for (const r of refs) {
    const key = r.title ?? "(no title)";
    titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
  }
  console.log("Top letterTitles:");
  for (const [title, count] of [...titleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)) {
    console.log(`  ${String(count).padStart(4)} × ${title}`);
  }

  console.log("\nNewest 3:");
  for (const r of refs.slice(-3)) {
    console.log(
      `  ${r.receivedAt.toISOString().slice(0, 10)}  ${(r.title ?? "").padEnd(28).slice(0, 28)}  docTypes=${JSON.stringify(r.docTypes)}`,
    );
  }

  // Smoke-test PDF download
  const newest = refs.at(-1);
  if (newest) {
    console.log(`\nDownloading PDF of ${newest.externalId}...`);
    const t1 = Date.now();
    const pdf = await source.fetchPdf(newest.externalId);
    const hash = sha256(pdf);
    const out = path.resolve("data", "pdfs", `${newest.externalId}.pdf`);
    await writeFile(out, pdf);
    console.log(
      `  → ${pdf.length} bytes, sha256=${hash.slice(0, 16)}…, saved to ${out}, ${Date.now() - t1}ms`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
