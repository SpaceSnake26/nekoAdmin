import { NextResponse } from "next/server";

import { runGlobalSwissScan, type ScanSource } from "@/lib/scanner";

export const maxDuration = 300;

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const source = (searchParams.get("source") ?? "both") as ScanSource;
  if (!["gmaps", "local-ch", "both"].includes(source)) {
    return NextResponse.json({ error: "invalid source" }, { status: 400 });
  }
  const result = await runGlobalSwissScan(source);
  return NextResponse.json(result);
}
