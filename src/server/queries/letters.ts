import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";

import { db, schema } from "@/server/db";

export type SortKey =
  | "receivedAt"
  | "letterDate"
  | "dueDate"
  | "amount"
  | "sender"
  | "subject";

export interface InboxFilters {
  search?: string;
  documentType?: string;
  area?: string;
  paymentStatus?: string;
  senderId?: string;
  /** Tag names that all must be present on the letter (AND semantics). */
  tags?: string[];
  sort: SortKey;
  direction: "asc" | "desc";
}

export async function listInbox(filters: InboxFilters) {
  const where = [];
  if (filters.documentType && filters.documentType !== "all") {
    where.push(eq(schema.letters.documentType, filters.documentType));
  }
  if (filters.area && filters.area !== "all") {
    if (filters.area === "none") {
      where.push(sql`${schema.letters.area} IS NULL`);
    } else {
      where.push(eq(schema.letters.area, filters.area));
    }
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    where.push(eq(schema.letters.paymentStatus, filters.paymentStatus));
  }
  if (filters.senderId) {
    where.push(eq(schema.letters.senderId, filters.senderId));
  }
  if (filters.search && filters.search.length >= 2) {
    const pat = `%${filters.search.toLowerCase()}%`;
    where.push(
      or(
        like(sql`lower(${schema.letters.subject})`, pat),
        like(sql`lower(${schema.letters.senderRawName})`, pat),
        like(sql`lower(${schema.letters.reference})`, pat),
        like(sql`lower(${schema.letters.searchText})`, pat),
      )!,
    );
  }
  // Tag filter — AND semantics via correlated EXISTS subqueries
  if (filters.tags && filters.tags.length > 0) {
    for (const tagName of filters.tags) {
      where.push(
        sql`EXISTS (SELECT 1 FROM letter_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.letter_id = ${schema.letters.id} AND t.name = ${tagName})`,
      );
    }
  }

  const sortCol = {
    receivedAt: schema.letters.receivedAt,
    letterDate: schema.letters.letterDate,
    dueDate: schema.letters.dueDate,
    amount: schema.letters.amount,
    sender: schema.letters.senderRawName,
    subject: schema.letters.subject,
  }[filters.sort];

  const orderer = filters.direction === "asc" ? asc : desc;

  const rows = await db
    .select({
      id: schema.letters.id,
      subject: schema.letters.subject,
      senderRawName: schema.letters.senderRawName,
      canonicalName: schema.senders.canonicalName,
      receivedAt: schema.letters.receivedAt,
      letterDate: schema.letters.letterDate,
      dueDate: schema.letters.dueDate,
      amount: schema.letters.amount,
      currency: schema.letters.currency,
      documentType: schema.letters.documentType,
      area: schema.letters.area,
      reminderLevel: schema.letters.reminderLevel,
      paymentStatus: schema.letters.paymentStatus,
      taskStatus: schema.letters.taskStatus,
      reference: schema.letters.reference,
      groupId: schema.letters.groupId,
      extractionConfidence: schema.letters.extractionConfidence,
      extractionConflict: schema.letters.extractionConflict,
    })
    .from(schema.letters)
    .leftJoin(schema.senders, eq(schema.senders.id, schema.letters.senderId))
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(orderer(sortCol));

  // Attach tags in a single join query
  const ids = rows.map((r) => r.id);
  const tagRows = ids.length
    ? await db
        .select({
          letterId: schema.letterTags.letterId,
          name: schema.tags.name,
          kind: schema.tags.kind,
        })
        .from(schema.letterTags)
        .innerJoin(schema.tags, eq(schema.tags.id, schema.letterTags.tagId))
        .where(inArray(schema.letterTags.letterId, ids))
    : [];
  const tagsById = new Map<string, { name: string; kind: string }[]>();
  for (const t of tagRows) {
    const arr = tagsById.get(t.letterId) ?? [];
    arr.push({ name: t.name, kind: t.kind });
    tagsById.set(t.letterId, arr);
  }

  return rows.map((r) => ({ ...r, tags: tagsById.get(r.id) ?? [] }));
}

export async function getDocumentTypeCounts() {
  return db
    .select({
      documentType: schema.letters.documentType,
      count: sql<number>`count(*)`,
    })
    .from(schema.letters)
    .groupBy(schema.letters.documentType);
}

export async function getAreaCounts() {
  return db
    .select({
      area: schema.letters.area,
      count: sql<number>`count(*)`,
    })
    .from(schema.letters)
    .groupBy(schema.letters.area);
}

/**
 * Returns the manual tags used at least once across all letters, with
 * usage counts. Used to populate the inbox tag-filter chips.
 */
export async function getTagUsage() {
  return db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      kind: schema.tags.kind,
      color: schema.tags.color,
      count: sql<number>`(select count(*) from letter_tags where letter_tags.tag_id = tags.id)`,
    })
    .from(schema.tags)
    .where(eq(schema.tags.kind, "manual"))
    .orderBy(schema.tags.name);
}

type InboxRow = Awaited<ReturnType<typeof listInbox>>[number];

export interface Bucket {
  hero: InboxRow;
  siblings: InboxRow[]; // oldest first
  realGroupId: string | null;
  groupTitle?: string;
  groupStatus?: "open" | "resolved";
  latestReceivedAt: Date;
}

/**
 * Group letters by groupId into buckets. Letters without a groupId become
 * solo buckets (bucketKey = "solo:<letterId>") so they still show up.
 *
 * Buckets are sorted by their newest letter's receivedAt, DESC.
 * Siblings within a bucket are ordered oldest-first (left→right timeline).
 */
export async function listInboxGrouped(filters: InboxFilters): Promise<Bucket[]> {
  const letters = await listInbox(filters);

  const byKey = new Map<string, InboxRow[]>();
  for (const l of letters) {
    const key = l.groupId ?? `solo:${l.id}`;
    const arr = byKey.get(key);
    if (arr) arr.push(l);
    else byKey.set(key, [l]);
  }

  // Fetch group metadata for the real (non-solo) multi-letter buckets
  const realGroupIds = [...byKey.keys()].filter((k) => !k.startsWith("solo:"));
  const groupMeta = new Map<string, { title: string; status: string }>();
  if (realGroupIds.length > 0) {
    const rows = await db
      .select({
        id: schema.letterGroups.id,
        title: schema.letterGroups.title,
        status: schema.letterGroups.status,
      })
      .from(schema.letterGroups)
      .where(inArray(schema.letterGroups.id, realGroupIds));
    for (const r of rows) {
      groupMeta.set(r.id, { title: r.title, status: r.status });
    }
  }

  const buckets: Bucket[] = [];
  for (const [key, ls] of byKey.entries()) {
    const sortedDesc = [...ls].sort(
      (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime(),
    );
    const hero = sortedDesc[0];
    const siblings = sortedDesc.slice(1).reverse(); // oldest first
    const realGroupId = key.startsWith("solo:") ? null : key;
    const meta = realGroupId ? groupMeta.get(realGroupId) : undefined;
    buckets.push({
      hero,
      siblings,
      realGroupId,
      groupTitle: meta?.title,
      groupStatus: meta?.status === "resolved" ? "resolved" : "open",
      latestReceivedAt: hero.receivedAt,
    });
  }

  buckets.sort(
    (a, b) => b.latestReceivedAt.getTime() - a.latestReceivedAt.getTime(),
  );
  return buckets;
}
