/**
 * Second-pass import for the ePost tags we skipped on the first pass:
 * URGENT, Werbung, Betreibungsregisterauszug, AKSO. These map to manual tags
 * (not status fields) so the user can still filter and find them in the inbox.
 *
 * Run after npm run import:epost-tags.
 */
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: true });

import { eq } from "drizzle-orm";

import { db, schema } from "../src/server/db";

interface Entry {
  epostId: string;
  rawTags: string[];
}

const TABLE: Entry[] = [
  { epostId: "691dcd87a7f7dd033c4d8336", rawTags: ["TODO", "URGENT"] },
  { epostId: "66a8d60b9812ff26f34c530e", rawTags: ["TODO", "URGENT"] },
  { epostId: "66992002e966593c916145c2", rawTags: ["TODO", "URGENT"] },
  { epostId: "66db4a3dceb33179f20307c2", rawTags: ["Werbung"] },
  { epostId: "6644b913a16f420066e275aa", rawTags: ["Betreibungsregisterauszug"] },
  { epostId: "664398a7fc83b80f7aaaad60", rawTags: ["AKSO"] },
];

// Map rawTag → our manual tag name
const TAG_MAP: Record<string, string> = {
  URGENT: "urgent",
  urgent: "urgent",
  Werbung: "werbung-manuell",
  Betreibungsregisterauszug: "betreibungsregister",
  AKSO: "akso",
};

async function ensureTag(name: string): Promise<string> {
  const [existing] = await db
    .select({ id: schema.tags.id })
    .from(schema.tags)
    .where(eq(schema.tags.name, name))
    .limit(1);
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  await db.insert(schema.tags).values({ id, name, kind: "manual" });
  return id;
}

async function main() {
  let added = 0;
  let notFound = 0;

  for (const entry of TABLE) {
    const [letter] = await db
      .select({ id: schema.letters.id })
      .from(schema.letters)
      .where(eq(schema.letters.epostId, entry.epostId))
      .limit(1);
    if (!letter) {
      notFound++;
      continue;
    }
    for (const raw of entry.rawTags) {
      const name = TAG_MAP[raw];
      if (!name) continue; // skip TODO etc. — already handled
      const tagId = await ensureTag(name);
      const result = await db
        .insert(schema.letterTags)
        .values({ letterId: letter.id, tagId })
        .onConflictDoNothing();
      added++;
    }
  }

  console.log(`✓ ${added} Tags angewendet auf ${TABLE.length - notFound} Briefe`);
  if (notFound > 0) console.log(`  ${notFound} Briefe nicht gefunden`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
