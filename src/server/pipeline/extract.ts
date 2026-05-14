import { execFile as execFileCb } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { asc, eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import { getAnthropic, DEFAULT_MODEL, FALLBACK_MODEL } from "@/server/llm/client";
import {
  buildExtractSystemPrompt,
  buildExtractUserText,
} from "@/server/llm/prompts/extract-letter";
import { buildExtractionSchema, type ExtractionResult } from "@/server/llm/schema";

const execFile = promisify(execFileCb);

const MIN_OCR_TEXT_LENGTH = 200;

export interface PdfPreOcrResult {
  rawText: string;
  pageCount: number | null;
  needsVisionFallback: boolean;
}

/**
 * Run pdftotext + pdfinfo from the poppler suite (Homebrew).
 * Returns the raw OCR text already embedded in the PDF (most ePost scans have one).
 * If the result is too short, the caller should fall back to pure Claude vision.
 */
export async function preOcrPdf(pdfPath: string): Promise<PdfPreOcrResult> {
  const [textRes, infoRes] = await Promise.allSettled([
    execFile("/opt/homebrew/bin/pdftotext", ["-layout", pdfPath, "-"], {
      maxBuffer: 8 * 1024 * 1024,
    }),
    execFile("/opt/homebrew/bin/pdfinfo", [pdfPath]),
  ]);

  const rawText =
    textRes.status === "fulfilled" ? textRes.value.stdout.trim() : "";

  let pageCount: number | null = null;
  if (infoRes.status === "fulfilled") {
    const m = infoRes.value.stdout.match(/^Pages:\s+(\d+)/m);
    if (m) pageCount = Number(m[1]);
  }

  return {
    rawText,
    pageCount,
    needsVisionFallback: rawText.length < MIN_OCR_TEXT_LENGTH,
  };
}

export interface ExtractInput {
  pdfPath: string;
  apiFileName?: string | null;
}

export interface ExtractOutput {
  result: ExtractionResult;
  modelUsed: string;
  preOcr: PdfPreOcrResult;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

/**
 * Run the LLM extraction for a single PDF.
 * - pdftotext for cheap rough text
 * - Claude with PDF (document block) + raw text + structured-output schema
 * - re-runs with the fallback model if confidence < 0.7
 */
export async function extractLetter(
  input: ExtractInput,
): Promise<ExtractOutput> {
  const preOcr = await preOcrPdf(input.pdfPath);
  const pdfBytes = await readFile(input.pdfPath);
  const pdfBase64 = pdfBytes.toString("base64");

  // Load current area catalog (visible only) for dynamic prompt + Zod enum
  const areas = await db
    .select()
    .from(schema.areas)
    .where(eq(schema.areas.isHidden, false))
    .orderBy(asc(schema.areas.sortOrder));
  const areaCodes = areas.map((a) => a.code);
  const extractionSchema = buildExtractionSchema(areaCodes);
  const systemPrompt = buildExtractSystemPrompt(areas);

  const userText = buildExtractUserText(preOcr.rawText, input.apiFileName ?? null);

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: pdfBase64,
          },
        },
        { type: "text", text: userText },
      ],
    },
  ];

  const anthropic = getAnthropic();
  const defaultModel = DEFAULT_MODEL();
  const fallbackModel = FALLBACK_MODEL();

  let modelUsed = defaultModel;
  let response = await anthropic.messages.parse({
    model: defaultModel,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
    output_config: { format: zodOutputFormat(extractionSchema) },
  });

  let parsed = response.parsed_output as ExtractionResult | null;

  // Confidence-Retry mit dem stärkeren Modell.
  if (parsed && parsed.confidence < 0.7 && fallbackModel !== defaultModel) {
    modelUsed = fallbackModel;
    response = await anthropic.messages.parse({
      model: fallbackModel,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
      output_config: { format: zodOutputFormat(extractionSchema) },
    });
    parsed = response.parsed_output as ExtractionResult | null;
  }

  if (!parsed) {
    throw new Error(
      `Extraction returned no parsed_output (stop_reason=${response.stop_reason})`,
    );
  }

  return {
    result: parsed,
    modelUsed,
    preOcr,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
  };
}
