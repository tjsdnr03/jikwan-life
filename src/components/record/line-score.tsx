import { getTeam } from "@/lib/teams";
import { cn } from "@/lib/utils";
import type { InningScores, TeamCode } from "@/types";

const RHEB_KEYS = ["r", "h", "e", "b"] as const;
const RHEB_LABELS = ["R", "H", "E", "B"];

interface LineScoreBoardProps {
  scores: InningScores;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
}

/** 이닝별 라인스코어 표 (원정 위 · 홈 아래) */
export function LineScoreBoard({
  scores,
  homeTeam,
  awayTeam,
}: LineScoreBoardProps) {
  const inningCount = Math.max(
    scores.inn.home.length,
    scores.inn.away.length
  );
  const innings = Array.from({ length: inningCount }, (_, i) => i + 1);

  const away = getTeam(awayTeam);
  const home = getTeam(homeTeam);

  return (
    <section className="glass-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-text-secondary">
        이닝별 스코어
      </h2>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-max border-collapse text-center text-[11px]">
          <thead>
            <tr className="text-text-tertiary">
              <th className="sticky left-0 z-10 min-w-[2.5rem] bg-[var(--glass-bg)] px-2 py-1 text-left font-medium" />
              {innings.map((n) => (
                <th
                  key={n}
                  className="min-w-[1.25rem] px-0.5 py-1 font-medium tabular-nums"
                >
                  {n}
                </th>
              ))}
              {RHEB_LABELS.map((label, i) => (
                <th
                  key={label}
                  className={cn(
                    "min-w-[1.5rem] px-1 py-1 font-semibold text-text-primary",
                    i === 0 && "border-l border-[var(--border-subtle)]"
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <LineScoreRow
              teamLabel={away.short}
              inningScores={scores.inn.away}
              totals={scores.rheb.away}
              inningCount={inningCount}
            />
            <LineScoreRow
              teamLabel={home.short}
              inningScores={scores.inn.home}
              totals={scores.rheb.home}
              inningCount={inningCount}
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LineScoreRow({
  teamLabel,
  inningScores,
  totals,
  inningCount,
}: {
  teamLabel: string;
  inningScores: number[];
  totals: InningScores["rheb"]["home"];
  inningCount: number;
}) {
  return (
    <tr className="text-text-primary">
      <td className="sticky left-0 z-10 bg-[var(--glass-bg)] px-2 py-1.5 text-left font-semibold text-text-secondary">
        {teamLabel}
      </td>
      {Array.from({ length: inningCount }, (_, i) => (
        <td key={i} className="tabular-nums px-0.5 py-1.5">
          {inningScores[i] ?? "-"}
        </td>
      ))}
      {RHEB_KEYS.map((key, i) => (
        <td
          key={key}
          className={cn(
            "tabular-nums px-1 py-1.5 font-semibold",
            i === 0 && "border-l border-[var(--border-subtle)]",
            key === "r" && "text-accent"
          )}
        >
          {totals[key]}
        </td>
      ))}
    </tr>
  );
}
