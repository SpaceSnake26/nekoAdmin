"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/server/db";
import type { NewKanbanCard } from "@/server/db/schema";

const createCardSchema = z.object({
  columnId: z.string().min(1),
  title: z.string().min(1, "Titel ist erforderlich"),
  notes: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  eventId: z.string().nullable().optional(),
  campaignTag: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function createKanbanCard(input: unknown) {
  const parsed = createCardSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Eingabe ungültig",
    );
  }
  const d = parsed.data;

  const [{ next }] = await db
    .select({
      next: sql<number>`coalesce(max(sort_order), 0) + 10`,
    })
    .from(schema.kanbanCards)
    .where(eq(schema.kanbanCards.columnId, d.columnId));

  const values: NewKanbanCard = {
    columnId: d.columnId,
    title: d.title,
    notes: d.notes ?? null,
    leadId: d.leadId || null,
    eventId: d.eventId || null,
    campaignTag: d.campaignTag || null,
    assignee: d.assignee || null,
    dueDate: d.dueDate ? new Date(d.dueDate) : null,
    sortOrder: Number(next ?? 10),
  };
  const [row] = await db.insert(schema.kanbanCards).values(values).returning();
  revalidatePath("/kanban");
  return row;
}

export async function moveKanbanCard(
  cardId: string,
  targetColumnId: string,
) {
  const [{ next }] = await db
    .select({
      next: sql<number>`coalesce(max(sort_order), 0) + 10`,
    })
    .from(schema.kanbanCards)
    .where(eq(schema.kanbanCards.columnId, targetColumnId));

  await db
    .update(schema.kanbanCards)
    .set({
      columnId: targetColumnId,
      sortOrder: Number(next ?? 10),
      updatedAt: new Date(),
    })
    .where(eq(schema.kanbanCards.id, cardId));
  revalidatePath("/kanban");
}

export async function deleteKanbanCard(cardId: string) {
  await db.delete(schema.kanbanCards).where(eq(schema.kanbanCards.id, cardId));
  revalidatePath("/kanban");
}

const updateCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Titel ist erforderlich"),
  notes: z.string().nullable().optional(),
  columnId: z.string().min(1),
  leadId: z.string().nullable().optional(),
  eventId: z.string().nullable().optional(),
  campaignTag: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function updateKanbanCard(input: unknown) {
  const parsed = updateCardSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Eingabe ungültig");
  }
  const d = parsed.data;
  await db
    .update(schema.kanbanCards)
    .set({
      title: d.title,
      notes: d.notes ?? null,
      columnId: d.columnId,
      leadId: d.leadId || null,
      eventId: d.eventId || null,
      campaignTag: d.campaignTag || null,
      assignee: d.assignee || null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.kanbanCards.id, d.id));
  revalidatePath("/kanban");
}

// Apply a target order for one column: cardIds[0] is on top (most urgent).
// Cards from other columns are reassigned to targetColumnId.
export async function reorderColumn(
  targetColumnId: string,
  cardIds: string[],
) {
  if (cardIds.length === 0) return;
  const now = new Date();
  await db.transaction(async (tx) => {
    for (let i = 0; i < cardIds.length; i++) {
      await tx
        .update(schema.kanbanCards)
        .set({
          columnId: targetColumnId,
          sortOrder: i * 10,
          updatedAt: now,
        })
        .where(eq(schema.kanbanCards.id, cardIds[i]));
    }
  });
  revalidatePath("/kanban");
}
