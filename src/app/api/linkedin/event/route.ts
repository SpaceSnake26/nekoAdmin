import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type {
  NewConsentLedgerRow,
  NewOutreachMessage,
} from "@/server/db/schema";

// OpenOutreach (or any LinkedIn outreach tool we plug in) posts events
// here. Required env: LINKEDIN_EVENT_SECRET — shared secret matched in
// the URL `?secret=…` or `X-LinkedIn-Signature` header.
//
// Payload shape (loose, vendor-agnostic):
// {
//   "kind": "invite-sent" | "invite-accepted" | "message-sent" | "reply-received" | "warning",
//   "provider_message_id": "...",       // optional, vendor's UID
//   "recipient": { "name": "...", "urn": "urn:li:fs_miniProfile:...", "email": "..." },
//   "lead_id": "<our-lead-id>",         // optional, OO can be told ours
//   "body": "Grüezi …",
//   "occurred_at": "2026-05-13T10:00:00Z"
// }

interface LinkedInEvent {
  kind: string;
  provider_message_id?: string | null;
  recipient?: { name?: string; urn?: string; email?: string };
  lead_id?: string | null;
  body?: string | null;
  subject?: string | null;
  occurred_at?: string;
}

const KIND_TO_CHANNEL: Record<string, "linkedin-invite" | "linkedin-dm"> = {
  "invite-sent": "linkedin-invite",
  "invite-accepted": "linkedin-invite",
  "message-sent": "linkedin-dm",
  "reply-received": "linkedin-dm",
};

const KIND_TO_STATUS: Record<string, string> = {
  "invite-sent": "sent",
  "invite-accepted": "delivered",
  "message-sent": "sent",
  "reply-received": "replied",
  warning: "failed",
};

function authorized(req: Request): boolean {
  const expected = process.env.LINKEDIN_EVENT_SECRET;
  if (!expected) return true;
  const url = new URL(req.url);
  return (
    url.searchParams.get("secret") === expected ||
    req.headers.get("x-linkedin-signature") === expected
  );
}

async function resolveLeadId(
  event: LinkedInEvent,
): Promise<string | null> {
  if (event.lead_id) {
    const r = await db
      .select({ id: schema.leads.id })
      .from(schema.leads)
      .where(eq(schema.leads.id, event.lead_id))
      .limit(1);
    if (r[0]) return r[0].id;
  }
  const email = event.recipient?.email;
  if (email) {
    const r = await db
      .select({ id: schema.leads.id })
      .from(schema.leads)
      .where(eq(schema.leads.email, email))
      .limit(1);
    if (r[0]) return r[0].id;
  }
  return null;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: LinkedInEvent | LinkedInEvent[];
  try {
    payload = (await req.json()) as LinkedInEvent | LinkedInEvent[];
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const events = Array.isArray(payload) ? payload : [payload];
  let ingested = 0;

  for (const ev of events) {
    const channel = KIND_TO_CHANNEL[ev.kind];
    if (!channel) continue; // ignore warnings / unknown kinds — we surface those via health()

    const leadId = await resolveLeadId(ev);
    const occurredAt = ev.occurred_at ? new Date(ev.occurred_at) : new Date();
    const direction = ev.kind === "reply-received" ? "in" : "out";

    const row: NewOutreachMessage = {
      channel,
      direction,
      leadId,
      email: ev.recipient?.email ?? null,
      linkedinUrn: ev.recipient?.urn ?? null,
      providerMessageId: ev.provider_message_id ?? null,
      subject: ev.subject ?? ev.recipient?.name ?? null,
      body: ev.body ?? null,
      status: KIND_TO_STATUS[ev.kind] ?? "sent",
      sentAt: occurredAt,
      repliedAt: ev.kind === "reply-received" ? occurredAt : null,
      payload: ev as unknown as Record<string, unknown>,
    };

    try {
      const inserted = await db
        .insert(schema.outreachMessages)
        .values(row)
        .onConflictDoNothing({
          target: schema.outreachMessages.providerMessageId,
        })
        .returning({ id: schema.outreachMessages.id });
      if (inserted.length > 0) ingested++;

      // On a reply, also flip the lead status to REPLIED and write a
      // "linkedin-reply" consent-ledger entry (the recipient affirmatively
      // engaged, so we have legitimate-interest grounds to keep the convo).
      if (ev.kind === "reply-received" && leadId) {
        await db
          .update(schema.leads)
          .set({ status: "REPLIED", updatedAt: new Date() })
          .where(eq(schema.leads.id, leadId));

        if (ev.recipient?.email) {
          const consent: NewConsentLedgerRow = {
            email: ev.recipient.email,
            leadId,
            kind: "linkedin-reply",
            source: "linkedin-webhook",
            legalBasis: "legitimate-interest",
            acceptedAt: occurredAt,
            payload: { urn: ev.recipient?.urn ?? null },
          };
          await db.insert(schema.consentLedger).values(consent);
        }
      }
    } catch (e) {
      console.error("linkedin webhook insert failed:", e);
    }
  }

  return NextResponse.json({ ok: true, ingested });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST LinkedIn outreach events here. See route.ts for kind mapping.",
  });
}
