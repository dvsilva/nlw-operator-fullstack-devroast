import type { ComponentProps } from "react";
import { tv } from "tailwind-variants";

const leaderboardRow = tv({
  base: [
    "flex items-center gap-6 px-5 py-4 w-full font-mono",
    "border-b border-border-primary",
  ],
});

type LeaderboardRowRootProps = ComponentProps<"div">;

function LeaderboardRowRoot({ className, ...props }: LeaderboardRowRootProps) {
  return <div className={leaderboardRow({ className })} {...props} />;
}

type LeaderboardRowRankProps = ComponentProps<"span">;

function LeaderboardRowRank({ className, ...props }: LeaderboardRowRankProps) {
  return (
    <span
      className={tv({ base: "w-10 text-[13px] text-text-tertiary" })({
        className,
      })}
      {...props}
    />
  );
}

function scoreColor(score: number): string {
  if (score <= 3) return "text-accent-red";
  if (score <= 6) return "text-accent-amber";
  return "text-accent-green";
}

type LeaderboardRowScoreProps = ComponentProps<"span"> & {
  value: number;
};

function LeaderboardRowScore({
  value,
  className,
  ...props
}: LeaderboardRowScoreProps) {
  return (
    <span
      className={tv({ base: "w-15 text-[13px] font-bold" })({
        className: `${scoreColor(value)} ${className ?? ""}`.trim(),
      })}
      {...props}
    >
      {value.toFixed(1)}
    </span>
  );
}

type LeaderboardRowCodeProps = ComponentProps<"span">;

function LeaderboardRowCode({ className, ...props }: LeaderboardRowCodeProps) {
  return (
    <span
      className={tv({
        base: "flex-1 text-xs text-text-secondary truncate",
      })({ className })}
      {...props}
    />
  );
}

type LeaderboardRowLanguageProps = ComponentProps<"span">;

function LeaderboardRowLanguage({
  className,
  ...props
}: LeaderboardRowLanguageProps) {
  return (
    <span
      className={tv({ base: "w-25 text-xs text-text-tertiary text-right" })({
        className,
      })}
      {...props}
    />
  );
}

export {
  LeaderboardRowRoot,
  LeaderboardRowRank,
  LeaderboardRowScore,
  LeaderboardRowCode,
  LeaderboardRowLanguage,
  leaderboardRow,
  type LeaderboardRowRootProps,
  type LeaderboardRowRankProps,
  type LeaderboardRowScoreProps,
  type LeaderboardRowCodeProps,
  type LeaderboardRowLanguageProps,
};
