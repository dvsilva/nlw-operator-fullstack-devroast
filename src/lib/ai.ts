import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const model = openai("gpt-4o-mini");

export const roastOutputSchema = z.object({
  score: z.number().min(0).max(10),
  verdict: z.enum([
    "needs_serious_help",
    "rough_around_edges",
    "decent_code",
    "solid_work",
    "exceptional",
  ]),
  roastQuote: z.string(),
  analysisItems: z.array(
    z.object({
      severity: z.enum(["critical", "warning", "good"]),
      title: z.string(),
      description: z.string(),
    }),
  ),
  suggestedFix: z.string(),
});

export type RoastOutput = z.infer<typeof roastOutputSchema>;

export function getSystemPrompt(roastMode: boolean): string {
  const base = `You are an expert code reviewer. Analyze the submitted code and provide a structured review.

Rules:
- Score from 0.0 to 10.0 (one decimal place). 0 = catastrophic, 10 = flawless.
- Pick the verdict that matches the score:
  - 0-2: "needs_serious_help"
  - 2.1-4: "rough_around_edges"
  - 4.1-6: "decent_code"
  - 6.1-8: "solid_work"
  - 8.1-10: "exceptional"
- Generate 3-6 analysis items ordered by severity (critical first, then warning, then good).
  - Each item has a severity ("critical", "warning", or "good"), a short title, and a 1-2 sentence description.
- Generate a suggestedFix: the complete improved/corrected version of the submitted code. Keep the same language and intent but fix the issues you identified.
- The roastQuote is a one-liner summary of the code quality.`;

  if (roastMode) {
    return `${base}

ROAST MODE ENABLED: Be brutally sarcastic and funny. The roastQuote should be a memorable, savage one-liner that would make a developer cry-laugh. Analysis descriptions should be witty and cutting while still being technically accurate. Channel your inner senior developer who's seen too much bad code. Use developer humor, pop culture references, and exaggeration.`;
  }

  return `${base}

Be professional, direct, and constructive. The roastQuote should be an honest one-liner summary. Analysis descriptions should be clear and actionable.`;
}
