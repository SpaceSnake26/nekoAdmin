import { NextResponse } from "next/server";

import { getLead, updateLead } from "@/server/queries/leads";
import type { NewLead } from "@/server/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  return NextResponse.json(lead);
}

// Maps snake_case keys from the wire to Drizzle camelCase columns.
// Unknown keys are dropped silently.
function mapBody(body: Record<string, unknown>): Partial<NewLead> {
  const map: Record<string, keyof NewLead> = {
    pharmacy_name: "pharmacyName",
    contact_name: "contactName",
    website_url: "websiteUrl",
    has_webshop: "hasWebshop",
    shop_url: "shopUrl",
    has_ai_products: "hasAiProducts",
    has_ai_chatbot: "hasAiChatbot",
    google_place_id: "googlePlaceId",
    overall_score: "overallScore",
    category_scores: "categoryScores",
    last_scanned: "lastScanned",
    email: "email",
    phone: "phone",
    city: "city",
    notes: "notes",
    tags: "tags",
    status: "status",
    source: "source",
  };
  const out: Partial<NewLead> = {};
  for (const [k, v] of Object.entries(body)) {
    const target = map[k];
    if (target) (out as Record<string, unknown>)[target] = v;
  }
  return out;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const values = mapBody(body);
  const lead = await updateLead(id, values);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  return NextResponse.json(lead);
}
