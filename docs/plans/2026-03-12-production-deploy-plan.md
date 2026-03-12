# Production Deploy Plan — Vercel + Neon + OpenAI

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preparar o DevRoast para produção: corrigir bugs, adicionar error handling, rate limiting, migrar o driver do banco para Neon serverless, e fazer deploy na Vercel.

**Architecture:** Next.js 16 na Vercel (Node.js runtime), PostgreSQL no Neon (driver serverless via HTTP), OpenAI `gpt-4o-mini` via Vercel AI SDK, rate limiting com Upstash Redis.

**Tech Stack:** Next.js 16, tRPC v11, Drizzle ORM + Neon serverless driver, Upstash Redis (rate limit), Vercel AI SDK, Zod, Tailwind CSS v4

---

## Resumo das pendências encontradas

### Bugs / Erros no código
1. **Mutation errors não exibidos ao usuário** — `home-editor.tsx` não tem `onError` nem exibe `createRoast.error`
2. **Double DB query no roast detail** — `generateMetadata` e `RoastResultPage` chamam `caller.roast.getById` separadamente (sem dedup)
3. **`language` input sem validação** — aceita qualquer string, pode causar crash no shiki com `as BundledLanguage`
4. **`OPENAI_API_KEY` não validada no startup** — erro só aparece em runtime quando o usuário faz submit
5. **AI schema sem limites de tamanho** — `title` pode exceder `varchar(200)` do banco, causando erro 500
6. **Missing index em `analysis_items.roast_id`** — scan sequencial conforme tabela cresce
7. **Unhandled promises** nos hooks `use-shiki-highlighter.ts` e `use-language-detection.ts`

### Configuração de produção ausente
8. **Nenhum `error.tsx`** — erros mostram página padrão do Next.js sem styling
9. **Nenhum `not-found.tsx`** — 404 genérico sem identidade visual
10. **Nenhum `loading.tsx`** para `/roast/[id]`
11. **No rate limiting** na mutation `roast.create` — risco de abuso e custos descontrolados
12. **Driver `pg` (node-postgres)** não é ideal para Neon serverless — problemas de conexão e cold start
13. **Sem `.env.example`** — novos devs não sabem que variáveis configurar
14. **Sem `maxTokens`** na chamada da AI — custos imprevisíveis
15. **Sem timeout** na chamada da AI — pode travar a request indefinidamente

---

### Task 1: Migrar driver do banco para Neon serverless

**Files:**
- Modify: `package.json` (via pnpm)
- Modify: `src/db/index.ts`

**Step 1: Instalar o driver do Neon e remover pg**

Run: `pnpm add @neondatabase/serverless && pnpm remove pg @types/pg`

**Step 2: Atualizar `src/db/index.ts`**

Substituir o driver `node-postgres` pelo driver HTTP do Neon (ideal para serverless — sem TCP, sem WebSocket, sem pool):

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, {
  casing: "snake_case",
});
```

Obs: `drizzle.config.ts` não muda — drizzle-kit roda localmente/CI, não em serverless, e se conecta direto via URL.

**Step 3: Verificar build**

Run: `pnpm build`
Expected: Compila sem erros.

**Step 4: Commit**

```
feat: migrate database driver from node-postgres to neon serverless
```

---

### Task 2: Adicionar rate limiting com Upstash Redis

**Files:**
- Modify: `package.json` (via pnpm)
- Create: `src/lib/rate-limit.ts`
- Modify: `src/trpc/init.ts`
- Modify: `src/trpc/routers/roast.ts`

**Step 1: Instalar dependências**

Run: `pnpm add @upstash/ratelimit @upstash/redis`

**Step 2: Criar módulo de rate limit**

Create `src/lib/rate-limit.ts`:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createRateLimiter() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const redis = new Redis({ url, token });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "60 s"),
    analytics: true,
    prefix: "devroast:ratelimit",
  });
}

export const rateLimiter = createRateLimiter();
```

O rate limiter retorna `null` em dev se as env vars não existirem, permitindo desenvolvimento sem Redis.

**Step 3: Adicionar IP ao contexto do tRPC**

Modify `src/trpc/init.ts` para incluir o IP do request no contexto:

```typescript
import { initTRPC } from "@trpc/server";
import { cache } from "react";
import { headers } from "next/headers";
import { db } from "@/db";

export const createTRPCContext = cache(async () => {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  return { db, ip };
});

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
```

**Step 4: Adicionar rate limit check na mutation `roast.create`**

Modify `src/trpc/routers/roast.ts` — adicionar check antes do `generateText`:

```typescript
// No topo do arquivo, adicionar import:
import { rateLimiter } from "@/lib/rate-limit";

// Dentro da mutation create, antes do generateText:
if (rateLimiter) {
  const { success } = await rateLimiter.limit(ctx.ip);

  if (!success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Calma aí, cowboy! Você já fritou código demais. Volte em 1 minuto.",
    });
  }
}
```

**Step 5: Verificar build**

Run: `pnpm build`
Expected: Compila. Rate limiter retorna `null` em dev (sem Redis).

**Step 6: Commit**

```
feat: add rate limiting with Upstash Redis on roast.create mutation
```

---

### Task 3: Corrigir bugs e hardening da AI

**Files:**
- Modify: `src/lib/ai.ts`
- Modify: `src/trpc/routers/roast.ts`
- Modify: `src/db/schema.ts`
- Modify: `src/app/roast/[id]/page.tsx`

**Step 1: Validar `OPENAI_API_KEY` no módulo AI**

Modify `src/lib/ai.ts` — adicionar validação no topo do módulo:

```typescript
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

export const model = openai("gpt-4o-mini");
```

**Step 2: Adicionar limites de tamanho no `roastOutputSchema`**

Modify `src/lib/ai.ts` — adicionar `.max()` nos campos string para casar com o schema do banco:

```typescript
export const roastOutputSchema = z.object({
  score: z.number().min(0).max(10),
  verdict: z.enum([
    "needs_serious_help",
    "rough_around_edges",
    "decent_code",
    "solid_work",
    "exceptional",
  ]),
  roastQuote: z.string().max(500),
  analysisItems: z.array(
    z.object({
      severity: z.enum(["critical", "warning", "good"]),
      title: z.string().max(200),
      description: z.string().max(2000),
    }),
  ),
  suggestedFix: z.string().max(5000),
});
```

**Step 3: Validar `language` contra lista conhecida e adicionar `maxTokens`**

Modify `src/trpc/routers/roast.ts`:

- Importar `LANGUAGES` de `@/lib/languages`
- Mudar validação do `language` para `.refine(key => key in LANGUAGES, "Invalid language")`
- Adicionar `maxTokens: 2000` no `generateText`

```typescript
import { LANGUAGES } from "@/lib/languages";

// No input da mutation create:
language: z.string().refine((key) => key in LANGUAGES, "Invalid language"),

// Na chamada generateText:
const { output } = await generateText({
  model,
  maxTokens: 2000,
  output: Output.object({ schema: roastOutputSchema }),
  system: getSystemPrompt(input.roastMode),
  prompt: `Language: ${input.language}\n\nCode:\n${input.code}`,
});
```

**Step 4: Adicionar index em `analysis_items.roast_id`**

Modify `src/db/schema.ts`:

```typescript
export const analysisItems = pgTable(
  "analysis_items",
  {
    id: uuid().defaultRandom().primaryKey(),
    roastId: uuid()
      .references(() => roasts.id, { onDelete: "cascade" })
      .notNull(),
    severity: severityEnum().notNull(),
    title: varchar({ length: 200 }).notNull(),
    description: text().notNull(),
    order: integer().notNull(),
  },
  (table) => [index("analysis_items_roast_id_idx").on(table.roastId)],
);
```

Depois gerar a migration:

Run: `pnpm db:generate`

**Step 5: Corrigir double query no roast detail com `cache()`**

Modify `src/app/roast/[id]/page.tsx` — adicionar `cache()` do React para deduplicar:

```typescript
import { cache } from "react";

// Após imports, antes de verdictToBadgeVariant:
const getRoast = cache((id: string) => caller.roast.getById({ id }));

// Em generateMetadata, trocar:
// const roast = await caller.roast.getById({ id });
const roast = await getRoast(id);

// Em RoastResultPage, trocar:
// const roast = await caller.roast.getById({ id });
const roast = await getRoast(id);
```

**Step 6: Verificar build**

Run: `pnpm build`
Expected: Compila sem erros.

**Step 7: Commit**

```
fix: validate OPENAI_API_KEY, add AI output limits, language validation, DB index, and dedup roast query
```

---

### Task 4: Error handling — exibir erros da mutation e corrigir unhandled promises

**Files:**
- Modify: `src/app/home-editor.tsx`
- Modify: `src/hooks/use-shiki-highlighter.ts`
- Modify: `src/hooks/use-language-detection.ts`

**Step 1: Exibir erro da mutation no HomeEditor com mensagens sarcásticas**

Modify `src/app/home-editor.tsx` — adicionar função de mapeamento de erros e exibição:

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

function getErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes("too_many_requests") || message.includes("rate")) {
    return "// calma, cowboy! muitos roasts por minuto. respire fundo e tente novamente.";
  }

  if (message.includes("quota") || message.includes("billing") || message.includes("insufficient")) {
    return "// fizeram tanto roast de código que os créditos da IA acabaram. parabéns, devs.";
  }

  if (message.includes("timeout") || message.includes("aborted")) {
    return "// a IA travou analisando seu código. deve ter sido tão ruim que ela desistiu.";
  }

  return "// ops, algo deu errado. até a IA tem dias ruins. tente novamente.";
}

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
    }),
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
      <div className="flex flex-col items-end gap-3 w-full max-w-3xl">
        <div className="flex items-center justify-between w-full">
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
                language: resolvedLanguage ?? "javascript",
                roastMode,
              })
            }
          >
            {createRoast.isPending ? "$ roasting..." : "$ roast_my_code"}
          </Button>
        </div>

        {createRoast.isError && (
          <p className="font-mono text-xs text-accent-red">
            {getErrorMessage(createRoast.error)}
          </p>
        )}
      </div>
    </div>
  );
}

export { HomeEditor };
```

**Step 2: Corrigir unhandled promises nos hooks**

Modify `src/hooks/use-shiki-highlighter.ts` — encontrar o trecho com `.then(() => setLangVersion((v) => v + 1))` e adicionar `.catch(() => {})`:

```typescript
ensureLanguageLoaded(highlighter, shikiId)
  .then(() => setLangVersion((v) => v + 1))
  .catch(() => {});
```

Modify `src/hooks/use-language-detection.ts` — encontrar `getHljs().then(...)` e adicionar `.catch(() => {})`:

```typescript
getHljs()
  .then((hljs) => { /* existing logic */ })
  .catch(() => {});
```

**Step 3: Verificar build**

Run: `pnpm build`
Expected: Compila.

**Step 4: Commit**

```
feat: add sarcastic error messages for mutation failures and fix unhandled promises
```

---

### Task 5: Criar error boundaries, not-found e loading pages

**Files:**
- Create: `src/app/error.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/roast/[id]/loading.tsx`
- Create: `src/app/roast/[id]/error.tsx`

**Step 1: Criar error boundary global**

Create `src/app/error.tsx`:

```tsx
"use client";

function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-10">
      <span className="font-mono text-6xl text-accent-red">{"x"}</span>

      <div className="flex flex-col items-center gap-2">
        <h1 className="font-mono text-xl font-bold text-text-primary">
          fatal_error
        </h1>
        <p className="font-mono text-sm text-text-secondary text-center max-w-md">
          {"// algo quebrou feio. nem o roast mode conseguiria zoar esse bug."}
        </p>
      </div>

      <button
        type="button"
        onClick={reset}
        className="font-mono text-sm text-accent-green hover:underline"
      >
        {"$ try_again"}
      </button>
    </main>
  );
}

export default GlobalError;
```

**Step 2: Criar 404 customizado**

Create `src/app/not-found.tsx`:

```tsx
import Link from "next/link";

function NotFoundPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-10">
      <span className="font-mono text-6xl text-text-tertiary">404</span>

      <div className="flex flex-col items-center gap-2">
        <h1 className="font-mono text-xl font-bold text-text-primary">
          page_not_found
        </h1>
        <p className="font-mono text-sm text-text-secondary text-center max-w-md">
          {"// essa página não existe. talvez seu código tenha deletado ela."}
        </p>
      </div>

      <Link
        href="/"
        className="font-mono text-sm text-accent-green hover:underline"
      >
        {"$ cd ~"}
      </Link>
    </main>
  );
}

export default NotFoundPage;
```

**Step 3: Criar error boundary para roast detail**

Create `src/app/roast/[id]/error.tsx`:

```tsx
"use client";

import Link from "next/link";

function RoastError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isNotFound =
    error.message.includes("NOT_FOUND") ||
    error.message.includes("not found");

  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-10">
      <span className="font-mono text-6xl text-accent-red">
        {isNotFound ? "?" : "x"}
      </span>

      <div className="flex flex-col items-center gap-2">
        <h1 className="font-mono text-xl font-bold text-text-primary">
          {isNotFound ? "roast_not_found" : "roast_crashed"}
        </h1>
        <p className="font-mono text-sm text-text-secondary text-center max-w-md">
          {isNotFound
            ? "// esse roast não existe. ou foi tão ruim que a IA apagou da memória."
            : "// o servidor tropeçou tentando carregar esse roast. acontece."}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {!isNotFound && (
          <button
            type="button"
            onClick={reset}
            className="font-mono text-sm text-accent-green hover:underline"
          >
            {"$ retry"}
          </button>
        )}

        <Link
          href="/"
          className="font-mono text-sm text-text-secondary hover:text-text-primary hover:underline"
        >
          {"$ cd ~"}
        </Link>
      </div>
    </main>
  );
}

export default RoastError;
```

**Step 4: Criar loading skeleton para roast detail**

Create `src/app/roast/[id]/loading.tsx`:

```tsx
function RoastLoading() {
  return (
    <main className="flex flex-col w-full">
      <div className="flex flex-col gap-10 w-full max-w-6xl mx-auto px-10 md:px-20 py-10">
        {/* Score Hero Skeleton */}
        <section className="flex items-center gap-12">
          <div className="w-[180px] h-[180px] rounded-full bg-bg-elevated animate-pulse shrink-0" />

          <div className="flex flex-col gap-4 flex-1">
            <div className="h-6 w-32 bg-bg-elevated animate-pulse rounded" />
            <div className="h-6 w-full max-w-md bg-bg-elevated animate-pulse rounded" />
            <div className="h-4 w-40 bg-bg-elevated animate-pulse rounded" />
          </div>
        </section>

        <hr className="border-border-primary" />

        {/* Code Block Skeleton */}
        <section className="flex flex-col gap-4">
          <div className="h-5 w-40 bg-bg-elevated animate-pulse rounded" />
          <div className="h-48 w-full bg-bg-elevated animate-pulse rounded" />
        </section>

        <hr className="border-border-primary" />

        {/* Analysis Cards Skeleton */}
        <section className="flex flex-col gap-6">
          <div className="h-5 w-48 bg-bg-elevated animate-pulse rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`skeleton-${i.toString()}`}
                className="h-32 bg-bg-elevated animate-pulse rounded"
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default RoastLoading;
```

**Step 5: Verificar build**

Run: `pnpm build`
Expected: Compila.

**Step 6: Commit**

```
feat: add error boundaries, 404 page, and loading skeleton for roast detail
```

---

### Task 6: Criar `.env.example` e ajustes finais de configuração

**Files:**
- Create: `.env.example`
- Modify: `src/app/layout.tsx` (fallback no Suspense)

**Step 1: Criar `.env.example`**

```env
# Database — Neon PostgreSQL (use the pooled connection string)
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.neon.tech/dbname?sslmode=require

# OpenAI — API key for code analysis
OPENAI_API_KEY=sk-...

# Upstash Redis — Rate limiting (optional in dev, required in production)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

**Step 2: Adicionar fallback no Suspense do layout**

Modify `src/app/layout.tsx` — trocar `<Suspense>` por `<Suspense fallback={<div className="min-h-screen bg-bg-page" />}>`.

**Step 3: Commit**

```
chore: add .env.example and Suspense fallback in root layout
```

---

### Task 7: Lint e build final

**Files:** Nenhum (apenas verificação)

**Step 1: Rodar o linter**

Run: `pnpm lint`
Expected: Sem erros. Se houver, corrigir.

**Step 2: Rodar o build**

Run: `pnpm build`
Expected: Build bem-sucedido sem erros de tipo.

**Step 3: Commit de fixes se necessário**

```
fix: address lint issues
```

---

### Task 8: Setup das plataformas e deploy

Esta task é manual (não é código). Seguir as instruções abaixo:

#### 8.1 — Criar projeto no Neon

1. Acesse [neon.tech](https://neon.tech) e crie uma conta (ou faça login)
2. Clique em **"New Project"**
3. Nomeie o projeto como `devroast`
4. Selecione a região mais próxima (ex: `us-east-2` ou `sa-east-1` para Brasil)
5. Após a criação, copie a **pooled connection string** (a que tem `-pooler` no hostname)
6. O formato será: `postgresql://user:pass@ep-xxx-pooler.region.neon.tech/neondb?sslmode=require`

#### 8.2 — Rodar migrations no Neon

Localmente, crie um `.env.local` com a `DATABASE_URL` do Neon:

```env
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.neon.tech/neondb?sslmode=require
OPENAI_API_KEY=sk-...
```

Depois rode:

```bash
pnpm db:push
```

Obs: usar `db:push` (não `db:migrate`) para a primeira aplicação no Neon, pois é mais simples e aplica o schema diretamente. Para futuras alterações em produção, usar `db:migrate`.

#### 8.3 — Criar projeto no Upstash

1. Acesse [upstash.com](https://upstash.com) e crie uma conta (ou faça login)
2. Vá em **Redis** → **Create Database**
3. Nomeie como `devroast`
4. Selecione a região mais próxima
5. Copie os valores de `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`

#### 8.4 — Criar projeto na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New..."** → **"Project"**
3. Importe o repositório do GitHub (`nlw-operator-fullstack-devroast`)
4. Framework: Next.js (auto-detectado)
5. Em **"Environment Variables"**, adicione:
   - `DATABASE_URL` = (pooled connection string do Neon)
   - `OPENAI_API_KEY` = (sua chave da OpenAI)
   - `UPSTASH_REDIS_REST_URL` = (URL do Upstash)
   - `UPSTASH_REDIS_REST_TOKEN` = (token do Upstash)
6. Clique em **"Deploy"**

#### 8.5 — Verificação pós-deploy

Após o deploy:

1. Acesse a URL do deploy e verifique a home page carrega
2. Verifique que o leaderboard carrega (testa conexão com o Neon)
3. Cole um código e faça um roast (testa OpenAI + DB insert)
4. Verifique que o resultado aparece em `/roast/[id]`
5. Acesse `/roast/[id]/opengraph-image` diretamente para verificar a geração da imagem OG
6. Teste enviar 6+ roasts em menos de 1 minuto para verificar o rate limiting
7. Acesse uma URL inválida (ex: `/nao-existe`) para verificar o 404 customizado
8. Acesse um roast inválido (ex: `/roast/00000000-0000-0000-0000-000000000000`) para verificar o error boundary

---

## Variáveis de ambiente completas

| Variável | Obrigatória | Onde configurar | Descrição |
|---|---|---|---|
| `DATABASE_URL` | Sim | Vercel + `.env.local` | Connection string do Neon (usar pooled endpoint) |
| `OPENAI_API_KEY` | Sim | Vercel + `.env.local` | Chave da API da OpenAI |
| `UPSTASH_REDIS_REST_URL` | Produção | Vercel | URL REST do Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Produção | Vercel | Token REST do Upstash Redis |
| `VERCEL_URL` | Auto | Vercel (automático) | Definida automaticamente pela Vercel |

## Riscos

- **Fontes no OG Image**: O `@takumi-rs/image-response` referencia `fontFamily: "Geist Mono"` e `"Geist"`. Se o Takumi não incluir essas fontes, as OG images usarão fallback fonts. Testar após o primeiro deploy e, se necessário, fornecer os arquivos de fonte.
- **Cold starts**: Funções serverless na Vercel podem ter cold start de ~1-3s. A primeira chamada de roast após período de inatividade será mais lenta.
- **Custos OpenAI**: Mesmo com rate limiting (5 requests/minuto por IP), uma base de usuários grande pode gerar custos significativos. Monitorar o dashboard da OpenAI.
