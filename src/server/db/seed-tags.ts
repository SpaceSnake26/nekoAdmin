import { db, schema } from "./index";

interface SeedTag {
  name: string;
  color: string;
}

/**
 * Predefined manual tags users can apply to letters.
 * Auto-tags (auto:*) are produced by the auto-tag pipeline and not seeded here.
 */
const DEFAULT_MANUAL_TAGS: SeedTag[] = [
  { name: "wichtig", color: "rose" },
  { name: "urgent", color: "rose" },
  { name: "warten-auf", color: "amber" },
  { name: "prüfen", color: "blue" },
  { name: "an-treuhänder", color: "violet" },
  { name: "archiv", color: "stone" },
  { name: "kunde", color: "teal" },
  { name: "lieferant", color: "cyan" },
  { name: "privat", color: "pink" },
];

export async function seedManualTagsIfEmpty(): Promise<void> {
  const existing = await db
    .select({ name: schema.tags.name })
    .from(schema.tags);
  const have = new Set(existing.map((e) => e.name));
  const toInsert = DEFAULT_MANUAL_TAGS.filter((t) => !have.has(t.name));
  if (toInsert.length === 0) return;
  await db.insert(schema.tags).values(
    toInsert.map((t) => ({
      id: crypto.randomUUID(),
      name: t.name,
      color: t.color,
      kind: "manual",
    })),
  );
}
