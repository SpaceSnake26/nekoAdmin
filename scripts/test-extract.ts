/**
 * CLI: extract one or more PDF files and print the result.
 *
 * Usage:
 *   npm run test:extract -- data/fixtures/A_scanned_invoice.pdf
 *   npm run test:extract -- data/fixtures/*.pdf
 */
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: true });

import { extractLetter } from "../src/server/pipeline/extract";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npm run test:extract -- <pdf-path> [<pdf-path> ...]");
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY ist leer in .env.local. Trage zuerst deinen Key ein.",
    );
    process.exit(1);
  }

  for (const path of args) {
    console.log(`\n${"=".repeat(70)}\n${path}\n${"=".repeat(70)}`);
    const t0 = Date.now();
    try {
      const out = await extractLetter({ pdfPath: path });
      const seconds = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(JSON.stringify(out.result, null, 2));
      console.log(
        `\n[meta] model=${out.modelUsed}  pages=${out.preOcr.pageCount}  ocrChars=${out.preOcr.rawText.length}  ${seconds}s  ` +
          `tokens in=${out.inputTokens} out=${out.outputTokens} cacheRead=${out.cacheReadTokens} cacheWrite=${out.cacheCreationTokens}`,
      );
    } catch (err) {
      console.error(`FEHLER bei ${path}:`, err);
    }
  }
}

main();
