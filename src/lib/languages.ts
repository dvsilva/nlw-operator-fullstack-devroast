type LanguageEntry = {
  name: string;
  shikiId: string;
  hljsId: string;
  /** Load this language eagerly on initialization */
  eager?: boolean;
};

const LANGUAGES: Record<string, LanguageEntry> = {
  javascript: {
    name: "JavaScript",
    shikiId: "javascript",
    hljsId: "javascript",
    eager: true,
  },
  typescript: {
    name: "TypeScript",
    shikiId: "typescript",
    hljsId: "typescript",
    eager: true,
  },
  jsx: {
    name: "JSX",
    shikiId: "jsx",
    hljsId: "javascript",
    eager: true,
  },
  tsx: {
    name: "TSX",
    shikiId: "tsx",
    hljsId: "typescript",
    eager: true,
  },
  python: {
    name: "Python",
    shikiId: "python",
    hljsId: "python",
  },
  go: {
    name: "Go",
    shikiId: "go",
    hljsId: "go",
  },
  rust: {
    name: "Rust",
    shikiId: "rust",
    hljsId: "rust",
  },
  java: {
    name: "Java",
    shikiId: "java",
    hljsId: "java",
  },
  ruby: {
    name: "Ruby",
    shikiId: "ruby",
    hljsId: "ruby",
  },
  php: {
    name: "PHP",
    shikiId: "php",
    hljsId: "php",
  },
  sql: {
    name: "SQL",
    shikiId: "sql",
    hljsId: "sql",
  },
  bash: {
    name: "Shell",
    shikiId: "shellscript",
    hljsId: "bash",
  },
  html: {
    name: "HTML",
    shikiId: "html",
    hljsId: "xml",
  },
  css: {
    name: "CSS",
    shikiId: "css",
    hljsId: "css",
  },
  json: {
    name: "JSON",
    shikiId: "json",
    hljsId: "json",
  },
  yaml: {
    name: "YAML",
    shikiId: "yaml",
    hljsId: "yaml",
  },
  markdown: {
    name: "Markdown",
    shikiId: "markdown",
    hljsId: "markdown",
  },
  c: {
    name: "C",
    shikiId: "c",
    hljsId: "c",
  },
  cpp: {
    name: "C++",
    shikiId: "cpp",
    hljsId: "cpp",
  },
  csharp: {
    name: "C#",
    shikiId: "csharp",
    hljsId: "csharp",
  },
  swift: {
    name: "Swift",
    shikiId: "swift",
    hljsId: "swift",
  },
  kotlin: {
    name: "Kotlin",
    shikiId: "kotlin",
    hljsId: "kotlin",
  },
  dart: {
    name: "Dart",
    shikiId: "dart",
    hljsId: "dart",
  },
} as const;

/** Language keys used as option values (sorted alphabetically by display name) */
const LANGUAGE_OPTIONS = Object.entries(LANGUAGES)
  .sort(([, a], [, b]) => a.name.localeCompare(b.name))
  .map(([key, entry]) => ({ value: key, label: entry.name }));

/** All hljs language IDs registered for auto-detection */
const HLJS_DETECTION_LANGUAGES = [
  ...new Set(Object.values(LANGUAGES).map((l) => l.hljsId)),
];

/** Map hljs detected ID back to our language key */
function hljsIdToLanguageKey(hljsId: string): string | null {
  const entry = Object.entries(LANGUAGES).find(
    ([, lang]) => lang.hljsId === hljsId,
  );
  return entry?.[0] ?? null;
}

export {
  LANGUAGES,
  LANGUAGE_OPTIONS,
  HLJS_DETECTION_LANGUAGES,
  hljsIdToLanguageKey,
  type LanguageEntry,
};
