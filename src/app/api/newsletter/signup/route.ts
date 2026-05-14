import { NextResponse } from "next/server";

import { newsletterSignupSchema } from "@/lib/validations";
import {
  listNewsletterSignups,
  tagLeadAsSubscribed,
  upsertNewsletterSignup,
} from "@/server/queries/newsletter";
import { db, schema } from "@/server/db";
import type { NewConsentLedgerRow } from "@/server/db/schema";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = newsletterSignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const d = parsed.data;

  await upsertNewsletterSignup({
    email: d.email,
    pharmacyName: d.pharmacy_name ?? null,
    leadId: d.lead_id ?? null,
    consentAccepted: d.consent_accepted,
  });

  if (d.lead_id) await tagLeadAsSubscribed(d.lead_id);

  // Audit trail: every opt-in lands in the consent ledger so the
  // compliance gate on bulk-send can verify lawful basis.
  if (d.consent_accepted) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;
    const consent: NewConsentLedgerRow = {
      email: d.email,
      leadId: d.lead_id ?? null,
      kind: "newsletter",
      source: "/api/newsletter/signup",
      legalBasis: "UWG-opt-in",
      payload: { pharmacyName: d.pharmacy_name ?? null },
      ip,
      userAgent,
    };
    await db.insert(schema.consentLedger).values(consent);
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  const rows = await listNewsletterSignups();
  return NextResponse.json(rows);
}
