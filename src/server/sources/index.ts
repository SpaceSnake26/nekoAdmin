import { EpostApiSource } from "./epost-api";
import type { LetterSource } from "./types";

export type { LetterSource, SourceLetterRef } from "./types";
export { EpostApiSource };

let cached: LetterSource | undefined;

/**
 * Resolve the active letter source from env. Cached per-process so we
 * don't construct a new client on every request.
 */
export function getActiveSource(): LetterSource {
  if (cached) return cached;
  const apiKey = process.env.EPOST_API_KEY;
  const baseUrl = process.env.EPOST_BASE_URL ?? "https://api.epost.ch";
  if (!apiKey) {
    throw new Error("EPOST_API_KEY missing in environment");
  }
  cached = new EpostApiSource(apiKey, baseUrl);
  return cached;
}
