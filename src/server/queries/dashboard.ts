import { and, desc, eq, gt, isNotNull, lt, sql } from "drizzle-orm";

import { db, schema } from "@/server/db";

export async function getDashboardStats() {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86_400_000);
  const in30 = new Date(now.getTime() + 30 * 86_400_000);

  const [totals] = await db
    .select({
      letterCount: sql<number>`count(*)`,
      openCount: sql<number>`count(*) filter (where payment_status = 'open')`,
      openAmount: sql<number>`coalesce(sum(case when payment_status = 'open' then amount else 0 end), 0)`,
      overdueCount: sql<number>`count(*) filter (where payment_status = 'open' and due_date < ${now.getTime() / 1000})`,
      overdueAmount: sql<number>`coalesce(sum(case when payment_status = 'open' and due_date < ${now.getTime() / 1000} then amount else 0 end), 0)`,
      dueSoonCount: sql<number>`count(*) filter (where payment_status = 'open' and due_date >= ${now.getTime() / 1000} and due_date < ${in7.getTime() / 1000})`,
      openTaskCount: sql<number>`count(*) filter (where task_status = 'open')`,
      newLast30: sql<number>`count(*) filter (where received_at >= ${in30.getTime() / 1000 - 30 * 86400})`,
    })
    .from(schema.letters);

  return totals;
}

export async function getUpcomingDeadlines(limit = 10) {
  const now = new Date();
  return db
    .select({
      id: schema.letters.id,
      subject: schema.letters.subject,
      senderRawName: schema.letters.senderRawName,
      amount: schema.letters.amount,
      currency: schema.letters.currency,
      dueDate: schema.letters.dueDate,
      reminderLevel: schema.letters.reminderLevel,
      paymentStatus: schema.letters.paymentStatus,
      documentType: schema.letters.documentType,
      area: schema.letters.area,
      senderId: schema.letters.senderId,
      canonicalName: schema.senders.canonicalName,
    })
    .from(schema.letters)
    .leftJoin(schema.senders, eq(schema.senders.id, schema.letters.senderId))
    .where(
      and(
        isNotNull(schema.letters.dueDate),
        eq(schema.letters.paymentStatus, "open"),
      ),
    )
    .orderBy(schema.letters.dueDate)
    .limit(limit);
}

export async function getOpenTasks(limit = 10) {
  return db
    .select({
      id: schema.letters.id,
      subject: schema.letters.subject,
      dueDate: schema.letters.dueDate,
      senderRawName: schema.letters.senderRawName,
      canonicalName: schema.senders.canonicalName,
    })
    .from(schema.letters)
    .leftJoin(schema.senders, eq(schema.senders.id, schema.letters.senderId))
    .where(eq(schema.letters.taskStatus, "open"))
    .orderBy(schema.letters.dueDate)
    .limit(limit);
}

export async function getRecentLetters(limit = 5) {
  return db
    .select({
      id: schema.letters.id,
      subject: schema.letters.subject,
      receivedAt: schema.letters.receivedAt,
      documentType: schema.letters.documentType,
      area: schema.letters.area,
      senderRawName: schema.letters.senderRawName,
      canonicalName: schema.senders.canonicalName,
    })
    .from(schema.letters)
    .leftJoin(schema.senders, eq(schema.senders.id, schema.letters.senderId))
    .orderBy(desc(schema.letters.receivedAt))
    .limit(limit);
}

export async function getLastSync() {
  const [row] = await db
    .select()
    .from(schema.syncRuns)
    .orderBy(desc(schema.syncRuns.startedAt))
    .limit(1);
  return row ?? null;
}
