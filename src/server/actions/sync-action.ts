"use server";

import { revalidatePath } from "next/cache";

import { runSync } from "@/server/pipeline/sync";

export async function triggerSync(options?: { limit?: number }) {
  const since = new Date("2025-10-01T00:00:00Z");
  const summary = await runSync({
    since,
    limit: options?.limit,
  });
  revalidatePath("/", "layout");
  return summary;
}
