import "server-only";

import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { EventLocation, ItEvent } from "@/server/db/schema";

export interface EventsFilters {
  location?: EventLocation | null;
  past?: boolean;
}

export async function listEvents(
  filters: EventsFilters = {},
): Promise<ItEvent[]> {
  const conds = [];
  const now = new Date();
  if (filters.past) {
    conds.push(lt(schema.itEvents.startsAt, now));
  } else {
    conds.push(gte(schema.itEvents.startsAt, now));
  }
  if (filters.location) {
    conds.push(eq(schema.itEvents.locationCode, filters.location));
  }
  return db
    .select()
    .from(schema.itEvents)
    .where(and(...conds))
    .orderBy(filters.past ? desc(schema.itEvents.startsAt) : asc(schema.itEvents.startsAt));
}

export async function getEventCounts() {
  const now = new Date();
  const rows = await db
    .select({
      locationCode: schema.itEvents.locationCode,
      upcoming: sql<number>`count(*) filter (where starts_at >= ${Math.floor(now.getTime() / 1000)})`,
      past: sql<number>`count(*) filter (where starts_at < ${Math.floor(now.getTime() / 1000)})`,
    })
    .from(schema.itEvents)
    .groupBy(schema.itEvents.locationCode);
  const result: Record<string, { upcoming: number; past: number }> = {};
  for (const r of rows) {
    result[r.locationCode] = {
      upcoming: Number(r.upcoming),
      past: Number(r.past),
    };
  }
  return result;
}
