import { asc, eq } from "drizzle-orm";

import { db, schema } from "@/server/db";

export async function getLetterWithContext(id: string) {
  const [letter] = await db
    .select()
    .from(schema.letters)
    .where(eq(schema.letters.id, id))
    .limit(1);
  if (!letter) return null;

  const sender = letter.senderId
    ? (
        await db
          .select()
          .from(schema.senders)
          .where(eq(schema.senders.id, letter.senderId))
          .limit(1)
      )[0] ?? null
    : null;

  const group = letter.groupId
    ? (
        await db
          .select()
          .from(schema.letterGroups)
          .where(eq(schema.letterGroups.id, letter.groupId))
          .limit(1)
      )[0] ?? null
    : null;

  // All letters in the group, INCLUDING the current one — so the timeline
  // always shows the full chain and the user can see exactly where they are.
  const groupLetters = letter.groupId
    ? await db
        .select()
        .from(schema.letters)
        .where(eq(schema.letters.groupId, letter.groupId))
        .orderBy(asc(schema.letters.receivedAt))
    : [];

  const tags = await db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      kind: schema.tags.kind,
      color: schema.tags.color,
    })
    .from(schema.letterTags)
    .innerJoin(schema.tags, eq(schema.tags.id, schema.letterTags.tagId))
    .where(eq(schema.letterTags.letterId, id));

  return { letter, sender, group, groupLetters, tags };
}
