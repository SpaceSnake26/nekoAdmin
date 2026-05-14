import { NextResponse } from "next/server";

import { leadSchema } from "@/lib/validations";
import { createLead, listLeads } from "@/server/queries/leads";
import type { LeadStatus, NewLead } from "@/server/db/schema";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const minScore = searchParams.get("minScore");
  const hasWebshop = searchParams.get("hasWebshop");
  const status = searchParams.get("status");
  const hasAiChatbot = searchParams.get("hasAiChatbot");

  const leads = await listLeads({
    city: city && city !== "all" ? city : null,
    minScore: minScore ? parseInt(minScore, 10) : null,
    hasWebshop: hasWebshop && hasWebshop !== "all" ? hasWebshop === "true" : null,
    hasAiChatbot:
      hasAiChatbot && hasAiChatbot !== "all" ? hasAiChatbot === "true" : null,
    status: status && status !== "all" ? (status as LeadStatus) : null,
  });

  return NextResponse.json(leads);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const d = parsed.data;
  const values: NewLead = {
    pharmacyName: d.pharmacy_name,
    contactName: d.contact_name ?? null,
    email: d.email ?? null,
    phone: d.phone ?? null,
    websiteUrl: d.website_url,
    city: d.city,
    hasWebshop: d.has_webshop,
    shopUrl: d.shop_url ?? null,
    hasAiProducts: d.has_ai_products,
    hasAiChatbot: d.has_ai_chatbot,
    notes: d.notes ?? null,
    tags: d.tags,
    status: d.status,
  };

  const lead = await createLead(values);
  return NextResponse.json(lead, { status: 201 });
}
