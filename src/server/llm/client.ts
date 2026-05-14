import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;

/** Lazy — so dotenv can load ANTHROPIC_API_KEY before the SDK reads it. */
export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const DEFAULT_MODEL = () =>
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
export const FALLBACK_MODEL = () =>
  process.env.ANTHROPIC_FALLBACK_MODEL ?? "claude-opus-4-7";
