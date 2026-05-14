import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db, schema } from "@/server/db";

// OpenOutreach (or other LinkedIn outreach tool) polls this endpoint to
// pick up runtime config changes the user makes in the UI. The config is
// stored in `app_settings` under the key `linkedin.config` as JSON.
//
// Required env: LINKEDIN_EVENT_SECRET (reused) for the same shared-secret check.

const KEY = "linkedin.config";

interface LinkedInConfig {
  paused: boolean;
  dailyInvites: number;
  dailyDms: number;
  dailyProfileViews: number;
  workingHoursStart: string; // "09:00"
  workingHoursEnd: string;   // "17:00"
  weekdaysOnly: boolean;
}

const DEFAULTS: LinkedInConfig = {
  paused: false,
  dailyInvites: 25,
  dailyDms: 10,
  dailyProfileViews: 40,
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  weekdaysOnly: true,
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

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const row = await db
    .select()
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, KEY))
    .limit(1);
  const cfg = row[0]?.value ? JSON.parse(row[0].value) : DEFAULTS;
  return NextResponse.json({ ...DEFAULTS, ...cfg });
}
