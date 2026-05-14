import "server-only";

import { asc, eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { KanbanCard, KanbanColumn } from "@/server/db/schema";

export interface KanbanCardWithRefs extends KanbanCard {
  leadPharmacyName: string | null;
  leadCity: string | null;
  eventTitle: string | null;
}

export interface KanbanBoard {
  columns: Array<KanbanColumn & { cards: KanbanCardWithRefs[] }>;
}

export async function getKanbanBoard(): Promise<KanbanBoard> {
  const columns = await db
    .select()
    .from(schema.kanbanColumns)
    .orderBy(asc(schema.kanbanColumns.sortOrder));

  const rows = await db
    .select({
      card: schema.kanbanCards,
      pharmacyName: schema.leads.pharmacyName,
      city: schema.leads.city,
      eventTitle: schema.itEvents.title,
    })
    .from(schema.kanbanCards)
    .leftJoin(schema.leads, eq(schema.leads.id, schema.kanbanCards.leadId))
    .leftJoin(schema.itEvents, eq(schema.itEvents.id, schema.kanbanCards.eventId))
    .orderBy(asc(schema.kanbanCards.sortOrder));

  const byColumn = new Map<string, KanbanCardWithRefs[]>();
  for (const r of rows) {
    const c: KanbanCardWithRefs = {
      ...r.card,
      leadPharmacyName: r.pharmacyName,
      leadCity: r.city,
      eventTitle: r.eventTitle,
    };
    const list = byColumn.get(c.columnId) ?? [];
    list.push(c);
    byColumn.set(c.columnId, list);
  }

  return {
    columns: columns.map((col) => ({
      ...col,
      cards: byColumn.get(col.id) ?? [],
    })),
  };
}
