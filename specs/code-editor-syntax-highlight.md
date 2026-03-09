# Spec: Editor com Syntax Highlight

## Resumo

Transformar o `CodeEditor` atual (textarea simples) em um editor com syntax highlight client-side. Quando o usuario colar ou digitar codigo, as cores devem ser aplicadas em tempo real conforme a linguagem, que deve ser detectada automaticamente. O usuario tambem pode selecionar a linguagem manualmente.

---

## Pesquisa realizada

### Abordagens de editor analisadas

| Abordagem | Bundle (gzip) | Descricao | Veredicto |
|---|---|---|---|
| **Textarea overlay** (ray-so) | ~0 KB (editor em si) | Textarea transparente sobre `<div>` com HTML destacado | **Recomendado** |
| **CodeMirror 6** | ~119 KB | Editor modular completo, undo/redo, bracket matching | Overkill para o caso |
| **Monaco Editor** | ~860 KB | VS Code no browser, IntelliSense, workers | Descartado, muito pesado |

### Bibliotecas de syntax highlight

| Biblioteca | Bundle (gzip) | Engine | Auto-detect | Veredicto |
|---|---|---|---|---|
| **Shiki** (v4, ja no projeto) | ~34 KB core | TextMate grammars | Nao | **Usar para rendering** |
| **highlight.js** (v11) | ~30 KB (core + 15 langs) | Regex + relevance scoring | Sim (`highlightAuto`) | **Usar para deteccao** |
| **Prism.js** | ~30 KB (10 langs) | Regex | Nao | Descartado, inferior ao Shiki |

### Deteccao automatica de linguagem

| Opcao | Viabilidade | Notas |
|---|---|---|
| **highlight.js `highlightAuto`** | Producao | Unica opcao viavel no browser. Retorna `{ language, relevance }` |
| **Shiki** | Nao tem | Requer `lang` explicito, nao tem auto-detect |
| **guesslang (TensorFlow)** | Inviavel | Modelo de ~5 MB, heavy demais |
| **Linguist (GitHub)** | Inviavel | Ruby-based, nao roda no browser |

---

## Decisao: arquitetura recomendada

Seguir a mesma abordagem do **ray-so**: textarea overlay + Shiki para rendering + highlight.js apenas para deteccao de linguagem.

```
+--------------------------------------------------+
|  Textarea (transparente, z-index: 2)             |
|  - Recebe input do usuario (paste/type)          |
|  - caret-color visivel, texto invisivel          |
+--------------------------------------------------+
|  Div highlighted (z-index: 1)                    |
|  - HTML gerado pelo Shiki                        |
|  - Tema vesper (mesmo do CodeBlock RSC)          |
+--------------------------------------------------+
|  highlight.js (deteccao apenas)                  |
|  - hljs.highlightAuto() em cada mudanca          |
|  - Debounce de ~300ms                            |
|  - Resultado alimenta o Shiki                    |
+--------------------------------------------------+
```

### Por que essa combinacao

1. **Shiki ja esta no projeto** (v4.0.1) com tema vesper no `CodeBlock` RSC. Reutilizar mantém consistencia visual.
2. **Shiki JS RegExp engine** — Desde v3.9.1, Shiki suporta engine JavaScript nativa (sem WASM Oniguruma de 1.2 MB). Ideal para uso client-side.
3. **highlight.js so para deteccao** — `highlightAuto` e a unica solucao viavel de auto-detect no browser. Importar apenas o core + subset de linguagens (~30 KB gzip).
4. **Textarea overlay e suficiente** — O caso de uso e "colar codigo e ver highlight". Nao precisa de features de IDE.

### Estimativa de bundle

| Componente | Gzip estimado |
|---|---|
| Shiki core (JS engine, client) | ~34 KB |
| Shiki tema vesper | ~5 KB |
| Shiki linguagens (lazy, por demanda) | ~5-20 KB cada |
| highlight.js core + ~15 linguagens | ~30 KB |
| **Total inicial** | **~70 KB** |

---

## Como o ray-so faz (referencia)

O ray-so usa exatamente essa arquitetura. Os pontos chave do codigo deles:

### Editor (textarea overlay)
- `<textarea>` e `<div class="formatted">` no mesmo grid cell (`grid-area: 1/1/2/2`)
- Textarea: `z-index: 2`, `background: transparent`, `-webkit-text-fill-color: transparent`, `caret-color: var(--ray-foreground)`
- O `<div>` renderiza o HTML do Shiki embaixo
- `document.execCommand` para manipulacoes de texto (preserva undo/redo nativo)

### Temas
- Criam um tema Shiki baseado em CSS variables (`--ray-token-keyword`, etc.)
- Cada tema define as cores reais via inline styles no wrapper
- Troca de tema e instantanea (sem re-highlight)

### Linguagens
- Carregam apenas 4 linguagens iniciais (JS, TSX, Swift, Python)
- Demais sao lazy-loaded via dynamic import: `() => import("shiki/langs/rust.mjs")`
- Mapa de linguagens com nome, extensao, e `src()` para import dinamico

### Deteccao
- `hljs.highlightAuto(code, Object.keys(LANGUAGES))` — restringe ao subset registrado
- Prioridade: linguagem manual do usuario > linguagem do sample > auto-detect

---

## Especificacao de implementacao

### Linguagens suportadas (subset para deteccao + highlight)

**Tier 1 — carregadas no bundle inicial:**
- JavaScript / JSX
- TypeScript / TSX

**Tier 2 — lazy-loaded, registradas no highlight.js para deteccao:**
- Python
- Go
- Rust
- Java
- Ruby
- PHP
- SQL
- Shell / Bash
- HTML
- CSS
- JSON
- YAML
- Markdown
- C / C++
- C#
- Swift
- Kotlin
- Dart

### Componentes a criar/modificar

#### 1. `src/components/code-editor.tsx` (modificar)

Transformar o editor atual em textarea overlay com highlight. Mudancas:

- Manter a estrutura visual existente (window header com dots, line numbers)
- Substituir o textarea puro por um sistema de overlay:
  - `<textarea>` transparente para captura de input (mantém acessibilidade e undo/redo nativo)
  - `<div>` posicionado atras com o HTML highlighted do Shiki
  - Ambos no mesmo container com CSS grid (`grid-area: 1/1`)
- Novas props:
  - `language?: string` — linguagem selecionada manualmente (override do auto-detect)
  - `detectedLanguage?: string` — callback ou estado da linguagem detectada
  - `onLanguageChange?: (lang: string) => void` — notifica o parent da linguagem atual

#### 2. `src/hooks/use-shiki-highlighter.ts` (criar)

Hook para gerenciar a instancia do Shiki client-side:

```typescript
// Pseudocodigo da API
function useShikiHighlighter() {
  // Inicializa Shiki com JS engine (sem WASM)
  // Carrega tema vesper
  // Pre-carrega JS/TS
  // Retorna funcao de highlight e loading state
  return {
    highlight: (code: string, lang: string) => string, // retorna HTML
    isReady: boolean,
    loadLanguage: (lang: string) => Promise<void>,
  }
}
```

Detalhes:
- Usar `shiki/bundle/web` com `createHighlighterCore` e engine JavaScript (`shiki/engine/javascript`)
- Carregar tema vesper inicialmente
- Manter singleton da instancia (evitar recriar em re-renders)
- Lazy-load linguagens conforme necessario via `highlighter.loadLanguage()`

#### 3. `src/hooks/use-language-detection.ts` (criar)

Hook para auto-deteccao de linguagem via highlight.js:

```typescript
// Pseudocodigo da API
function useLanguageDetection(code: string) {
  // Importa hljs/lib/core + linguagens do subset
  // Roda highlightAuto com debounce de 300ms
  // Retorna linguagem detectada
  return {
    detectedLanguage: string | null,
    confidence: number, // relevance score do hljs
  }
}
```

Detalhes:
- Importar `hljs/lib/core` (nao o bundle completo)
- Registrar apenas as linguagens do subset listado acima
- Debounce de ~300ms no `highlightAuto` para evitar execucoes excessivas
- `highlightAuto` e O(n * linguagens) — com ~18 linguagens, e rapido o suficiente
- Retornar `null` se confidence < threshold (evitar falsos positivos)

#### 4. `src/app/home-editor.tsx` (modificar)

Integrar deteccao e selecao de linguagem:

- Adicionar estado para linguagem selecionada manualmente
- Usar `useLanguageDetection` para auto-detect
- Prioridade: `manualLanguage ?? detectedLanguage ?? "plaintext"`
- Adicionar seletor de linguagem no actions bar (dropdown ou combobox)
- Mostrar linguagem detectada como badge/indicador visual

#### 5. `src/lib/languages.ts` (criar)

Mapa centralizado de linguagens suportadas:

```typescript
// Pseudocodigo
export const LANGUAGES = {
  javascript: {
    name: "JavaScript",
    shikiId: "javascript",
    hljsId: "javascript",
    aliases: ["js", "jsx"],
    src: () => import("shiki/langs/javascript.mjs"),
  },
  // ...
} as const;
```

### CSS do overlay

Tecnica core para o textarea overlay:

```css
/* Container do editor (code area) */
.editor-grid {
  display: grid;
}

/* Textarea e highlighted div no mesmo cell */
.editor-grid > * {
  grid-area: 1 / 1 / 2 / 2;
}

/* Textarea: transparente, mas recebe input */
.editor-textarea {
  z-index: 2;
  background: transparent;
  -webkit-text-fill-color: transparent;
  caret-color: var(--color-text-primary); /* ou accent-green */
  resize: none;
  outline: none;
}

/* Div com highlight: renderiza embaixo */
.editor-highlighted {
  z-index: 1;
  pointer-events: none;
  white-space: pre;
  overflow: hidden;
}
```

Pontos criticos:
- **Font, font-size, line-height, padding** devem ser identicos entre textarea e div
- **Scroll sync**: se o conteudo exceder o container, o scroll do textarea deve ser sincronizado com o div highlighted
- **Tab size**: ambos devem usar `tab-size: 2`

### Scroll sync

O textarea e o div highlighted precisam ter scroll sincronizado:

```typescript
// No onScroll do textarea:
const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
  if (highlightedRef.current) {
    highlightedRef.current.scrollTop = e.currentTarget.scrollTop;
    highlightedRef.current.scrollLeft = e.currentTarget.scrollLeft;
  }
};
```

### Rendering do Shiki no client

Duas opcoes para renderizar o output do Shiki:

**Opcao A — `dangerouslySetInnerHTML` (simples)**
```typescript
const html = highlighter.codeToHtml(code, { lang, theme: "vesper" });
return <div dangerouslySetInnerHTML={{ __html: html }} />;
```

**Opcao B — HAST para JSX (seguro, mais controle)**
```typescript
import { codeToHast } from "shiki";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { jsx, jsxs, Fragment } from "react/jsx-runtime";

const hast = highlighter.codeToHast(code, { lang, theme: "vesper" });
const element = toJsxRuntime(hast, { jsx, jsxs, Fragment });
return <div>{element}</div>;
```

A opcao B e preferivel por seguranca e permite customizar tokens individuais, mas a opcao A e mais simples e suficiente para o caso.

---

## Dependencias novas

| Pacote | Motivo | Estimativa |
|---|---|---|
| `highlight.js` | Auto-deteccao de linguagem (`highlightAuto`) | ~30 KB gzip (core + subset) |

**Nota**: Shiki (v4.0.1) ja esta no projeto. Nao precisa instalar. So precisa importar de forma diferente para uso client-side (`shiki/bundle/web` + JS engine).

---

## Riscos e consideracoes

1. **Scroll sync pode ter edge cases** — Fontes nao-monospace, zoom do browser, ou line wrapping podem causar desalinhamento entre textarea e div. Mitigar forçando `white-space: pre` e `overflow: auto` em ambos.

2. **Performance do highlight em codigos grandes** — Shiki pode ser lento em arquivos >500 linhas. Mitigar com debounce no highlight (separado do debounce de deteccao). Considerar limitar o tamanho maximo do input.

3. **highlight.js `highlightAuto` falsos positivos** — Com snippets curtos (<5 linhas), a deteccao pode errar. Mitigar mostrando a linguagem detectada para o usuario e permitindo override manual facil.

4. **Bundle size do Shiki client-side** — Mesmo com JS engine, cada linguagem e um chunk. Lazy-loading resolve isso, mas a primeira renderizacao de uma linguagem nova tera um delay de carregamento.

5. **Mobile** — Textarea overlay pode ter comportamento imprevisivel em mobile (teclado virtual, selecao de texto). Testar e considerar fallback simples para mobile se necessario.

---

## TODOs de implementacao

- [ ] Instalar `highlight.js` como dependencia
- [ ] Criar `src/lib/languages.ts` com mapa de linguagens (Shiki IDs, hljs IDs, aliases, dynamic imports)
- [ ] Criar `src/hooks/use-shiki-highlighter.ts` — singleton do Shiki client-side com JS engine + tema vesper
- [ ] Criar `src/hooks/use-language-detection.ts` — auto-detect via hljs core com debounce
- [ ] Modificar `src/components/code-editor.tsx` — implementar textarea overlay com grid CSS
- [ ] Garantir sync perfeito de font/padding/line-height entre textarea e div
- [ ] Implementar scroll sync (onScroll do textarea espelha no div)
- [ ] Modificar `src/app/home-editor.tsx` — integrar hooks, adicionar seletor de linguagem
- [ ] Criar componente de seletor de linguagem (dropdown no actions bar ou no header do editor)
- [ ] Mostrar indicador visual da linguagem detectada (badge na window header do editor)
- [ ] Testar com snippets de todas as linguagens do Tier 2
- [ ] Testar edge cases: codigo vazio, linguagem nao reconhecida, snippets muito curtos
- [ ] Testar performance com codigos grandes (>200 linhas)
- [ ] Rodar Biome (lint + format) em todos os arquivos modificados
- [ ] Testar em mobile (verificar comportamento do textarea overlay)
