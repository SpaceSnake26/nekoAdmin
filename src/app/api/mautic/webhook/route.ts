import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { NewEmailEvent } from "@/server/db/schema";

// Mautic webhook ingest.
//
// Configure in Mautic → Webhooks: send selected events to
//   POST {NEXT_PUBLIC_APP_URL}/api/mautic/webhook?secret=<MAUTIC_WEBHOOK_SECRET>
//
// Supported event triggers (mautic.* keys → our event_type):
//   mautic.email_on_send       → 'send'
//   mautic.email_on_open       → 'open'
//   mautic.page_on_hit         → 'click'        (when trackable URL)
//   mautic.email_on_bounce     → 'bounce'
//   mautic.lead_dnc_added      → 'unsubscribe'  (DNC / Do Not Contact)
//
// Idempotent on (mautic_id) when present; otherwise inserts a new row.

interface MauticEvent {
  id?: string | number;
  timestamp?: string;
  event?: { type?: string };
  contact?: { id?: number; fields?: { all?: Record<string, string | null> } };
  email?: { id?: number; name?: string; subject?: string };
  hit?: { url?: string };
  url?: string;
  campaign?: { name?: string };
}

interface MauticPayload {
  // Mautic sends events grouped by trigger key, e.g.:
  // { "mautic.email_on_open": [ {...}, ... ], "timestamp": "..." }
  [key: string]: unknown;
}

const TYPE_MAP: Record<string, string> = {
  "mautic.email_on_send": "send",
  "mautic.email_on_open": "open",
  "mautic.page_on_hit": "click",
  "mautic.email_on_click": "click",
  "mautic.email_on_bounce": "bounce",
  "mautic.lead_dnc_added": "unsubscribe",
};

function authorized(req: Request): boolean {
  const secret = process.env.MAUTIC_WEBHOOK_SECRET;
  if (!secret) return true; // dev mode: accept anything
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("secret");
  const fromHeader = req.headers.get("x-mautic-signature");
  return fromQuery === secret || fromHeader === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: MauticPayload;
  try {
    body = (await req.json()) as MauticPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  let ingested = 0;

  for (const [key, events] of Object.entries(body)) {
    const eventType = TYPE_MAP[key];
    if (!eventType || !Array.isArray(events)) continue;

    for (const raw of events as MauticEvent[]) {
      const fields = raw.contact?.fields?.all ?? {};
      const email = fields.email;
      if (!email) continue;

      const mauticId =
        raw.id != null
          ? `${key}:${raw.contact?.id ?? "?"}:${raw.id}`
          : null;

      // Optional: link to existing host lead by email.
      const lead = await db
        .select({ id: schema.leads.id })
        .from(schema.leads)
        .where(eq(schema.leads.email, email))
        .limit(1);

      const occurredAt = raw.timestamp
        ? new Date(raw.timestamp)
        : new Date();

      const row: NewEmailEvent = {
        mauticId,
        eventType,
        email,
        leadId: lead[0]?.id ?? null,
        campaignName: raw.campaign?.name ?? null,
        emailName: raw.email?.name ?? null,
        url: raw.hit?.url ?? raw.url ?? null,
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
      } catch (e) {
        // log but keep processing — webhook should be tolerant
        console.error("mautic webhook insert failed:", e);
      }
    }
  }

  return NextResponse.json({ ok: true, ingested });
}

export async function GET() {
  // Lets you hit the URL in a browser to verify reachability.
  return NextResponse.json({
    ok: true,
    hint: "POST Mautic webhook events here. See route.ts for trigger mapping.",
  });
}
