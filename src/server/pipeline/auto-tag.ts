import { and, eq } from "drizzle-orm";

import { diffDays } from "@/lib/date";
import { db, schema } from "@/server/db";
import type { Letter } from "@/server/db/schema";

/**
 * Ensure a set of `auto:<name>` tags exist on the letter, and remove any other
 * auto-tags that no longer apply. Manual tags (kind="manual") are left alone.
 */
export async function applyAutoTags(letter: Letter): Promise<void> {
  const desired = computeAutoTagNames(letter);

  // Ensure tag rows exist (by name), gather their IDs.
  const tagIds: Record<string, string> = {};
  for (const name of desired) {
    const existing = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(eq(schema.tags.name, name))
      .limit(1);
    if (existing.length > 0) {
      tagIds[name] = existing[0].id;
    } else {
      const id = crypto.randomUUID();
      await db
        .insert(schema.tags)
        .values({ id, name, kind: "auto" })
        .onConflictDoNothing();
      const reread = await db
        .select({ id: schema.tags.id })
        .from(schema.tags)
        .where(eq(schema.tags.name, name))
        .limit(1);
      tagIds[name] = reread[0].id;
    }
  }

  // Existing letter_tags joined with tag.kind
  const existing = await db
    .select({
      letterId: schema.letterTags.letterId,
      tagId: schema.letterTags.tagId,
      name: schema.tags.name,
      kind: schema.tags.kind,
    })
    .from(schema.letterTags)
    .innerJoin(schema.tags, eq(schema.tags.id, schema.letterTags.tagId))
    .where(eq(schema.letterTags.letterId, letter.id));

  const existingAutoNames = new Set(
    existing.filter((e) => e.kind === "auto").map((e) => e.name),
  );

  // Remove auto-tags no longer desired
  for (const row of existing) {
    if (row.kind !== "auto") continue;
    if (!desired.has(row.name)) {
      await db
        .delete(schema.letterTags)
        .where(
          and(
            eq(schema.letterTags.letterId, letter.id),
            eq(schema.letterTags.tagId, row.tagId),
          ),
        );
    }
  }

  // Add missing ones
  for (const name of desired) {
    if (existingAutoNames.has(name)) continue;
    await db
      .insert(schema.letterTags)
      .values({ letterId: letter.id, tagId: tagIds[name] })
      .onConflictDoNothing();
  }
}

function computeAutoTagNames(letter: Letter): Set<string> {
  const names = new Set<string>();
  const now = new Date();

  if (letter.dueDate) {
    const daysUntil = diffDays(now, letter.dueDate);
    if (letter.paymentStatus !== "paid") {
      if (daysUntil < 0) {
        names.add("auto:überfällig");
      } else if (daysUntil <= 7) {
        names.add("auto:fällig-bald");
      }
    }
  }

  if ((letter.reminderLevel ?? 0) > 0) names.add("auto:mahnung");
  if ((letter.reminderLevel ?? 0) >= 4) names.add("auto:betreibung");
  if (
    letter.extractionConfidence != null &&
    letter.extractionConfidence < 0.85
  ) {
    names.add("auto:ki-unsicher");
  }
  if (letter.extractionConflict) names.add("auto:konflikt");
  if (letter.containsMultipleSections) names.add("auto:mehrteilig");

  // Area-based tags are redundant now that area is a first-class filter field,
  // so we only emit tags that carry orthogonal meaning (not duplicating the area).
  if (letter.documentType === "werbung") names.add("auto:werbung");
  if (letter.documentType === "aufforderung") names.add("auto:aufgabe");

  return names;
}
