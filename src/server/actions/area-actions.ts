"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, schema } from "@/server/db";

const SLUG_PATTERN = /^[a-z][a-z0-9_-]{0,30}$/;

export async function createArea(input: {
  code: string;
  label: string;
  color?: string;
  description?: string;
  senderPatterns?: string[];
}) {
  const code = input.code.trim().toLowerCase();
  if (!SLUG_PATTERN.test(code)) {
    throw new Error(
      "Code muss kleinbuchstaben/zahlen/_/- enthalten (z.B. 'immobilien')",
    );
  }
  const exists = await db
    .select({ code: schema.areas.code })
    .from(schema.areas)
    .where(eq(schema.areas.code, code))
    .limit(1);
  if (exists.length > 0) throw new Error(`Code '${code}' existiert bereits`);

  const [maxRow] = await db
    .select({
      max: sql<number>`coalesce(max(${schema.areas.sortOrder}), -1)`,
    })
    .from(schema.areas);

  await db.insert(schema.areas).values({
    code,
    label: input.label.trim(),
    color: input.color ?? null,
    description: input.description ?? null,
    senderPatterns: input.senderPatterns ?? [],
    sortOrder: Number(maxRow?.max ?? -1) + 1,
  });
  revalidatePath("/settings");
}

export async function updateArea(
  code: string,
  patch: {
    label?: string;
    color?: string | null;
    description?: string | null;
    senderPatterns?: string[];
    isHidden?: boolean;
  },
) {
  await db
    .update(schema.areas)
    .set({
      ...(patch.label !== undefined ? { label: patch.label.trim() } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description }
        : {}),
      ...(patch.senderPatterns !== undefined
        ? { senderPatterns: patch.senderPatterns }
        : {}),
      ...(patch.isHidden !== undefined ? { isHidden: patch.isHidden } : {}),
    })
    .where(eq(schema.areas.code, code));
  revalidatePath("/settings");
  revalidatePath("/inbox");
}

export async function deleteArea(code: string) {
  // Letters referencing this area get area=NULL via FK on delete set null.
  await db.delete(schema.areas).where(eq(schema.areas.code, code));
  revalidatePath("/settings");
  revalidatePath("/inbox");
}

export async function toggleAreaHidden(code: string) {
  const [row] = await db
    .select({ isHidden: schema.areas.isHidden })
    .from(schema.areas)
    .where(eq(schema.areas.code, code))
    .limit(1);
  if (!row) throw new Error("Area nicht gefunden");
  await db
    .update(schema.areas)
    .set({ isHidden: !row.isHidden })
    .where(eq(schema.areas.code, code));
  revalidatePath("/settings");
  revalidatePath("/inbox");
}
