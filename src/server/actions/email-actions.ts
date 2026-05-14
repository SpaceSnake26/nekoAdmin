"use server";

import { revalidatePath } from "next/cache";
import { eq, isNotNull } from "drizzle-orm";

import { getEmailProvider } from "@/lib/email-provider";
import { db, schema } from "@/server/db";

export interface SyncLeadsResult {
  total: number;
  pushed: number;
  skipped: number;
  failed: number;
  errors: string[];
  provider: string;
}

// Push all leads with an email to the active email provider as contacts.
// Idempotent: the provider adapter handles upsert / dedupe.
export async function syncLeadsToEmailProvider(): Promise<SyncLeadsResult> {
  const provider = getEmailProvider();
  const status = await provider.checkConnection();
  if (!status.configured) {
    throw new Error(
      `Kein Email-Provider konfiguriert (EMAIL_PROVIDER=${provider.name}). Bitte .env.local prüfen.`,
    );
  }
  if (!status.reachable) {
    throw new Error(
      `${provider.name} nicht erreichbar: ${status.error ?? "unbekannt"}`,
    );
  }

  const leads = await db
    .select()
    .from(schema.leads)
    .where(isNotNull(schema.leads.email));

  const result: SyncLeadsResult = {
    total: leads.length,
    pushed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    provider: provider.name,
  };

  for (const lead of leads) {
    if (!lead.email) {
      result.skipped++;
      continue;
    }
    try {
      const [firstname, ...rest] = (lead.contactName ?? "")
        .trim()
        .split(/\s+/);
      await provider.upsertContact({
        email: lead.email,
        firstname: firstname || null,
        lastname: rest.length > 0 ? rest.join(" ") : null,
        company: lead.pharmacyName,
        city: lead.city,
        tags: lead.tags?.length ? lead.tags : undefined,
      });
      result.pushed++;
    } catch (e) {
      result.failed++;
      result.errors.push(
        `${lead.email}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  revalidatePath("/newsletter");
  return result;
}

export async function refreshEmailProviderStatus() {
  const status = await getEmailProvider().checkConnection();
  revalidatePath("/newsletter");
  return status;
}

// ----- compliance gate -----
// Returns the subset of recipients (by email) that DO have an active opt-in
// in the consent ledger. Used to block bulk sends to leads that never
// consented under Swiss UWG Art. 3.
export async function filterRecipientsWithConsent(
  emails: string[],
): Promise<{ allowed: string[]; blocked: string[] }> {
  if (emails.length === 0) return { allowed: [], blocked: [] };
  const rows = await db
    .select({
      email: schema.consentLedger.email,
      revokedAt: schema.consentLedger.revokedAt,
    })
    .from(schema.consentLedger);
  const activeByEmail = new Map<string, boolean>();
  for (const r of rows) {
    if (r.revokedAt) {
      activeByEmail.set(r.email, false);
    } else if (!activeByEmail.has(r.email)) {
      activeByEmail.set(r.email, true);
    }
  }
  const allowed: string[] = [];
  const blocked: string[] = [];
  for (const e of emails) {
    if (activeByEmail.get(e)) allowed.push(e);
    else blocked.push(e);
  }
  return { allowed, blocked };
}
