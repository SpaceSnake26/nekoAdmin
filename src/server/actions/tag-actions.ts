"use server";

import { and, eq, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, schema } from "@/server/db";

const TAG_NAME_PATTERN = /^[a-z0-9äöüé][a-z0-9äöüé _-]{0,40}$/i;

function normalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Add a tag to a letter, creating the tag if it doesn't exist yet.
 * Manual tags only — `auto:`-prefixed names are reserved for the auto-tag pipeline.
 */
export async function addTagToLetter(letterId: string, rawName: string) {
  const name = normalize(rawName);
  if (!name) throw new Error("Tag-Name darf nicht leer sein");
  if (name.startsWith("auto:")) {
    throw new Error("'auto:' ist reserviert für System-Tags");
  }
  if (!TAG_NAME_PATTERN.test(name)) {
    throw new Error("Ungültiger Tag-Name (nur Buchstaben/Zahlen/_/-/Leerzeichen)");
  }

  let [tag] = await db
    .select({ id: schema.tags.id, kind: schema.tags.kind })
    .from(schema.tags)
    .where(eq(schema.tags.name, name))
    .limit(1);
  if (!tag) {
    const id = crypto.randomUUID();
    await db.insert(schema.tags).values({
      id,
      name,
      kind: "manual",
    });
    tag = { id, kind: "manual" };
  }

  await db
    .insert(schema.letterTags)
    .values({ letterId, tagId: tag.id })
    .onConflictDoNothing();

  revalidatePath(`/letters/${letterId}`);
  revalidatePath("/inbox");
}

export async function removeTagFromLetter(letterId: string, tagId: string) {
  await db
    .delete(schema.letterTags)
    .where(
      and(
        eq(schema.letterTags.letterId, letterId),
        eq(schema.letterTags.tagId, tagId),
      ),
    );
  revalidatePath(`/letters/${letterId}`);
  revalidatePath("/inbox");
}

/** Suggest existing tag names matching the given prefix (manual only). */
export async function suggestTags(prefix: string, limit = 10) {
  const p = normalize(prefix);
  if (!p) {
    return db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
        color: schema.tags.color,
      })
      .from(schema.tags)
      .where(eq(schema.tags.kind, "manual"))
      .orderBy(schema.tags.name)
      .limit(limit);
  }
  return db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      color: schema.tags.color,
    })
    .from(schema.tags)
    .where(
      and(eq(schema.tags.kind, "manual"), like(schema.tags.name, `%${p}%`)),
    )
    .orderBy(schema.tags.name)
    .limit(limit);
}

/** Permanently delete a manual tag from the global catalog (and cascade-removes the M2M rows). */
export async function deleteTagGlobally(tagId: string) {
  const [tag] = await db
    .select({ kind: schema.tags.kind, name: schema.tags.name })
    .from(schema.tags)
    .where(eq(schema.tags.id, tagId))
    .limit(1);
  if (!tag) return;
  if (tag.kind === "auto") {
    throw new Error("Auto-Tags können nicht gelöscht werden");
  }
  await db.delete(schema.tags).where(eq(schema.tags.id, tagId));
  revalidatePath("/inbox");
  revalidatePath("/letters", "layout");
}

/**
 * Update a sender's defaultTags. These are auto-applied to every NEW letter
 * from this sender during the ingest pipeline.
 */
export async function setSenderDefaultTags(senderId: string, tagNames: string[]) {
  const cleaned = [...new Set(tagNames.map(normalize).filter(Boolean))];
  for (const name of cleaned) {
    if (!TAG_NAME_PATTERN.test(name)) {
      throw new Error(`Ungültiger Tag-Name: ${name}`);
    }
    if (name.startsWith("auto:")) {
      throw new Error(`'auto:' ist reserviert: ${name}`);
    }
  }
  await db
    .update(schema.senders)
    .set({ defaultTags: cleaned })
    .where(eq(schema.senders.id, senderId));
  revalidatePath("/senders");
}

/** Apply this sender's defaultTags to ALL of its existing letters. Idempotent. */
export async function applySenderDefaultTagsRetroactively(senderId: string) {
  const [sender] = await db
    .select({
      defaultTags: schema.senders.defaultTags,
    })
    .from(schema.senders)
    .where(eq(schema.senders.id, senderId))
    .limit(1);
  if (!sender || !sender.defaultTags || sender.defaultTags.length === 0) return 0;

  const letters = await db
    .select({ id: schema.letters.id })
    .from(schema.letters)
    .where(eq(schema.letters.senderId, senderId));

  let added = 0;
  for (const tagName of sender.defaultTags) {
    let [tag] = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(eq(schema.tags.name, tagName))
      .limit(1);
    if (!tag) {
      const id = crypto.randomUUID();
      await db.insert(schema.tags).values({ id, name: tagName, kind: "manual" });
      tag = { id };
    }
    for (const letter of letters) {
      const result = await db
        .insert(schema.letterTags)
        .values({ letterId: letter.id, tagId: tag.id })
        .onConflictDoNothing();
      // SQLite returns nothing meaningful here; just count tag * letters
    }
    added += letters.length;
  }
  revalidatePath("/inbox");
  revalidatePath("/senders");
  return added;
}
