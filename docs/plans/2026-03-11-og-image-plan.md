# OG Image for Roast Results — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generate dynamic OpenGraph images for shareable roast result links using Takumi, and add dynamic metadata.

**Architecture:** A GET route handler at `/roast/[id]/opengraph-image` renders a JSX component via Takumi's `ImageResponse` to produce a 1200x630 PNG. The `/roast/[id]` page uses `generateMetadata` to reference this image and produce dynamic titles/descriptions.

**Tech Stack:** Takumi (`@takumi-rs/image-response`), Next.js 16 App Router, tRPC caller

---

### Task 1: Install Takumi and configure Next.js

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts:1-15`

**Step 1: Install the dependency**

Run: `pnpm add @takumi-rs/image-response`

**Step 2: Add `serverExternalPackages` to `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  serverExternalPackages: ["@takumi-rs/core"],
  cacheLife: {
    hourly: {
      stale: 3600,
      revalidate: 3600,
      expire: 86400,
    },
  },
};

export default nextConfig;
```

**Step 3: Verify the dev server starts**

Run: `pnpm dev`
Expected: No errors about missing modules or bundling issues. Kill the server after confirming.

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts
git commit -m "chore: install takumi and configure serverExternalPackages"
```

---

### Task 2: Create the OG image JSX component

**Files:**
- Create: `src/components/og/roast-og-image.tsx`

**Step 1: Create the score color helper and component**

The component uses Takumi's `tw` prop for Tailwind classes. It renders the OG card layout matching the Pencil design.

```tsx
function getScoreColor(score: number): string {
  if (score <= 3) return "#EF4444";
  if (score <= 6) return "#F59E0B";
  return "#10B981";
}

type RoastOgImageProps = {
  score: number;
  verdict: string;
  language: string;
  lineCount: number;
  roastQuote: string | null;
};

export function RoastOgImage({
  score,
  verdict,
  language,
  lineCount,
  roastQuote,
}: RoastOgImageProps) {
  const scoreColor = getScoreColor(score);

  return (
    <div
      tw="flex flex-col items-center justify-center w-full h-full"
      style={{
        backgroundColor: "#0C0C0C",
        padding: 64,
        gap: 28,
        fontFamily: "Geist Mono",
      }}
    >
      {/* Logo row */}
      <div tw="flex items-center" style={{ gap: 8 }}>
        <span
          tw="text-2xl font-bold"
          style={{ color: "#10B981" }}
        >
          {">"}
        </span>
        <span
          tw="text-xl font-medium"
          style={{ color: "#E5E5E5" }}
        >
          devroast
        </span>
      </div>

      {/* Score row */}
      <div tw="flex items-end" style={{ gap: 4 }}>
        <span
          tw="font-black"
          style={{
            fontSize: 160,
            lineHeight: 1,
            color: scoreColor,
          }}
        >
          {score.toString()}
        </span>
        <span
          style={{
            fontSize: 56,
            lineHeight: 1,
            color: "#4B5563",
          }}
        >
          /10
        </span>
      </div>

      {/* Verdict row */}
      <div tw="flex items-center" style={{ gap: 8 }}>
        <div
          tw="rounded-full"
          style={{
            width: 12,
            height: 12,
            backgroundColor: scoreColor,
          }}
        />
        <span
          tw="text-xl"
          style={{ color: scoreColor }}
        >
          {verdict}
        </span>
      </div>

      {/* Lang info */}
      <span
        style={{
          fontSize: 16,
          color: "#4B5563",
          fontFamily: "Geist Mono",
        }}
      >
        lang: {language} · {lineCount} lines
      </span>

      {/* Roast quote */}
      {roastQuote ? (
        <span
          tw="text-center"
          style={{
            fontSize: 22,
            lineHeight: 1.5,
            color: "#E5E5E5",
            fontFamily: "Geist",
            maxWidth: "100%",
          }}
        >
          &ldquo;{roastQuote}&rdquo;
        </span>
      ) : null}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/og/roast-og-image.tsx
git commit -m "feat: add OG image JSX component for roast results"
```

---

### Task 3: Create the route handler

**Files:**
- Create: `src/app/roast/[id]/opengraph-image/route.tsx`

**Step 1: Create the GET handler**

Note: file is `.tsx` because it renders JSX.

```tsx
import { ImageResponse } from "@takumi-rs/image-response";
import { TRPCError } from "@trpc/server";
import { RoastOgImage } from "@/components/og/roast-og-image";
import { caller } from "@/trpc/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const roast = await caller.roast.getById({ id });

    return new ImageResponse(
      <RoastOgImage
        score={roast.score}
        verdict={roast.verdict}
        language={roast.language}
        lineCount={roast.lineCount}
        roastQuote={roast.roastQuote}
      />,
      {
        width: 1200,
        height: 630,
        format: "png",
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      },
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return new Response("Roast not found", { status: 404 });
    }
    throw error;
  }
}
```

**Step 2: Verify manually**

Run: `pnpm dev`
Then open: `http://localhost:3000/roast/<an-existing-roast-id>/opengraph-image`
Expected: A PNG image is rendered in the browser showing the OG card with score, verdict, etc.

To find an existing roast ID, check the database or navigate to `/leaderboard` and click a roast — the URL will contain the UUID.

**Step 3: Commit**

```bash
git add src/app/roast/[id]/opengraph-image/route.tsx
git commit -m "feat: add OG image route handler using Takumi"
```

---

### Task 4: Add dynamic `generateMetadata` to the roast page

**Files:**
- Modify: `src/app/roast/[id]/page.tsx:1-17`

**Step 1: Replace static metadata with `generateMetadata`**

Remove lines 14-17 (the static `metadata` export) and add the `generateMetadata` function. Keep all other imports and the rest of the file unchanged.

Remove:
```typescript
export const metadata: Metadata = {
  title: "Roast Result — DevRoast",
  description: "See how your code scored on DevRoast — brutally honest.",
};
```

Add (after the imports, before `verdictToBadgeVariant`):
```typescript
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const roast = await caller.roast.getById({ id });

  const title = `${roast.score}/10 — ${roast.language} Roast — DevRoast`;
  const description =
    roast.roastQuote ?? "See how your code scored on DevRoast.";

  return {
    title,
    description,
    openGraph: {
      title: `${roast.score}/10 — ${roast.language} Roast`,
      description,
      images: [
        {
          url: `/roast/${id}/opengraph-image`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${roast.score}/10 — ${roast.language} Roast`,
      description,
    },
  };
}
```

**Step 2: Verify the metadata in the HTML**

Run: `pnpm dev`
Open: `http://localhost:3000/roast/<existing-id>`
View page source and look for:
- `<title>` containing the score and language (e.g., `3.5/10 — JavaScript Roast — DevRoast`)
- `<meta property="og:image"` pointing to `/roast/<id>/opengraph-image`
- `<meta name="twitter:card" content="summary_large_image"`

**Step 3: Commit**

```bash
git add src/app/roast/[id]/page.tsx
git commit -m "feat: add dynamic generateMetadata with OG and Twitter cards"
```

---

### Task 5: Build verification

**Files:** None (verification only)

**Step 1: Run the build**

Run: `pnpm build`
Expected: Build succeeds with no type errors. The route `/roast/[id]/opengraph-image` should appear in the build output as a dynamic route.

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No lint errors.

**Step 3: Final manual verification**

Run: `pnpm dev`
1. Navigate to a roast result page — verify the page still renders correctly
2. Open `/roast/<id>/opengraph-image` directly — verify the PNG image renders
3. View source on the roast page — verify og:image meta tag is present
4. Test with an invalid UUID — verify 404 response from OG route

**Step 4: Commit if any fixes were needed, then final commit**

```bash
git add -A
git commit -m "feat: complete OG image generation for roast results"
```
