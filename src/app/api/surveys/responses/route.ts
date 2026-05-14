import { NextResponse } from "next/server";

import { surveyResponseSchema } from "@/lib/validations";
import {
  createSurveyResponse,
  linkResponseToLead,
  listSurveyResponses,
} from "@/server/queries/surveys";
import { getLeadByEmail, updateLead } from "@/server/queries/leads";
import type { NewSurveyResponse } from "@/server/db/schema";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = surveyResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const d = parsed.data;

  const values: NewSurveyResponse = {
    surveyId: d.survey_id,
    leadId: d.lead_id ?? null,
    hasWebsite: d.has_website,
    websiteSatisfaction: d.website_satisfaction ?? null,
    webshopStatus: d.webshop_status,
    itManagement: d.it_management,
    aiUsage: d.ai_usage,
    topPriority: d.top_priority,
    topPriorityOther: d.top_priority_other ?? null,
    contactName: d.contact_name,
    email: d.email,
    phone: d.phone ?? null,
    consentAccepted: d.consent_accepted,
  };

  const response = await createSurveyResponse(values);

  if (d.lead_id) {
    await updateLead(d.lead_id, {
      contactName: d.contact_name,
      email: d.email,
      phone: d.phone ?? null,
      hasWebshop: d.webshop_status === "Yes",
      hasAiChatbot: d.ai_usage === "Chatbot" || d.ai_usage === "Both",
      status: "REPLIED",
    });
  } else {
    const lead = await getLeadByEmail(d.email);
    if (lead) await linkResponseToLead(response.id, lead.id);
  }

  return NextResponse.json({ success: true, id: response.id });
}

export async function GET() {
  const rows = await listSurveyResponses();
  return NextResponse.json(rows);
}
