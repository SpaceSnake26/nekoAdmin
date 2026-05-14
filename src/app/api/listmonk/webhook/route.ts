import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { NewEmailEvent } from "@/server/db/schema";

// Listmonk webhook ingest. Configure in Listmonk → Settings → Bounces +
// Settings → Campaigns → Webhooks (or via "transactional events" plugin),
// pointing at:
//
//   POST {NEXT_PUBLIC_APP_URL}/api/listmonk/webhook?secret=<LISTMONK_WEBHOOK_SECRET>
//
// Listmonk payload shape (`type` → our `event_type`):
//   subscriber.opened    → open
//   subscriber.clicked   → click
//   subscriber.bounced   → bounce
//   subscriber.unsub     → unsubscribe
//   campaign.sent        → send

interface ListmonkEvent {
  id?: number | string;
  type: string;
  email?: string;
  subscriber?: { email?: string; id?: number };
  campaign?: { id?: number; name?: string; subject?: string };
  url?: string;
  timestamp?: string;
}

const TYPE_MAP: Record<string, string> = {
  "subscriber.opened": "open",
  "subscriber.clicked": "click",
  "subscriber.bounced": "bounce",
  "subscriber.unsub": "unsubscribe",
  "campaign.sent": "send",
};

function authorized(req: Request): boolean {
  const expected = process.env.LISTMONK_WEBHOOK_SECRET;
  if (!expected) return true; // dev mode
  const url = new URL(req.url);
  return (
    url.searchParams.get("secret") === expected ||
    req.headers.get("x-listmonk-signature") === expected
  );
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: ListmonkEvent | ListmonkEvent[];
  try {
    body = (await req.json()) as ListmonkEvent | ListmonkEvent[];
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const events = Array.isArray(body) ? body : [body];
  let ingested = 0;

  for (const raw of events) {
    const eventType = TYPE_MAP[raw.type];
    if (!eventType) continue;
    const email = raw.email ?? raw.subscriber?.email;
    if (!email) continue;

    const idKey =
      raw.id != null ? `listmonk:${raw.type}:${raw.id}` : null;

    const lead = await db
      .select({ id: schema.leads.id })
      .from(schema.leads)
      .where(eq(schema.leads.email, email))
      .limit(1);

    const occurredAt = raw.timestamp ? new Date(raw.timestamp) : new Date();

    const row: NewEmailEvent = {
      mauticId: idKey, // we reuse the unique column for idempotency across providers
      eventType,
      email,
      leadId: lead[0]?.id ?? null,
      campaignName: raw.campaign?.name ?? null,
      emailName: raw.campaign?.subject ?? null,
      url: raw.url ?? null,
      payload: raw as unknown as Record<string, unknown>,
      occurredAt,
    };

    try {
      const inserted = await db
        .insert(schema.emailEvents)
        .values(row)
        .onConflictDoNothing({ target: schema.emailEvents.mauticId })
        .returning({ id: schema.emailEvents.id });
      if (inserted.length > 0) ingested++;

      // Mirror unsubscribes into the consent ledger as a revocation.
      if (eventType === "unsubscribe") {
        await db.insert(schema.consentLedger).values({
          email,
          leadId: lead[0]?.id ?? null,
          kind: "newsletter",
          source: "listmonk-webhook",
          legalBasis: "UWG-opt-in",
          revokedAt: occurredAt,
          payload: { reason: "listmonk-unsub" },
        });
      }
    } catch (e) {
      console.error("listmonk webhook insert failed:", e);
    }
  }

  return NextResponse.json({ ok: true, ingested });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST Listmonk subscriber/campaign events here.",
  });
}
