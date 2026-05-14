"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, schema } from "@/server/db";
import { renderMarkdownIndex } from "@/server/pipeline/markdown-index";

export async function togglePaymentStatus(letterId: string) {
  const [row] = await db
    .select({
      paymentStatus: schema.letters.paymentStatus,
      groupId: schema.letters.groupId,
    })
    .from(schema.letters)
    .where(eq(schema.letters.id, letterId))
    .limit(1);
  if (!row) throw new Error("Letter not found");

  const next = row.paymentStatus === "paid" ? "open" : "paid";
  await db
    .update(schema.letters)
    .set({
      paymentStatus: next,
      paidAt: next === "paid" ? new Date() : null,
    })
    .where(eq(schema.letters.id, letterId));

  // Update group status if all payments resolved
  if (row.groupId) {
    const siblings = await db
      .select({ paymentStatus: schema.letters.paymentStatus })
      .from(schema.letters)
      .where(eq(schema.letters.groupId, row.groupId));
    const anyOpen = siblings.some((s) => s.paymentStatus === "open");
    await db
      .update(schema.letterGroups)
      .set({
        status: anyOpen ? "open" : "resolved",
        resolvedAt: anyOpen ? null : new Date(),
      })
      .where(eq(schema.letterGroups.id, row.groupId));
  }

  await renderMarkdownIndex();
  revalidatePath("/", "layout");
}

export async function toggleTaskStatus(letterId: string) {
  const [row] = await db
    .select({ taskStatus: schema.letters.taskStatus })
    .from(schema.letters)
    .where(eq(schema.letters.id, letterId))
    .limit(1);
  if (!row) throw new Error("Letter not found");
  const next = row.taskStatus === "done" ? "open" : "done";
  await db
    .update(schema.letters)
    .set({
      taskStatus: next,
      doneAt: next === "done" ? new Date() : null,
    })
    .where(eq(schema.letters.id, letterId));
  await renderMarkdownIndex();
  revalidatePath("/", "layout");
}

const EDITABLE: ReadonlyArray<keyof typeof schema.letters.$inferSelect> = [
  "subject",
  "senderRawName",
  "amount",
  "currency",
  "dueDate",
  "letterDate",
  "reference",
  "iban",
  "qrIban",
  "documentType",
  "area",
  "reminderLevel",
  "notes",
  "recommendedAction",
  "summary",
] as const;

/** Update one field and mark it as user-edited so re-extract won't overwrite. */
export async function updateLetterField(
  letterId: string,
  field: string,
  value: string | null,
) {
  if (!EDITABLE.includes(field as never)) {
    throw new Error(`Field ${field} is not user-editable`);
  }
  const [row] = await db
    .select({ userEditedFields: schema.letters.userEditedFields })
    .from(schema.letters)
    .where(eq(schema.letters.id, letterId))
    .limit(1);
  if (!row) throw new Error("Letter not found");

  // Convert value based on field type
  let converted: unknown = value;
  if (value == null || value === "") {
    converted = null;
  } else if (field === "amount") {
    const num = Number(value);
    if (Number.isNaN(num)) throw new Error("amount must be a number");
    converted = num;
  } else if (field === "reminderLevel") {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0 || num > 4) {
      throw new Error("reminderLevel must be 0..4");
    }
    converted = num;
  } else if (field === "dueDate" || field === "letterDate") {
    converted = value ? new Date(value) : null;
  }

  const edited = new Set(row.userEditedFields ?? []);
  edited.add(field);

  await db
    .update(schema.letters)
    .set({
      [field]: converted,
      userEditedFields: [...edited],
    })
    .where(eq(schema.letters.id, letterId));

  await renderMarkdownIndex();
  revalidatePath("/", "layout");
}

export async function clearUserOverride(letterId: string, field: string) {
  const [row] = await db
    .select({ userEditedFields: schema.letters.userEditedFields })
    .from(schema.letters)
    .where(eq(schema.letters.id, letterId))
    .limit(1);
  if (!row) throw new Error("Letter not found");
  const remaining = (row.userEditedFields ?? []).filter((f) => f !== field);
  await db
    .update(schema.letters)
    .set({ userEditedFields: remaining })
    .where(eq(schema.letters.id, letterId));
  revalidatePath("/", "layout");
}
