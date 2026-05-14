import "server-only";

import { desc, sql } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { EmailEvent } from "@/server/db/schema";

export async function getEmailEventStats() {
  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      sends: sql<number>`count(*) filter (where event_type = 'send')`,
      opens: sql<number>`count(*) filter (where event_type = 'open')`,
      clicks: sql<number>`count(*) filter (where event_type = 'click')`,
      bounces: sql<number>`count(*) filter (where event_type = 'bounce')`,
      unsubscribes: sql<number>`count(*) filter (where event_type = 'unsubscribe')`,
    })
    .from(schema.emailEvents);
  return {
    total: Number(row?.total ?? 0),
    sends: Number(row?.sends ?? 0),
    opens: Number(row?.opens ?? 0),
    clicks: Number(row?.clicks ?? 0),
    bounces: Number(row?.bounces ?? 0),
    unsubscribes: Number(row?.unsubscribes ?? 0),
  };
}

export async function recentEmailEvents(limit = 20): Promise<EmailEvent[]> {
  return db
    .select()
    .from(schema.emailEvents)
    .orderBy(desc(schema.emailEvents.occurredAt))
    .limit(limit);
}
