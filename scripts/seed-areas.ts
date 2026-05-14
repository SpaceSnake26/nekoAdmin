import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: true });

import { seedAreasIfEmpty } from "../src/server/db/seed-areas";

async function main() {
  await seedAreasIfEmpty();
  console.log("✓ Areas seeded (if empty)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
