import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: true });

import { seedManualTagsIfEmpty } from "../src/server/db/seed-tags";

async function main() {
  await seedManualTagsIfEmpty();
  console.log("✓ Manual tag catalog seeded (if missing)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
