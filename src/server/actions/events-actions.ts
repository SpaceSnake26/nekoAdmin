"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/server/db";
import { EVENT_LOCATIONS } from "@/server/db/schema";
import type { NewItEvent } from "@/server/db/schema";

const eventSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  locationCode: z.enum(EVENT_LOCATIONS),
  city: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  startsAt: z.string().min(1, "Startdatum ist erforderlich"),
  endsAt: z.string().nullable().optional(),
  url: z.string().url("URL ungültig").nullable().optional().or(z.literal("")),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
});

export async function createEventAction(input: unknown) {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Eingabe ungültig");
  }
  const d = parsed.data;
  const values: NewItEvent = {
    title: d.title,
    locationCode: d.locationCode,
    city: d.city || null,
    venue: d.venue || null,
    startsAt: new Date(d.startsAt),
    endsAt: d.endsAt ? new Date(d.endsAt) : null,
    url: d.url || null,
    description: d.description || null,
    tags: d.tags,
  };
  const [row] = await db.insert(schema.itEvents).values(values).returning();
  revalidatePath("/events");
  return row;
}

export async function deleteEventAction(id: string) {
  await db.delete(schema.itEvents).where(eq(schema.itEvents.id, id));
  revalidatePath("/events");
}
