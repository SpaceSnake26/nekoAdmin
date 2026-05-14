import { eq } from "drizzle-orm";

import { db, schema } from "@/server/db";

/** Normalize a sender name for matching — lowercase, strip legal suffixes, collapse whitespace. */
function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(
      /\b(ag|gmbh|sa|sarl|ltd|inc|stiftung|anstalt|verein|partner)\b/g,
      "",
    )
    .replace(/[^a-z0-9äöü ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve (or create) a Sender row for the given raw name + optional UID.
 *
 * Matching order:
 *   1. UID exact match (CHE-xxx.xxx.xxx is authoritative when present)
 *   2. Alias exact match on normalized form
 *   3. Canonical-name match on normalized form
 *   4. No match → create a new Sender with canonicalName = rawName
 */
export async function resolveSender(
  rawName: string,
  uid: string | null,
): Promise<string> {
  const trimmed = rawName.trim();
  if (!trimmed) throw new Error("resolveSender: rawName empty");

  // 1. UID authoritative
  if (uid) {
    const hit = await db
      .select({ id: schema.senders.id, aliases: schema.senders.aliases })
      .from(schema.senders)
      .where(eq(schema.senders.uid, uid))
      .limit(1);
    if (hit.length > 0) {
      await addAliasIfMissing(hit[0].id, hit[0].aliases, trimmed);
      return hit[0].id;
    }
  }

  // 2 + 3. name lookup
  const norm = normalizeForMatch(trimmed);
  const all = await db
    .select({
      id: schema.senders.id,
      canonicalName: schema.senders.canonicalName,
      aliases: schema.senders.aliases,
      uid: schema.senders.uid,
    })
    .from(schema.senders);

  for (const s of all) {
    const canonicalNorm = normalizeForMatch(s.canonicalName);
    if (canonicalNorm === norm) {
      await addAliasIfMissing(s.id, s.aliases, trimmed);
      if (uid && !s.uid) {
        await db
          .update(schema.senders)
          .set({ uid })
          .where(eq(schema.senders.id, s.id));
      }
      return s.id;
    }
    for (const alias of s.aliases ?? []) {
      if (normalizeForMatch(alias) === norm) {
        return s.id;
      }
    }
  }

  // 4. Create new
  const id = crypto.randomUUID();
  await db.insert(schema.senders).values({
    id,
    canonicalName: trimmed,
    aliases: [],
    uid: uid ?? null,
  });
  return id;
}

async function addAliasIfMissing(
  senderId: string,
  current: string[],
  alias: string,
): Promise<void> {
  if (current.some((a) => normalizeForMatch(a) === normalizeForMatch(alias))) {
    return;
  }
  await db
    .update(schema.senders)
    .set({ aliases: [...current, alias] })
    .where(eq(schema.senders.id, senderId));
}
