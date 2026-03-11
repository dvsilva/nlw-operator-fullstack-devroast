# Roast Creation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to submit code and receive an AI-generated roast analysis with score, verdict, analysis items, suggested fix — persisted to DB and displayed on `/roast/[id]`.

**Architecture:** tRPC mutation calls Vercel AI SDK `generateText()` with `Output.object()` for structured output, inserts result in a Drizzle transaction (roasts + analysisItems), returns the id. Client redirects to the result page which fetches via `caller.roast.getById()`.

**Tech Stack:** Vercel AI SDK (`ai` + `@ai-sdk/openai`), tRPC v11, Drizzle ORM, Zod, Next.js 16 App Router

---

### Task 1: Install AI SDK dependencies and configure env

**Files:**
- Modify: `package.json` (via pnpm)
- Modify: `.env.local`

**Step 1: Install packages**

Run: `pnpm add ai @ai-sdk/openai`

**Step 2: Add OpenAI API key to `.env.local`**

Add `OPENAI_API_KEY=sk-...` to `.env.local` (user must provide their own key).

**Step 3: Verify install**

Run: `pnpm build`
Expected: Compiles successfully.

**Step 4: Commit**

```
feat: add Vercel AI SDK and OpenAI provider
```

---

### Task 2: Create AI module with structured output schema and system prompts

**Files:**
- Create: `src/lib/ai.ts`

**Step 1: Create the AI module**

This module exports the model instance, the Zod output schema, and the system prompt factory. The schema matches the DB schema exactly (verdictEnum, severityEnum values).

```typescript
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
    })
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
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Compiles. The module is not yet imported anywhere.

**Step 3: Commit**

```
feat: add AI module with roast output schema and system prompts
```

---

### Task 3: Add `roast.create` mutation and `roast.getById` query

**Files:**
- Modify: `src/trpc/routers/roast.ts`

**Step 1: Add the create mutation and getById query**

Import the AI SDK, the ai module, and the analysisItems schema. Add both procedures to the existing router.

The full updated file should be:

```typescript
import { generateText, Output } from "ai";
import { asc, avg, count, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { analysisItems, roasts } from "@/db/schema";
import { getSystemPrompt, model, roastOutputSchema } from "@/lib/ai";
import { baseProcedure, createTRPCRouter } from "../init";

export const roastRouter = createTRPCRouter({
  getStats: baseProcedure.query(async ({ ctx }) => {
    const [stats] = await ctx.db
      .select({
        totalRoasts: count(),
        avgScore: avg(roasts.score),
      })
      .from(roasts);

    return {
      totalRoasts: stats.totalRoasts,
      avgScore: stats.avgScore ? Number.parseFloat(stats.avgScore) : 0,
    };
  }),

  getLeaderboard: baseProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(3) }))
    .query(async ({ ctx, input }) => {
      const [entries, [{ total }]] = await Promise.all([
        ctx.db
          .select({
            id: roasts.id,
            code: roasts.code,
            score: roasts.score,
            language: roasts.language,
          })
          .from(roasts)
          .orderBy(asc(roasts.score))
          .limit(input.limit),
        ctx.db.select({ total: count() }).from(roasts),
      ]);

      return {
        entries: entries.map((entry, index) => ({
          ...entry,
          rank: index + 1,
          lineCount: entry.code.split("\n").length,
        })),
        totalCount: total,
      };
    }),

  create: baseProcedure
    .input(
      z.object({
        code: z.string().min(1).max(2000),
        language: z.string(),
        roastMode: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: roastOutputSchema }),
        system: getSystemPrompt(input.roastMode),
        prompt: `Language: ${input.language}\n\nCode:\n${input.code}`,
      });

      if (!output) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI failed to generate a valid response",
        });
      }

      const lineCount = input.code.split("\n").length;

      const [roast] = await ctx.db
        .insert(roasts)
        .values({
          code: input.code,
          language: input.language,
          lineCount,
          roastMode: input.roastMode,
          score: output.score,
          verdict: output.verdict,
          roastQuote: output.roastQuote,
          suggestedFix: output.suggestedFix,
        })
        .returning({ id: roasts.id });

      if (output.analysisItems.length > 0) {
        await ctx.db.insert(analysisItems).values(
          output.analysisItems.map((item, index) => ({
            roastId: roast.id,
            severity: item.severity,
            title: item.title,
            description: item.description,
            order: index,
          }))
        );
      }

      return { id: roast.id };
    }),

  getById: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [roast] = await ctx.db
        .select()
        .from(roasts)
        .where(eq(roasts.id, input.id));

      if (!roast) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Roast not found",
        });
      }

      const items = await ctx.db
        .select()
        .from(analysisItems)
        .where(eq(analysisItems.roastId, roast.id))
        .orderBy(asc(analysisItems.order));

      return {
        ...roast,
        analysisItems: items,
      };
    }),
});
```

Key decisions:
- `create` uses a flat transaction (insert roast, then insert analysisItems) — not wrapped in `db.transaction()` because the analysisItems insert depends on the roast id from `.returning()`, and if the second insert fails the orphan roast row is harmless.
- `getById` fetches roast + analysisItems in two sequential queries (the second depends on finding the roast). Returns NOT_FOUND if the roast doesn't exist.
- The AI prompt includes the language as context for better analysis.

**Step 2: Verify build**

Run: `pnpm build`
Expected: Compiles. The procedures aren't called from any page yet.

**Step 3: Commit**

```
feat: add roast.create mutation and roast.getById query
```

---

### Task 4: Wire up HomeEditor to call the create mutation

**Files:**
- Modify: `src/app/home-editor.tsx`

**Step 1: Add mutation and router**

The HomeEditor needs to:
1. Import `useMutation` from React Query and `useTRPC` from the tRPC client
2. Import `useRouter` from Next.js for navigation
3. Call the mutation on button click
4. Show loading state on the button
5. Navigate to `/roast/[id]` on success

Updated file:

```typescript
"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CodeEditor, MAX_CHARACTERS } from "@/components/code-editor";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useLanguageDetection } from "@/hooks/use-language-detection";
import { useTRPC } from "@/trpc/client";

function HomeEditor() {
  const [code, setCode] = useState("");
  const [roastMode, setRoastMode] = useState(true);
  const [manualLanguage, setManualLanguage] = useState<string | null>(null);
  const { detectedLanguage } = useLanguageDetection(code);

  const resolvedLanguage = manualLanguage ?? detectedLanguage;

  const router = useRouter();
  const trpc = useTRPC();
  const createRoast = useMutation(
    trpc.roast.create.mutationOptions({
      onSuccess(data) {
        router.push(`/roast/${data.id}`);
      },
    })
  );

  const isDisabled =
    code.trim().length === 0 ||
    code.length > MAX_CHARACTERS ||
    createRoast.isPending;

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <CodeEditor
        value={code}
        onChange={setCode}
        language={resolvedLanguage}
        onLanguageChange={setManualLanguage}
        className="w-full max-w-3xl"
      />

      {/* Actions Bar */}
      <div className="flex items-center justify-between w-full max-w-3xl">
        <div className="flex items-center gap-4">
          <Toggle
            checked={roastMode}
            onCheckedChange={setRoastMode}
            label="roast mode"
          />
          <span className="font-mono text-xs text-text-tertiary">
            {"// maximum sarcasm enabled"}
          </span>
        </div>

        <Button
          variant="primary"
          size="lg"
          disabled={isDisabled}
          onClick={() =>
            createRoast.mutate({
              code,
              language: resolvedLanguage,
              roastMode,
            })
          }
        >
          {createRoast.isPending ? "$ roasting..." : "$ roast_my_code"}
        </Button>
      </div>
    </div>
  );
}

export { HomeEditor };
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Compiles.

**Step 3: Commit**

```
feat: wire HomeEditor to roast.create mutation with loading state
```

---

### Task 5: Connect the roast result page to real data

**Files:**
- Modify: `src/app/roast/[id]/page.tsx`

**Step 1: Rewrite the page to use real data**

Replace the hardcoded mock data with `caller.roast.getById({ id })`. The page becomes async. The diff viewer compares `roast.code` (original) vs `roast.suggestedFix` (improved) — we need a simple diff function.

For the diff, use a line-by-line comparison: lines only in original are "removed", lines only in suggested are "added", matching lines are "context". A simple approach: split both into lines, iterate through them, and classify each line.

Create a utility function `computeDiffLines` that takes the original and suggested code and produces the diff lines array.

The updated page should:
1. Be async, accept `params` and extract `id`
2. Call `caller.roast.getById({ id })` 
3. Map `roast.verdict` to the correct Badge variant (the verdict enum values map directly to badge variants via a lookup: needs_serious_help/rough_around_edges -> critical, decent_code -> warning, solid_work/exceptional -> good)
4. Render analysisItems from the DB
5. Compute diff lines from `roast.code` vs `roast.suggestedFix`
6. Remove the hardcoded `roast` constant

```typescript
import type { Metadata } from "next";
import type { BundledLanguage } from "shiki";
import {
  AnalysisCardDescription,
  AnalysisCardRoot,
  AnalysisCardTitle,
} from "@/components/ui/analysis-card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";
import { DiffLine } from "@/components/ui/diff-line";
import { ScoreRing } from "@/components/ui/score-ring";
import { caller } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Roast Result — DevRoast",
  description: "See how your code scored on DevRoast — brutally honest.",
};

const verdictToBadgeVariant = {
  needs_serious_help: "critical",
  rough_around_edges: "critical",
  decent_code: "warning",
  solid_work: "good",
  exceptional: "good",
} as const;

type DiffLineType = "added" | "removed" | "context";

function computeDiffLines(
  original: string,
  suggested: string
): Array<{ type: DiffLineType; content: string }> {
  const originalLines = original.split("\n");
  const suggestedLines = suggested.split("\n");
  const lines: Array<{ type: DiffLineType; content: string }> = [];

  const maxLen = Math.max(originalLines.length, suggestedLines.length);

  for (let i = 0; i < maxLen; i++) {
    const orig = originalLines[i];
    const sugg = suggestedLines[i];

    if (orig === sugg) {
      lines.push({ type: "context", content: orig ?? "" });
    } else {
      if (orig !== undefined) {
        lines.push({ type: "removed", content: orig });
      }
      if (sugg !== undefined) {
        lines.push({ type: "added", content: sugg });
      }
    }
  }

  return lines;
}

export default async function RoastResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roast = await caller.roast.getById({ id });

  const badgeVariant = verdictToBadgeVariant[roast.verdict];
  const diffLines = roast.suggestedFix
    ? computeDiffLines(roast.code, roast.suggestedFix)
    : [];

  return (
    <main className="flex flex-col w-full">
      <div className="flex flex-col gap-10 w-full max-w-6xl mx-auto px-10 md:px-20 py-10">
        {/* Score Hero */}
        <section className="flex items-center gap-12">
          <ScoreRing score={roast.score} />

          <div className="flex flex-col gap-4 flex-1">
            <Badge variant={badgeVariant}>
              verdict: {roast.verdict}
            </Badge>

            <p className="font-mono text-xl leading-relaxed text-text-primary">
              {roast.roastQuote
                ? `"${roast.roastQuote}"`
                : "No quote available."}
            </p>

            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-text-tertiary">
                lang: {roast.language}
              </span>
              <span className="font-mono text-xs text-text-tertiary">
                {"·"}
              </span>
              <span className="font-mono text-xs text-text-tertiary">
                {roast.lineCount} lines
              </span>
            </div>
          </div>
        </section>

        {/* Divider */}
        <hr className="border-border-primary" />

        {/* Submitted Code Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-accent-green">
              {"//"}
            </span>
            <h2 className="font-mono text-sm font-bold text-text-primary">
              your_submission
            </h2>
          </div>

          <CodeBlock
            code={roast.code}
            lang={roast.language as BundledLanguage}
          />
        </section>

        {/* Divider */}
        <hr className="border-border-primary" />

        {/* Detailed Analysis Section */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-accent-green">
              {"//"}
            </span>
            <h2 className="font-mono text-sm font-bold text-text-primary">
              detailed_analysis
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {roast.analysisItems.map((item) => (
              <AnalysisCardRoot key={item.id}>
                <Badge variant={item.severity}>{item.severity}</Badge>
                <AnalysisCardTitle>{item.title}</AnalysisCardTitle>
                <AnalysisCardDescription>
                  {item.description}
                </AnalysisCardDescription>
              </AnalysisCardRoot>
            ))}
          </div>
        </section>

        {/* Suggested Fix Section */}
        {diffLines.length > 0 && (
          <>
            {/* Divider */}
            <hr className="border-border-primary" />

            <section className="flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-accent-green">
                  {"//"}
                </span>
                <h2 className="font-mono text-sm font-bold text-text-primary">
                  suggested_fix
                </h2>
              </div>

              <div className="border border-border-primary bg-bg-input overflow-hidden">
                {/* Diff Header */}
                <div className="flex items-center gap-2 h-10 px-4 border-b border-border-primary">
                  <span className="font-mono text-xs font-medium text-text-secondary">
                    your_code.{roast.language} → improved_code.{roast.language}
                  </span>
                </div>

                {/* Diff Body */}
                <div className="flex flex-col py-1">
                  {diffLines.map((line, i) => (
                    <DiffLine key={`diff-${i.toString()}`} type={line.type}>
                      {line.content}
                    </DiffLine>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Compiles. The page is now dynamic (server-rendered on demand) since it uses `params`.

**Step 3: Test manually**

1. Run `pnpm dev`
2. Paste code in the editor, click "roast_my_code"
3. Wait for redirect to `/roast/[id]`
4. Verify: score ring, verdict badge, quote, submitted code, analysis cards, suggested fix diff

**Step 4: Commit**

```
feat: connect roast result page to real data from DB
```
