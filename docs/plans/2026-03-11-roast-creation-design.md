# Roast Creation Feature — Design

## Goal

Allow users to paste code, optionally enable "roast mode" for sarcasm, and get an AI-generated code analysis with score, verdict, analysis items, and a suggested fix. The result is persisted to the DB and displayed on a dedicated result page.

## Flow

```
User clicks "roast_my_code"
  -> Client: useMutation(trpc.roast.create)
  -> Server (tRPC mutation):
    1. Validate input (code, language, roastMode)
    2. Call generateText() with Output.object() + Zod schema
    3. Insert in transaction: roasts + analysisItems
    4. Return { id }
  -> Client: router.push('/roast/[id]')
  -> Result page: caller.roast.getById(id)
```

## Dependencies

- `ai` (Vercel AI SDK)
- `@ai-sdk/openai` (OpenAI provider)
- `OPENAI_API_KEY` in `.env.local`
- Model: `gpt-4o-mini`

## AI Structured Output

Use `generateText()` with `Output.object()` and a Zod schema:

```typescript
import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";

const { output } = await generateText({
  model: openai("gpt-4o-mini"),
  output: Output.object({
    schema: z.object({
      score: z.number().min(0).max(10),
      verdict: z.enum(["needs_serious_help", "rough_around_edges", "decent_code", "solid_work", "exceptional"]),
      roastQuote: z.string(),
      analysisItems: z.array(z.object({
        severity: z.enum(["critical", "warning", "good"]),
        title: z.string(),
        description: z.string(),
      })),
      suggestedFix: z.string(),
    }),
  }),
  system: "...", // varies by roastMode
  prompt: code,
});
```

## System Prompt

Two modes:
- **Normal:** Direct technical analysis, professional but honest.
- **Roast Mode:** Same technical analysis but with heavy sarcasm, developer humor, memorable roast quote.

The prompt instructs the AI to:
- Score the code 0-10 (0 = terrible, 10 = exceptional)
- Choose the correct verdict enum based on the score
- Generate 3-6 analysis items ordered by severity
- Generate a `suggestedFix` (the complete corrected/improved code)
- Roast mode: sarcastic roast quote; normal mode: direct quote

## tRPC Changes

### `roast.create` mutation

**Input:** `{ code: z.string().min(1).max(2000), language: z.string(), roastMode: z.boolean() }`

**Flow:**
1. `generateText()` with prompt + schema
2. Transaction: insert `roasts` with `.returning()`, then batch insert `analysisItems`
3. Return `{ id }`

### `roast.getById` query

**Input:** `{ id: z.string().uuid() }`
**Return:** Roast with analysisItems joined. Throws NOT_FOUND if missing.

## Client Integration (home-editor.tsx)

- `useMutation` with `trpc.roast.create.mutationOptions()`
- Button onClick triggers mutation with `{ code, language, roastMode }`
- Loading state: button disabled with "roasting..." text
- On success: `router.push('/roast/${data.id}')`
- On error: show feedback

## Result Page (/roast/[id]/page.tsx)

- Replace hardcoded mock data with `caller.roast.getById({ id })`
- Keep existing layout, connect with real data
- Diff viewer: compare `roast.code` vs `roast.suggestedFix` for diff lines

## Out of Scope

- Share roast functionality
- Rate limiting
- Streaming (synchronous mutation is sufficient)
- Authentication
