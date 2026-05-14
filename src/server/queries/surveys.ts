import "server-only";

import { desc, eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type {
  NewSurveyResponse,
  Survey,
  SurveyResponse,
} from "@/server/db/schema";

export async function listSurveys(): Promise<Survey[]> {
  return db
    .select()
    .from(schema.surveys)
    .orderBy(desc(schema.surveys.createdAt));
}

export async function getSurvey(id: string): Promise<Survey | null> {
  const [row] = await db
    .select()
    .from(schema.surveys)
    .where(eq(schema.surveys.id, id))
    .limit(1);
  return row ?? null;
}

export interface SurveyResponseWithLead extends SurveyResponse {
  leadPharmacyName: string | null;
  leadCity: string | null;
}

export async function listSurveyResponses(): Promise<SurveyResponseWithLead[]> {
  const rows = await db
    .select({
      response: schema.surveyResponses,
      pharmacyName: schema.leads.pharmacyName,
      city: schema.leads.city,
    })
    .from(schema.surveyResponses)
    .leftJoin(schema.leads, eq(schema.leads.id, schema.surveyResponses.leadId))
    .orderBy(desc(schema.surveyResponses.createdAt));

  return rows.map((r) => ({
    ...r.response,
    leadPharmacyName: r.pharmacyName,
    leadCity: r.city,
  }));
}

export async function createSurveyResponse(
  values: NewSurveyResponse,
): Promise<SurveyResponse> {
  const [row] = await db
    .insert(schema.surveyResponses)
    .values(values)
    .returning();
  return row;
}

export async function linkResponseToLead(
  responseId: string,
  leadId: string,
): Promise<void> {
  await db
    .update(schema.surveyResponses)
    .set({ leadId })
    .where(eq(schema.surveyResponses.id, responseId));
}
