"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { leadSchema } from "@/lib/validations";
import { runGlobalSwissScan, type ScanResult, type ScanSource } from "@/lib/scanner";
import { createLead, updateLead } from "@/server/queries/leads";
import { LEAD_STATUSES, type NewLead } from "@/server/db/schema";

export async function startGlobalSwissScan(
  source: ScanSource = "both",
): Promise<ScanResult> {
  const result = await runGlobalSwissScan(source);
  revalidatePath("/leads");
  revalidatePath("/");
  return result;
}

export async function createLeadAction(input: unknown) {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Bitte alle Pflichtfelder ausfüllen.");
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
  revalidatePath("/leads");
  return lead;
}

const updateLeadSchema = z
  .object({
    pharmacyName: z.string().min(1).optional(),
    contactName: z.string().nullable().optional(),
    email: z.string().email().nullable().optional().or(z.literal("").transform(() => null)),
    phone: z.string().nullable().optional(),
    websiteUrl: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
    city: z.string().nullable().optional(),
    hasWebshop: z.boolean().optional(),
    shopUrl: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
    hasAiProducts: z.boolean().optional(),
    hasAiChatbot: z.boolean().optional(),
    notes: z.string().nullable().optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    source: z.string().nullable().optional(),
    overallScore: z.number().nullable().optional(),
  })
  .strict();

export async function updateLeadAction(id: string, patch: unknown) {
  if (!id) throw new Error("Lead-ID fehlt");
  const parsed = updateLeadSchema.safeParse(patch);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Eingabe ungültig");
  }
  const updated = await updateLead(id, parsed.data as Partial<NewLead>);
  if (!updated) throw new Error("Lead nicht gefunden");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  return updated;
}
