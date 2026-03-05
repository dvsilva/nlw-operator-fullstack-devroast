import {
  AnalysisCardDescription,
  AnalysisCardRoot,
  AnalysisCardTitle,
} from "@/components/ui/analysis-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { DiffLine } from "@/components/ui/diff-line";
import {
  LeaderboardRowCode,
  LeaderboardRowLanguage,
  LeaderboardRowRank,
  LeaderboardRowRoot,
  LeaderboardRowScore,
} from "@/components/ui/leaderboard-row";
import { ScoreRing } from "@/components/ui/score-ring";
import { ToggleDemo } from "./toggle-demo";

const buttonVariants = ["primary", "secondary", "ghost", "danger"] as const;
const buttonSizes = ["sm", "md", "lg"] as const;
const badgeVariants = ["critical", "warning", "good"] as const;

const sampleCode = `function calculateTotal(items) {
  var total = 0;
  for (var i = 0; ...) {
    total = total + items[i].price;
  }
}`;

export default function ComponentsPage() {
  return (
    <div className="min-h-screen bg-bg-page p-12 space-y-16">
      <header>
        <h1 className="font-mono text-accent-green text-lg mb-2">
          {"// component_library"}
        </h1>
        <p className="text-text-secondary text-sm">
          Biblioteca de componentes UI do DevRoast
        </p>
      </header>

      {/* Button */}
      <Section title="button" file="button.tsx">
        <Subsection title="Variantes">
          <div className="flex items-center gap-4 flex-wrap">
            {buttonVariants.map((variant) => (
              <Button key={variant} variant={variant}>
                {`$ ${variant}`}
              </Button>
            ))}
          </div>
        </Subsection>

        <Subsection title="Tamanhos">
          <div className="flex items-end gap-4 flex-wrap">
            {buttonSizes.map((size) => (
              <Button key={size} size={size}>
                {`$ size_${size}`}
              </Button>
            ))}
          </div>
        </Subsection>

        <Subsection title="Desabilitado">
          <div className="flex items-center gap-4 flex-wrap">
            {buttonVariants.map((variant) => (
              <Button key={variant} variant={variant} disabled>
                {`$ ${variant}`}
              </Button>
            ))}
          </div>
        </Subsection>
      </Section>

      {/* Toggle */}
      <Section title="toggle" file="toggle.tsx">
        <ToggleDemo />
      </Section>

      {/* Badge */}
      <Section title="badge_status" file="badge.tsx">
        <div className="flex items-center gap-6 flex-wrap">
          {badgeVariants.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
          <Badge variant="critical">needs_serious_help</Badge>
        </div>
      </Section>

      {/* Analysis Card */}
      <Section title="cards" file="analysis-card.tsx">
        <div className="flex flex-col gap-4 max-w-lg">
          <AnalysisCardRoot>
            <Badge variant="critical">critical</Badge>
            <AnalysisCardTitle>
              using var instead of const/let
            </AnalysisCardTitle>
            <AnalysisCardDescription>
              the var keyword is function-scoped rather than block-scoped, which
              can lead to unexpected behavior and bugs. modern javascript uses
              const for immutable bindings and let for mutable ones.
            </AnalysisCardDescription>
          </AnalysisCardRoot>
          <AnalysisCardRoot>
            <Badge variant="warning">warning</Badge>
            <AnalysisCardTitle>
              manual loop instead of array methods
            </AnalysisCardTitle>
            <AnalysisCardDescription>
              using a for loop with index access is less readable than modern
              array methods like reduce(), map(), or forEach().
            </AnalysisCardDescription>
          </AnalysisCardRoot>
          <AnalysisCardRoot>
            <Badge variant="good">good</Badge>
            <AnalysisCardTitle>
              function naming is descriptive
            </AnalysisCardTitle>
            <AnalysisCardDescription>
              the function name calculateTotal clearly communicates its purpose,
              making the code self-documenting.
            </AnalysisCardDescription>
          </AnalysisCardRoot>
        </div>
      </Section>

      {/* Code Block */}
      <Section title="code_block" file="code-block.tsx">
        <div className="max-w-xl">
          <CodeBlock
            code={sampleCode}
            lang="javascript"
            filename="calculate.js"
          />
        </div>
      </Section>

      {/* Diff Line */}
      <Section title="diff_line" file="diff-line.tsx">
        <div className="max-w-xl">
          <DiffLine type="removed">var total = 0;</DiffLine>
          <DiffLine type="added">const total = 0;</DiffLine>
          <DiffLine type="context">
            {"for (let i = 0; i < items.length; i++) {"}
          </DiffLine>
        </div>
      </Section>

      {/* Leaderboard Row */}
      <Section title="table_row" file="leaderboard-row.tsx">
        <div className="max-w-2xl">
          <LeaderboardRowRoot>
            <LeaderboardRowRank>#1</LeaderboardRowRank>
            <LeaderboardRowScore value={2.1} />
            <LeaderboardRowCode>
              {"function calculateTotal(items) { var total = 0; ..."}
            </LeaderboardRowCode>
            <LeaderboardRowLanguage>javascript</LeaderboardRowLanguage>
          </LeaderboardRowRoot>
          <LeaderboardRowRoot>
            <LeaderboardRowRank>#2</LeaderboardRowRank>
            <LeaderboardRowScore value={5.4} />
            <LeaderboardRowCode>
              {"const fetchData = async () => { try { ... } catch {} }"}
            </LeaderboardRowCode>
            <LeaderboardRowLanguage>typescript</LeaderboardRowLanguage>
          </LeaderboardRowRoot>
          <LeaderboardRowRoot>
            <LeaderboardRowRank>#3</LeaderboardRowRank>
            <LeaderboardRowScore value={8.7} />
            <LeaderboardRowCode>
              {"def merge_sort(arr): if len(arr) <= 1: return arr"}
            </LeaderboardRowCode>
            <LeaderboardRowLanguage>python</LeaderboardRowLanguage>
          </LeaderboardRowRoot>
        </div>
      </Section>

      {/* Score Ring */}
      <Section title="score_ring" file="score-ring.tsx">
        <div className="flex items-center gap-12 flex-wrap">
          <ScoreRing score={3.5} />
          <ScoreRing score={7.2} />
          <ScoreRing score={1.0} />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  file,
  children,
}: {
  title: string;
  file: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-mono text-text-primary text-base mb-1">
          {`$ ${title}`}
        </h2>
        <p className="text-text-tertiary text-xs">src/components/ui/{file}</p>
      </div>
      {children}
    </section>
  );
}

function Subsection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-text-secondary text-xs uppercase tracking-widest mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}
