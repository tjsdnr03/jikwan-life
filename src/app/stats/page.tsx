"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TeamMascot } from "@/components/team/team-mascot";
import { createClient } from "@/lib/supabase";
import { getTeam } from "@/lib/teams";
import { cn, winRate } from "@/lib/utils";
import type { GameResult, Record, TeamCode } from "@/types";

function calcWinRatePercent(wins: number, losses: number): number {
  return Math.round(winRate(wins, losses) * 100);
}

/** 홈 시즌 요약과 동일 톤 — 큰 승률 도넛 */
function WinRateDonutLarge({
  percent,
  size = 136,
}: {
  percent: number;
  size?: number;
}) {
  const radius = 52;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--surface-subtle)"
        strokeWidth="9"
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="9"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

interface OpponentStat {
  team: TeamCode;
  games: number;
  wins: number;
  losses: number;
}

interface OpponentPerspectiveStat {
  team: TeamCode;
  games: number;
  opponentWins: number;
  opponentLosses: number;
  opponentWinRate: number;
}

/**
 * 승률 통계 (/stats)
 * 시즌 요약, 홈/원정, 최근 경기, 상대팀별 전적 — records 테이블 기반
 */
export default function StatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myTeamCode, setMyTeamCode] = useState<TeamCode | null>(null);
  const [records, setRecords] = useState<Record[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("my_team")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        router.replace("/onboarding");
        return;
      }

      setMyTeamCode(profile.my_team as TeamCode);

      const { data: allRecords } = await supabase
        .from("records")
        .select("*")
        .eq("user_id", user.id)
        .order("game_date", { ascending: false });

      setRecords((allRecords ?? []) as Record[]);
      setLoading(false);
    }

    load();
  }, [router]);

  if (loading || !myTeamCode) {
    return (
      <main className="page-gradient flex flex-1 items-center justify-center">
        <p className="text-sm text-text-tertiary">불러오는 중...</p>
      </main>
    );
  }

  const myTeam = getTeam(myTeamCode);

  if (records.length === 0) {
    return (
      <>
        <main className="page-gradient flex flex-1 flex-col px-5 pb-28 pt-8">
          <div className="mx-auto w-full max-w-md">
            <h1 className="mb-6 text-2xl font-bold text-text-primary">
              시즌 통계
            </h1>
            <div className="glass-card p-10 text-center">
              <p className="text-4xl">📊</p>
              <p className="mt-4 text-base font-medium text-text-secondary">
                아직 기록이 없습니다
              </p>
              <p className="mt-1 text-sm text-text-tertiary">
                첫 직관을 기록해보세요!
              </p>
            </div>
          </div>
        </main>
        <BottomNav variant="glass" />
      </>
    );
  }

  const decided = records.filter((r) => r.result !== null);
  const wins = records.filter((r) => r.result === "win").length;
  const losses = records.filter((r) => r.result === "loss").length;
  const draws = records.filter((r) => r.result === "draw").length;
  const totalGames = records.length;
  const overallWinRate = calcWinRatePercent(wins, losses);

  const homeRecords = records.filter((r) => r.is_home);
  const awayRecords = records.filter((r) => !r.is_home);
  const homeWins = homeRecords.filter((r) => r.result === "win").length;
  const homeLosses = homeRecords.filter((r) => r.result === "loss").length;
  const awayWins = awayRecords.filter((r) => r.result === "win").length;
  const awayLosses = awayRecords.filter((r) => r.result === "loss").length;

  const recentResults = decided
    .slice(0, 5)
    .map((r) => r.result as GameResult)
    .reverse();

  const opponentMap = new Map<TeamCode, OpponentStat>();
  for (const r of records) {
    const stat = opponentMap.get(r.opponent_team) ?? {
      team: r.opponent_team,
      games: 0,
      wins: 0,
      losses: 0,
    };
    stat.games += 1;
    if (r.result === "win") stat.wins += 1;
    if (r.result === "loss") stat.losses += 1;
    opponentMap.set(r.opponent_team, stat);
  }
  const opponents = Array.from(opponentMap.values()).sort(
    (a, b) => b.games - a.games
  );

  const opponentPerspective: OpponentPerspectiveStat[] = opponents
    .filter((o) => o.games >= 2 && o.wins + o.losses > 0)
    .map((o) => {
      const decidedGames = o.wins + o.losses;
      const opponentWinRate =
        decidedGames > 0 ? Math.round((o.losses / decidedGames) * 100) : 0;
      return {
        team: o.team,
        games: o.games,
        opponentWins: o.losses,
        opponentLosses: o.wins,
        opponentWinRate,
      };
    })
    .sort((a, b) => b.opponentWinRate - a.opponentWinRate);

  const winFairy =
    opponentPerspective.length > 0 ? opponentPerspective[0] : null;
  const lossFairy =
    opponentPerspective.length > 0
      ? opponentPerspective[opponentPerspective.length - 1]
      : null;

  return (
    <>
      <main className="page-gradient flex flex-1 flex-col px-5 pb-28 pt-8">
        <div className="mx-auto w-full max-w-md">
          <h1 className="mb-6 text-2xl font-bold text-text-primary">
            시즌 통계
          </h1>

          {/* 큰 승률 */}
          <section className="glass-card mb-3 flex flex-col items-center py-8">
            <div className="relative flex h-[136px] w-[136px] items-center justify-center">
              <WinRateDonutLarge percent={overallWinRate} />
              <span className="absolute text-4xl font-bold tabular-nums tracking-tight text-accent">
                {overallWinRate}
                <span className="text-2xl font-semibold">%</span>
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-text-secondary">
              {myTeam.name} 직관 승률
            </p>
            <p className="mt-2 text-base text-text-secondary">
              <span className="font-semibold text-text-primary">
                {totalGames}경기
              </span>{" "}
              {wins}승 {losses}패 {draws}무
            </p>
          </section>

          {/* 홈/원정 승률 */}
          <section className="mb-3 grid grid-cols-2 gap-2">
            <WinRateCard
              label="홈 직관"
              games={homeRecords.length}
              wins={homeWins}
              winRate={calcWinRatePercent(homeWins, homeLosses)}
            />
            <WinRateCard
              label="원정 직관"
              games={awayRecords.length}
              wins={awayWins}
              winRate={calcWinRatePercent(awayWins, awayLosses)}
            />
          </section>

          {/* 최근 5경기 */}
          {recentResults.length > 0 ? (
            <section className="glass-card mb-3 p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                최근 {recentResults.length}경기
              </h2>
              <div className="flex items-center justify-center gap-3">
                {recentResults.map((result, index) => (
                  <RecentResultDot key={index} result={result} />
                ))}
              </div>
              <div className="mt-3 flex justify-center gap-4 text-xs text-text-tertiary">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  승
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-text-secondary" />
                  패
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-surface-subtle ring-1 ring-[var(--border-subtle)]" />
                  무
                </span>
              </div>
            </section>
          ) : null}

          {/* 상대팀별 전적 */}
          <section className="glass-card mb-3 p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              상대팀별 전적
            </h2>
            <div className="space-y-4">
              {opponents.map(({ team, games, wins: oWins, losses: oLosses }) => {
                const opponent = getTeam(team);
                const rate = calcWinRatePercent(oWins, oLosses);

                return (
                  <div key={team}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-medium text-text-primary">
                        <TeamMascot team={opponent} size="md" />
                        <span className="truncate">{opponent.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-text-secondary">
                        {oWins}승 {oLosses}패 · {rate}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface-subtle">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-text-tertiary">
                      {games}경기
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 상대팀 시점 통계 */}
          <section className="glass-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              혹시 나는 상대팀 승리요정? 🧚
            </h2>
            <p className="mt-1 text-xs text-text-tertiary">
              내가 직관 갔을 때 상대팀의 승률이에요
            </p>

            {opponentPerspective.length > 0 && winFairy && lossFairy ? (
              <div className="mt-4 space-y-2">
                <p className="rounded-[var(--radius-md)] bg-accent-bg px-3 py-2 text-sm font-medium text-accent">
                  당신은 {getTeam(winFairy.team).name}의 승리요정이에요! 😂
                </p>
                {winFairy.team !== lossFairy.team ? (
                  <p className="rounded-[var(--radius-md)] bg-surface-subtle px-3 py-2 text-sm font-medium text-text-secondary">
                    당신은 {getTeam(lossFairy.team).name}의 패배요정이에요! 💪
                  </p>
                ) : null}
              </div>
            ) : null}

            {opponentPerspective.length > 0 ? (
              <div className="mt-4 space-y-4">
                {opponentPerspective.map(
                  ({
                    team,
                    opponentWins,
                    opponentLosses,
                    opponentWinRate,
                  }) => {
                    const opponent = getTeam(team);
                    const isWinFairy = winFairy?.team === team;
                    const isLossFairy =
                      lossFairy?.team === team &&
                      winFairy?.team !== lossFairy?.team;

                    return (
                      <div
                        key={team}
                        className={cn(
                          "rounded-[var(--radius-md)] p-3",
                          isWinFairy &&
                            "bg-accent-bg ring-1 ring-[var(--accent-border)]",
                          isLossFairy &&
                            "bg-surface-subtle ring-1 ring-[var(--border-subtle)]"
                        )}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2 font-medium text-text-primary">
                            <TeamMascot team={opponent} size="md" />
                            <span className="truncate">{opponent.name}</span>
                            {isWinFairy ? (
                              <span className="shrink-0 text-xs text-accent">
                                승리요정
                              </span>
                            ) : null}
                            {isLossFairy ? (
                              <span className="shrink-0 text-xs text-text-secondary">
                                패배요정
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 tabular-nums text-text-secondary">
                            {opponentWins}승 {opponentLosses}패 ·{" "}
                            {opponentWinRate}%
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-surface-subtle">
                          <div
                            className="h-full rounded-full bg-accent-muted transition-all"
                            style={{ width: `${opponentWinRate}%` }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <p className="mt-6 text-center text-sm text-text-tertiary">
                더 많이 직관 가면 알 수 있어요! ⚾
              </p>
            )}
          </section>
        </div>
      </main>
      <BottomNav variant="glass" />
    </>
  );
}

function WinRateCard({
  label,
  games,
  wins,
  winRate,
}: {
  label: string;
  games: number;
  wins: number;
  winRate: number;
}) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-accent">
        {winRate}%
      </p>
      <p className="mt-1 text-xs text-text-secondary">
        {games}경기 {wins}승
      </p>
    </div>
  );
}

function RecentResultDot({ result }: { result: GameResult }) {
  return (
    <span
      className={cn(
        "h-8 w-8 rounded-full",
        result === "win" && "bg-accent",
        result === "loss" && "bg-text-secondary",
        result === "draw" &&
          "bg-surface-subtle ring-2 ring-[var(--border-subtle)]"
      )}
      aria-label={result === "win" ? "승" : result === "loss" ? "패" : "무"}
    />
  );
}
