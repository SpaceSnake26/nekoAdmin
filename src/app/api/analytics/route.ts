import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db, schema } from "@/server/db";
import { LEAD_STATUSES, type LeadStatus } from "@/server/db/schema";

export async function GET() {
  const [row] = await db
    .select({
      totalLeads: sql<number>`count(*)`,
      newCount: sql<number>`count(*) filter (where status = 'NEW')`,
      contactedCount: sql<number>`count(*) filter (where status = 'CONTACTED')`,
      repliedCount: sql<number>`count(*) filter (where status = 'REPLIED')`,
      qualifiedCount: sql<number>`count(*) filter (where status = 'QUALIFIED')`,
      wonCount: sql<number>`count(*) filter (where status = 'WON')`,
      lostCount: sql<number>`count(*) filter (where status = 'LOST')`,
      withWebshop: sql<number>`count(*) filter (where has_webshop = 1)`,
      withChatbot: sql<number>`count(*) filter (where has_ai_chatbot = 1)`,
      highQuality: sql<number>`count(*) filter (where overall_score >= 8)`,
    })
    .from(schema.leads);

  const leadsByStatus: Record<LeadStatus, number> = {
    NEW: Number(row?.newCount ?? 0),
    CONTACTED: Number(row?.contactedCount ?? 0),
    REPLIED: Number(row?.repliedCount ?? 0),
    QUALIFIED: Number(row?.qualifiedCount ?? 0),
    WON: Number(row?.wonCount ?? 0),
    LOST: Number(row?.lostCount ?? 0),
  };

  return NextResponse.json({
    totalLeads: Number(row?.totalLeads ?? 0),
    leadsByStatus,
    withWebshop: Number(row?.withWebshop ?? 0),
    withChatbot: Number(row?.withChatbot ?? 0),
    highQuality: Number(row?.highQuality ?? 0),
    statuses: LEAD_STATUSES,
  });
}
