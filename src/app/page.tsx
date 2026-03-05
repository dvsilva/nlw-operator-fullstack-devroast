import Link from "next/link";
import { HomeEditor } from "./home-editor";

const leaderboardEntries = [
  {
    rank: 1,
    score: 1.2,
    lines: [
      'eval(prompt("enter code"))',
      "document.write(response)",
      "// trust the user lol",
    ],
    language: "javascript",
  },
  {
    rank: 2,
    score: 1.8,
    lines: [
      "if (x == true) { return true; }",
      "else if (x == false) { return false; }",
      "else { return !false; }",
    ],
    language: "typescript",
  },
  {
    rank: 3,
    score: 2.1,
    lines: ["SELECT * FROM users WHERE 1=1", "-- TODO: add authentication"],
    language: "sql",
  },
];

function scoreColor(score: number): string {
  if (score <= 3) return "text-accent-red";
  if (score <= 6) return "text-accent-amber";
  return "text-accent-green";
}

export default function HomePage() {
  return (
    <main className="flex flex-col items-center">
      {/* Hero */}
      <section className="flex flex-col items-center gap-3 pt-20 px-10">
        <h1 className="flex items-center gap-3 font-mono text-4xl font-bold">
          <span className="text-accent-green">$</span>
          <span className="text-text-primary">
            paste your code. get roasted.
          </span>
        </h1>
        <p className="font-mono text-sm text-text-secondary">
          {
            "// drop your code below and we'll rate it — brutally honest or full roast mode"
          }
        </p>
      </section>

      {/* Editor + Actions */}
      <section className="w-full max-w-5xl px-10 pt-8">
        <HomeEditor />
      </section>

      {/* Footer Stats */}
      <div className="flex items-center gap-6 justify-center pt-8">
        <span className="font-mono text-xs text-text-tertiary">
          2,847 codes roasted
        </span>
        <span className="font-mono text-xs text-text-tertiary">·</span>
        <span className="font-mono text-xs text-text-tertiary">
          avg score: 4.2/10
        </span>
      </div>

      {/* Spacer */}
      <div className="h-15" />

      {/* Leaderboard Preview */}
      <section className="flex flex-col gap-6 w-full max-w-5xl px-10 pb-15">
        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-accent-green">
              {"//"}
            </span>
            <span className="font-mono text-sm font-bold text-text-primary">
              shame_leaderboard
            </span>
          </div>

          <Link
            href="/leaderboard"
            className="font-mono text-xs text-text-secondary border border-border-primary px-3 py-1.5 hover:bg-bg-elevated transition-colors"
          >
            $ view_all {">>"}
          </Link>
        </div>

        {/* Subtitle */}
        <p className="font-mono text-[13px] text-text-tertiary -mt-2">
          {"// the worst code on the internet, ranked by shame"}
        </p>

        {/* Leaderboard Table */}
        <div className="border border-border-primary w-full">
          {/* Table Header */}
          <div className="flex items-center h-10 px-5 bg-bg-surface border-b border-border-primary">
            <span className="w-12 font-mono text-xs font-medium text-text-tertiary">
              #
            </span>
            <span className="w-18 font-mono text-xs font-medium text-text-tertiary">
              score
            </span>
            <span className="flex-1 font-mono text-xs font-medium text-text-tertiary">
              code
            </span>
            <span className="w-24 font-mono text-xs font-medium text-text-tertiary text-right">
              lang
            </span>
          </div>

          {/* Table Rows */}
          {leaderboardEntries.map((entry, index) => (
            <div
              key={entry.rank}
              className={`flex px-5 py-4 ${index < leaderboardEntries.length - 1 ? "border-b border-border-primary" : ""}`}
            >
              <span
                className={`w-12 font-mono text-xs ${entry.rank === 1 ? "text-accent-amber" : "text-text-secondary"}`}
              >
                {entry.rank}
              </span>
              <span
                className={`w-18 font-mono text-xs font-bold ${scoreColor(entry.score)}`}
              >
                {entry.score.toFixed(1)}
              </span>
              <div className="flex-1 flex flex-col gap-0.5">
                {entry.lines.map((line) => (
                  <span
                    key={line}
                    className={`font-mono text-xs ${line.startsWith("//") || line.startsWith("--") ? "text-text-tertiary" : "text-text-primary"}`}
                  >
                    {line}
                  </span>
                ))}
              </div>
              <span className="w-24 font-mono text-xs text-text-secondary text-right">
                {entry.language}
              </span>
            </div>
          ))}
        </div>

        {/* Fade Hint */}
        <p className="font-mono text-xs text-text-tertiary text-center">
          showing top 3 of 2,847 ·{" "}
          <Link
            href="/leaderboard"
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            view full leaderboard {">>"}
          </Link>
        </p>
      </section>
    </main>
  );
}
