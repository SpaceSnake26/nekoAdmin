import "server-only";

import { findPharmacies, findPharmaciesGlobal } from "@/lib/google-maps";
import { searchLocalCh } from "@/lib/local-ch";
import { db, schema } from "@/server/db";
import type { NewLead } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export type ScanSource = "gmaps" | "local-ch" | "both";

export interface ScanResult {
  source: ScanSource;
  fetched: number;
  inserted: number;
  skipped: number;
  errors: string[];
}

function scoreLead(input: { website?: string | null; phone?: string | null }) {
  let score = 5;
  if (input.website) score += 2;
  if (input.phone) score += 1;
  return score;
}

function normaliseWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `https://${url}`;
}

export async function runGlobalSwissScan(
  source: ScanSource,
): Promise<ScanResult> {
  const errors: string[] = [];
  const result: ScanResult = {
    source,
    fetched: 0,
    inserted: 0,
    skipped: 0,
    errors,
  };

  const candidates: NewLead[] = [];

  if (source === "gmaps" || source === "both") {
    try {
      const rows = await findPharmaciesGlobal();
      for (const r of rows) {
        candidates.push({
          pharmacyName: r.name,
          city: r.city ?? null,
          phone: r.phone ?? null,
          websiteUrl: normaliseWebsite(r.website) ?? null,
          hasWebshop: false,
          hasAiProducts: false,
          hasAiChatbot: false,
          googlePlaceId: r.place_id,
          source: "GMaps",
          status: "NEW",
          tags: [],
          overallScore: scoreLead({ website: r.website, phone: r.phone }),
          lastScanned: new Date(),
        });
      }
    } catch (e) {
      errors.push(`GMaps: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (source === "local-ch" || source === "both") {
    try {
      const rows = await searchLocalCh("Apotheke", true);
      for (const r of rows) {
        candidates.push({
          pharmacyName: r.name,
          city: r.city ?? null,
          phone: r.phone ?? null,
          websiteUrl: normaliseWebsite(r.website) ?? null,
          hasWebshop: false,
          hasAiProducts: false,
          hasAiChatbot: false,
          googlePlaceId: r.place_id ?? null,
          source: "local.ch",
          status: "NEW",
          tags: [],
          overallScore: scoreLead({ website: r.website, phone: r.phone }),
          lastScanned: new Date(),
        });
      }
    } catch (e) {
      errors.push(`local.ch: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  result.fetched = candidates.length;

  for (const c of candidates) {
    try {
      if (c.googlePlaceId) {
        const existing = await db
          .select({ id: schema.leads.id })
          .from(schema.leads)
          .where(eq(schema.leads.googlePlaceId, c.googlePlaceId))
          .limit(1);
        if (existing.length > 0) {
          result.skipped++;
          continue;
        }
      } else if (c.phone) {
        const existing = await db
          .select({ id: schema.leads.id })
          .from(schema.leads)
          .where(eq(schema.leads.phone, c.phone))
          .limit(1);
        if (existing.length > 0) {
          result.skipped++;
          continue;
        }
      }
      await db.insert(schema.leads).values(c);
      result.inserted++;
    } catch (e) {
      errors.push(`${c.pharmacyName}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}
