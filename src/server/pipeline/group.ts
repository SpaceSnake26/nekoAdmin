import { and, eq } from "drizzle-orm";

import { diffDays } from "@/lib/date";
import { db, schema } from "@/server/db";
import type { Letter } from "@/server/db/schema";

/**
 * 3-tier grouping heuristic.
 *
 * Tier 1 (auto-merge, high confidence):
 *   same senderId AND same reference (normalized)
 *   AND amount delta ≤ 5% (allows for Mahnspesen)
 *
 * Tier 2 (auto-merge with monotonic reminder check):
 *   same senderId
 *   AND (same qrIban OR same reference)
 *   AND |letterDate diff| ≤ 90 days
 *   AND candidate.reminderLevel ≥ groupMax.reminderLevel
 *
 * Tier 3 (manual — NOT auto-merged, just flagged elsewhere)
 *
 * Returns the groupId the letter was assigned to (creates one if no match).
 */
export async function groupLetter(letter: Letter): Promise<string> {
  if (!letter.senderId) {
    return createStandaloneGroup(letter);
  }

  // Load candidate siblings of the same sender
  const siblings = await db
    .select()
    .from(schema.letters)
    .where(eq(schema.letters.senderId, letter.senderId));

  const normalizedRef = letter.reference
    ? normalizeRef(letter.reference)
    : null;

  // Build a map: groupId → its letters (only groups with ≥1 non-self letter)
  const byGroup = new Map<string, Letter[]>();
  for (const s of siblings) {
    if (s.id === letter.id || !s.groupId) continue;
    const arr = byGroup.get(s.groupId) ?? [];
    arr.push(s);
    byGroup.set(s.groupId, arr);
  }

  // Tier 1
  for (const [groupId, letters] of byGroup.entries()) {
    for (const other of letters) {
      if (
        normalizedRef &&
        other.reference &&
        normalizeRef(other.reference) === normalizedRef &&
        amountWithinPct(letter.amount, other.amount, 5)
      ) {
        await attachToGroup(letter, groupId);
        return groupId;
      }
    }
  }

  // Tier 2
  for (const [groupId, letters] of byGroup.entries()) {
    for (const other of letters) {
      const sharesRef =
        normalizedRef &&
        other.reference &&
        normalizeRef(other.reference) === normalizedRef;
      const sharesIban =
        letter.qrIban && other.qrIban && letter.qrIban === other.qrIban;
      if (!sharesRef && !sharesIban) continue;

      const da = letter.letterDate ?? letter.receivedAt;
      const db_ = other.letterDate ?? other.receivedAt;
      if (Math.abs(diffDays(da, db_)) > 90) continue;

      const maxReminder = Math.max(
        ...letters.map((l) => l.reminderLevel ?? 0),
      );
      if ((letter.reminderLevel ?? 0) < maxReminder) continue;

      await attachToGroup(letter, groupId);
      return groupId;
    }
  }

  return createStandaloneGroup(letter);
}

async function attachToGroup(letter: Letter, groupId: string): Promise<void> {
  await db
    .update(schema.letters)
    .set({ groupId })
    .where(eq(schema.letters.id, letter.id));

  // If the group was resolved and a new reminder arrives, re-open it.
  if ((letter.reminderLevel ?? 0) > 0 && letter.paymentStatus !== "paid") {
    await db
      .update(schema.letterGroups)
      .set({ status: "open", resolvedAt: null })
      .where(
        and(
          eq(schema.letterGroups.id, groupId),
          eq(schema.letterGroups.status, "resolved"),
        ),
      );
  }
}

async function createStandaloneGroup(letter: Letter): Promise<string> {
  const groupId = crypto.randomUUID();
  const title = letter.subject ?? letter.epostTitle ?? "Brief";
  await db.insert(schema.letterGroups).values({
    id: groupId,
    senderId: letter.senderId ?? null,
    reference: letter.reference ?? null,
    amount: letter.amount ?? null,
    currency: letter.currency ?? "CHF",
    title,
    status: letter.paymentStatus === "paid" ? "resolved" : "open",
    resolvedAt: letter.paidAt ?? null,
  });
  await db
    .update(schema.letters)
    .set({ groupId })
    .where(eq(schema.letters.id, letter.id));
  return groupId;
}

function normalizeRef(ref: string): string {
  return ref.replace(/\s+/g, "").toLowerCase();
}

function amountWithinPct(
  a: number | null,
  b: number | null,
  pct: number,
): boolean {
  if (a == null || b == null) return false;
  if (a === b) return true;
  const base = Math.max(Math.abs(a), Math.abs(b));
  if (base === 0) return true;
  return (Math.abs(a - b) / base) * 100 <= pct;
}
