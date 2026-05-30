"use client";

import { BottomNav } from "@/components/layout/bottom-nav";
import { getTeam } from "@/lib/teams";
import { cn } from "@/lib/utils";
import type { GameResult, TeamCode } from "@/types";

const MY_TEAM_CODE: TeamCode = "lions";

const mockStats = {
  totalGames: 18,
  wins: 13,
  losses: 4,
  draws: 1,
  winRate: 72,
  homeGames: 12,
  homeWins: 9,
  awayGames: 6,
  awayWins: 4,
  recentResults: ["win", "win", "loss", "win", "win"] as const,
  opponents: [
    { team: "bears" as TeamCode, games: 4, wins: 3 },
    { team: "twins" as TeamCode, games: 3, wins: 2 },
    { team: "tigers" as TeamCode, games: 3, wins: 2 },
    { team: "eagles" as TeamCode, games: 2, wins: 1 },
    { team: "giants" as TeamCode, games: 2, wins: 2 },
    { team: "dinos" as TeamCode, games: 2, wins: 1 },
    { team: "wiz" as TeamCode, games: 1, wins: 1 },
    { team: "heroes" as TeamCode, games: 1, wins: 1 },
  ],
};

const myTeam = getTeam(MY_TEAM_CODE);

function calcWinRatePercent(wins: number, games: number): number {
  if (games === 0) return 0;
  return Math.round((wins / games) * 100);
}

/**
 * 승률 통계 (/stats)
 * 시즌 요약, 홈/원정, 최근 경기, 상대팀별 전적
 */
export default function StatsPage() {
  const homeWinRate = calcWinRatePercent(
    mockStats.homeWins,
    mockStats.homeGames
  );
  const awayWinRate = calcWinRatePercent(
    mockStats.awayWins,
    mockStats.awayGames
  );

  return (
    <>
      <main className="flex flex-1 flex-col bg-[#EBF2FD] px-6 pb-28 pt-8">
        <div className="mx-auto w-full max-w-md">
          <h1 className="mb-6 text-2xl font-bold text-slate-800">시즌 통계</h1>

          {/* 큰 승률 */}
          <section className="mb-6 flex flex-col items-center rounded-2xl bg-white py-8 shadow-sm">
            <div
              className="flex h-36 w-36 items-center justify-center rounded-full"
              style={{ backgroundColor: myTeam.pastel }}
            >
              <span
                className="text-4xl font-extrabold"
                style={{ color: myTeam.color }}
              >
                {mockStats.winRate}%
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">
              {myTeam.name} 직관 승률
            </p>
            <p className="mt-2 text-base text-slate-600">
              <span className="font-semibold text-slate-800">
                {mockStats.totalGames}경기
              </span>{" "}
              {mockStats.wins}승 {mockStats.losses}패 {mockStats.draws}무
            </p>
          </section>

          {/* 홈/원정 승률 */}
          <section className="mb-6 grid grid-cols-2 gap-3">
            <WinRateCard
              label="홈 직관"
              games={mockStats.homeGames}
              wins={mockStats.homeWins}
              winRate={homeWinRate}
              accent={myTeam.pastelBg}
            />
            <WinRateCard
              label="원정 직관"
              games={mockStats.awayGames}
              wins={mockStats.awayWins}
              winRate={awayWinRate}
              accent={myTeam.pastelBg}
            />
          </section>

          {/* 최근 5경기 */}
          <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              최근 5경기
            </h2>
            <div className="flex items-center justify-center gap-3">
              {mockStats.recentResults.map((result, index) => (
                <RecentResultDot key={index} result={result} />
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                승
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                패
              </span>
            </div>
          </section>

          {/* 상대팀별 전적 */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              상대팀별 전적
            </h2>
            <div className="space-y-4">
              {mockStats.opponents.map(({ team, games, wins }) => {
                const opponent = getTeam(team);
                const rate = calcWinRatePercent(wins, games);

                return (
                  <div key={team}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {opponent.name}
                      </span>
                      <span className="text-slate-500">
                        {wins}승 {games - wins}패 · {rate}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${rate}%`,
                          backgroundColor: opponent.pastel,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
      <BottomNav />
    </>
  );
}

function WinRateCard({
  label,
  games,
  wins,
  winRate,
  accent,
}: {
  label: string;
  games: number;
  wins: number;
  winRate: number;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 shadow-sm"
      style={{ backgroundColor: accent }}
    >
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p
        className="mt-2 text-2xl font-extrabold"
        style={{ color: myTeam.color }}
      >
        {winRate}%
      </p>
      <p className="mt-1 text-xs text-slate-600">
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
        result === "win" && "bg-emerald-500",
        result === "loss" && "bg-red-400",
        result === "draw" && "bg-slate-300"
      )}
      aria-label={result === "win" ? "승" : result === "loss" ? "패" : "무"}
    />
  );
}
