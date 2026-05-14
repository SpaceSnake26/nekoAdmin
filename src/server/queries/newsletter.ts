import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type {
  NewNewsletterSignup,
  NewsletterSignup,
} from "@/server/db/schema";

export async function listNewsletterSignups(): Promise<NewsletterSignup[]> {
  return db
    .select()
    .from(schema.newsletterSignups)
    .orderBy(desc(schema.newsletterSignups.createdAt));
}

export async function upsertNewsletterSignup(
  values: NewNewsletterSignup,
): Promise<NewsletterSignup> {
  const [row] = await db
    .insert(schema.newsletterSignups)
    .values(values)
    .onConflictDoUpdate({
      target: schema.newsletterSignups.email,
      set: {
        pharmacyName: values.pharmacyName,
        leadId: values.leadId,
        consentAccepted: values.consentAccepted,
      },
    })
    .returning();
  return row;
}

export async function tagLeadAsSubscribed(leadId: string): Promise<void> {
  const [lead] = await db
    .select({ tags: schema.leads.tags })
    .from(schema.leads)
    .where(eq(schema.leads.id, leadId))
    .limit(1);
  if (!lead) return;
  const next = Array.from(new Set([...(lead.tags ?? []), "NEWSLETTER"]));
  await db
    .update(schema.leads)
    .set({ tags: next, updatedAt: new Date() })
    .where(eq(schema.leads.id, leadId));
}

export async function countNewsletterSignups(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.newsletterSignups);
  return Number(row?.n ?? 0);
}
