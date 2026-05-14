/**
 * Run the full sync pipeline against the live ePost API.
 *
 * Usage:
 *   npm run sync                      # Oct 2025 → today, all letters
 *   npm run sync -- --limit 30        # only first 30
 *   npm run sync -- --since 2026-01-01
 */
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: true });

import { runSync } from "../src/server/pipeline/sync";

function parseArgs() {
  const args = process.argv.slice(2);
  let limit: number | undefined;
  let concurrency = 3;
  let since = new Date("2025-10-01T00:00:00Z");
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit") limit = Number(args[++i]);
    else if (args[i] === "--since") since = new Date(args[++i]);
    else if (args[i] === "--concurrency") concurrency = Number(args[++i]);
  }
  return { limit, since, concurrency };
}

async function main() {
  if (!process.env.EPOST_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    console.error("EPOST_API_KEY und ANTHROPIC_API_KEY müssen in .env.local sein");
    process.exit(1);
  }
  const { limit, since, concurrency } = parseArgs();
  const t0 = Date.now();

  console.log(
    `\nSync gegen ePost API ab ${since.toISOString().slice(0, 10)}${limit ? ` (limit ${limit})` : ""} (concurrency ${concurrency})\n`,
  );

  let lastTime = t0;
  await runSync({
    since,
    limit,
    concurrency,
    onProgress: (e) => {
      if (e.type === "listed") {
        console.log(`→ ${e.total} Briefe zu verarbeiten\n`);
      } else if (e.type === "letter") {
        const now = Date.now();
        const elapsed = ((now - t0) / 1000).toFixed(0);
        const dt = ((now - lastTime) / 1000).toFixed(1);
        lastTime = now;
        const pct = String(Math.round(((e.index + 1) / e.total) * 100)).padStart(3);
        const idx = String(e.index + 1).padStart(3);
        const prefix =
          e.status === "error" ? "✗" : e.status === "new" ? "+" : "=";
        const tail = e.error
          ? `  ERR: ${e.error.slice(0, 80)}`
          : "";
        console.log(
          `[${idx}/${e.total} ${pct}%] ${prefix} ${e.letterId.slice(0, 12)}  +${dt}s  total ${elapsed}s${tail}`,
        );
      } else if (e.type === "finished") {
        const total = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(
          `\n✓ Fertig in ${total}s — neu=${e.newLetters} extrahiert=${e.extracted} fehler=${e.failed}`,
        );
      }
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
