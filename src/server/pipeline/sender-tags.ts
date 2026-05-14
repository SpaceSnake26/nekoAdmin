import { eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { Letter } from "@/server/db/schema";

/**
 * Apply this letter's sender's defaultTags to it. Idempotent —
 * letter_tags has a composite PK so duplicate inserts are no-ops.
 * Tags missing from the global tag table are created on the fly.
 */
export async function applySenderDefaultTags(letter: Letter): Promise<void> {
  if (!letter.senderId) return;
  const [sender] = await db
    .select({ defaultTags: schema.senders.defaultTags })
    .from(schema.senders)
    .where(eq(schema.senders.id, letter.senderId))
    .limit(1);
  if (!sender || !sender.defaultTags || sender.defaultTags.length === 0) return;

  for (const tagName of sender.defaultTags) {
    let [tag] = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(eq(schema.tags.name, tagName))
      .limit(1);
    if (!tag) {
      const id = crypto.randomUUID();
      await db
        .insert(schema.tags)
        .values({ id, name: tagName, kind: "manual" })
        .onConflictDoNothing();
      tag = { id };
    }
    await db
      .insert(schema.letterTags)
      .values({ letterId: letter.id, tagId: tag.id })
      .onConflictDoNothing();
  }
}
