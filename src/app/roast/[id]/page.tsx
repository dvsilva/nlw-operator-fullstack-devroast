import type { Metadata } from "next";
import {
  AnalysisCardDescription,
  AnalysisCardRoot,
  AnalysisCardTitle,
} from "@/components/ui/analysis-card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";
import { DiffLine } from "@/components/ui/diff-line";
import { ScoreRing } from "@/components/ui/score-ring";

export const metadata: Metadata = {
  title: "Roast Result — DevRoast",
  description: "See how your code scored on DevRoast — brutally honest.",
};

const roast = {
  score: 3.5,
  verdict: "needs_serious_help" as const,
  quote:
    '"this code looks like it was written during a power outage... in 2005."',
  language: "javascript",
  lines: 7,
  code: `function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total = total + items[i].price;
  }

  if (total > 100) {
    console.log("discount applied");
    total = total * 0.9;
  }

  // TODO: handle tax calculation
  // TODO: handle currency conversion

  return total;
}`,
  issues: [
    {
      variant: "critical" as const,
      label: "critical",
      title: "using var instead of const/let",
      description:
        "var is function-scoped and leads to hoisting bugs. use const by default, let when reassignment is needed.",
    },
    {
      variant: "warning" as const,
      label: "warning",
      title: "imperative loop pattern",
      description:
        "for loops are verbose and error-prone. use .reduce() or .map() for cleaner, functional transformations.",
    },
    {
      variant: "good" as const,
      label: "good",
      title: "clear naming conventions",
      description:
        "calculateTotal and items are descriptive, self-documenting names that communicate intent without comments.",
    },
    {
      variant: "good" as const,
      label: "good",
      title: "single responsibility",
      description:
        "the function does one thing well — calculates a total. no side effects, no mixed concerns, no hidden complexity.",
    },
  ],
  diff: {
    header: "your_code.ts → improved_code.ts",
    lines: [
      { type: "context" as const, content: "function calculateTotal(items) {" },
      { type: "removed" as const, content: "  var total = 0;" },
      {
        type: "removed" as const,
        content: "  for (var i = 0; i < items.length; i++) {",
      },
      {
        type: "removed" as const,
        content: "    total = total + items[i].price;",
      },
      { type: "removed" as const, content: "  }" },
      { type: "removed" as const, content: "  return total;" },
      {
        type: "added" as const,
        content: "  return items.reduce((sum, item) => sum + item.price, 0);",
      },
      { type: "context" as const, content: "}" },
    ],
  },
};

export default function RoastResultPage({
  params: _params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="flex flex-col w-full">
      <div className="flex flex-col gap-10 w-full max-w-6xl mx-auto px-10 md:px-20 py-10">
        {/* Score Hero */}
        <section className="flex items-center gap-12">
          <ScoreRing score={roast.score} />

          <div className="flex flex-col gap-4 flex-1">
            <Badge variant="critical">verdict: {roast.verdict}</Badge>

            <p className="font-mono text-xl leading-relaxed text-text-primary">
              {roast.quote}
            </p>

            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-text-tertiary">
                lang: {roast.language}
              </span>
              <span className="font-mono text-xs text-text-tertiary">
                {"·"}
              </span>
              <span className="font-mono text-xs text-text-tertiary">
                {roast.lines} lines
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="font-mono text-xs text-text-primary border border-border-primary px-4 py-2 enabled:hover:bg-bg-elevated transition-colors"
              >
                $ share_roast
              </button>
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

          <CodeBlock code={roast.code} lang="javascript" />
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
            {roast.issues.map((issue) => (
              <AnalysisCardRoot key={issue.title}>
                <Badge variant={issue.variant}>{issue.label}</Badge>
                <AnalysisCardTitle>{issue.title}</AnalysisCardTitle>
                <AnalysisCardDescription>
                  {issue.description}
                </AnalysisCardDescription>
              </AnalysisCardRoot>
            ))}
          </div>
        </section>

        {/* Divider */}
        <hr className="border-border-primary" />

        {/* Suggested Fix Section */}
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
                {roast.diff.header}
              </span>
            </div>

            {/* Diff Body */}
            <div className="flex flex-col py-1">
              {roast.diff.lines.map((line, i) => (
                <DiffLine key={`diff-${i.toString()}`} type={line.type}>
                  {line.content}
                </DiffLine>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
