import { eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import type { NewConsentLedgerRow } from "@/server/db/schema";

// One-click unsubscribe (UWG / RFC 8058 friendly).
// Accessed via the link in every commercial mail's footer.

async function recordRevoke(email: string, source: string) {
  // Find any existing lead for context.
  const lead = await db
    .select({ id: schema.leads.id })
    .from(schema.leads)
    .where(eq(schema.leads.email, email))
    .limit(1);

  const row: NewConsentLedgerRow = {
    email,
    leadId: lead[0]?.id ?? null,
    kind: "newsletter",
    source,
    legalBasis: "UWG-opt-in",
    revokedAt: new Date(),
    payload: { reason: "user-unsubscribe" },
  };
  await db.insert(schema.consentLedger).values(row);
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abmeldung</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:6rem auto;padding:0 1.5rem;color:#1a1a1a;line-height:1.5}h1{font-size:1.5rem;margin-bottom:.5rem}p{color:#555}</style></head><body>${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return htmlResponse(
      `<h1>Ungültiger Link</h1><p>Token fehlt. Antworten Sie auf die letzte E-Mail mit "STOP".</p>`,
      400,
    );
  }
  const v = verifyUnsubscribeToken(token);
  if (!v) {
    return htmlResponse(
      `<h1>Ungültiger Link</h1><p>Token konnte nicht verifiziert werden.</p>`,
      400,
    );
  }
  try {
    await recordRevoke(v.email, "unsubscribe-link");
  } catch (e) {
    console.error("unsubscribe insert failed:", e);
  }
  return htmlResponse(
    `<h1>Abgemeldet</h1><p>Die Adresse <strong>${v.email}</strong> erhält keine Newsletter mehr von uns. Bei Fragen: <a href="mailto:hello@nekosys.ch">hello@nekosys.ch</a>.</p>`,
  );
}

// POST is equivalent and used by RFC 8058 one-click unsubscribe ESPs.
export async function POST(req: Request) {
  return GET(req);
}
