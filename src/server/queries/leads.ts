import "server-only";

import { and, desc, eq, gte, like, or, sql } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { Lead, LeadStatus, NewLead } from "@/server/db/schema";

export interface LeadFilters {
  q?: string | null;
  city?: string | null;
  minScore?: number | null;
  hasWebshop?: boolean | null;
  hasAiChatbot?: boolean | null;
  status?: LeadStatus | null;
}

export async function listLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  const conds = [];
  if (filters.q) {
    const term = `%${filters.q}%`;
    conds.push(
      or(
        like(schema.leads.pharmacyName, term),
        like(schema.leads.city, term),
        like(schema.leads.email, term),
      ),
    );
  }
  if (filters.city) conds.push(like(schema.leads.city, `%${filters.city}%`));
  if (filters.minScore != null)
    conds.push(gte(schema.leads.overallScore, filters.minScore));
  if (filters.hasWebshop != null)
    conds.push(eq(schema.leads.hasWebshop, filters.hasWebshop));
  if (filters.hasAiChatbot != null)
    conds.push(eq(schema.leads.hasAiChatbot, filters.hasAiChatbot));
  if (filters.status) conds.push(eq(schema.leads.status, filters.status));

  return db
    .select()
    .from(schema.leads)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.leads.createdAt));
}

export async function getLeadStats() {
  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      withWebshop: sql<number>`count(*) filter (where has_webshop = 1)`,
      withChatbot: sql<number>`count(*) filter (where has_ai_chatbot = 1)`,
      highQuality: sql<number>`count(*) filter (where overall_score >= 8)`,
      newCount: sql<number>`count(*) filter (where status = 'NEW')`,
      contactedCount: sql<number>`count(*) filter (where status = 'CONTACTED')`,
      repliedCount: sql<number>`count(*) filter (where status = 'REPLIED')`,
      qualifiedCount: sql<number>`count(*) filter (where status = 'QUALIFIED')`,
      wonCount: sql<number>`count(*) filter (where status = 'WON')`,
      lostCount: sql<number>`count(*) filter (where status = 'LOST')`,
    })
    .from(schema.leads);
  return {
    total: Number(row?.total ?? 0),
    withWebshop: Number(row?.withWebshop ?? 0),
    withChatbot: Number(row?.withChatbot ?? 0),
    highQuality: Number(row?.highQuality ?? 0),
    byStatus: {
      NEW: Number(row?.newCount ?? 0),
      CONTACTED: Number(row?.contactedCount ?? 0),
      REPLIED: Number(row?.repliedCount ?? 0),
      QUALIFIED: Number(row?.qualifiedCount ?? 0),
      WON: Number(row?.wonCount ?? 0),
      LOST: Number(row?.lostCount ?? 0),
    },
  };
}

export async function getLead(id: string): Promise<Lead | null> {
  const [row] = await db
    .select()
    .from(schema.leads)
    .where(eq(schema.leads.id, id))
    .limit(1);
  return row ?? null;
}

export async function getLeadByEmail(email: string): Promise<Lead | null> {
  const [row] = await db
    .select()
    .from(schema.leads)
    .where(eq(schema.leads.email, email))
    .limit(1);
  return row ?? null;
}

export async function createLead(values: NewLead): Promise<Lead> {
  const [row] = await db.insert(schema.leads).values(values).returning();
  return row;
}

export async function updateLead(
  id: string,
  values: Partial<NewLead>,
): Promise<Lead | null> {
  const [row] = await db
    .update(schema.leads)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(schema.leads.id, id))
    .returning();
  return row ?? null;
}

export async function countLeads(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.leads);
  return Number(row?.n ?? 0);
}
