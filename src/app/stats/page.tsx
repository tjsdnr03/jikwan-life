"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { createClient } from "@/lib/supabase";
import { getTeam } from "@/lib/teams";
import { cn, winRate } from "@/lib/utils";
import type { GameResult, Record, TeamCode } from "@/types";

function calcWinRatePercent(wins: number, losses: number): number {
  return Math.round(winRate(wins, losses) * 100);
}

interface OpponentStat {
  team: TeamCode;
  games: number;
  wins: number;
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
        data: { user },
      } = await supabase.auth.getUser();

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
      <main className="flex flex-1 items-center justify-center bg-[#EBF2FD]">
        <p className="text-sm text-slate-400">불러오는 중...</p>
      </main>
    );
  }

  const myTeam = getTeam(myTeamCode);

  // 기록 없을 때
  if (records.length === 0) {
    return (
      <>
        <main className="flex flex-1 flex-col bg-[#EBF2FD] px-6 pb-28 pt-8">
          <div className="mx-auto w-full max-w-md">
            <h1 className="mb-6 text-2xl font-bold text-slate-800">
              시즌 통계
            </h1>
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <p className="text-4xl">📊</p>
              <p className="mt-4 text-base font-medium text-slate-600">
                아직 기록이 없습니다
              </p>
              <p className="mt-1 text-sm text-slate-400">
                첫 직관을 기록해보세요!
              </p>
            </div>
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

  // --- 통계 계산 ---
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

  // 최근 5경기 (game_date 내림차순 → 오래된 순으로 표시)
  const recentResults = decided
    .slice(0, 5)
    .map((r) => r.result as GameResult)
    .reverse();

  // 상대팀별 전적
  const opponentMap = new Map<TeamCode, OpponentStat>();
  for (const r of records) {
    const stat = opponentMap.get(r.opponent_team) ?? {
      team: r.opponent_team,
      games: 0,
      wins: 0,
    };
    stat.games += 1;
    if (r.result === "win") stat.wins += 1;
    opponentMap.set(r.opponent_team, stat);
  }
  const opponents = Array.from(opponentMap.values()).sort(
    (a, b) => b.games - a.games
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
                {overallWinRate}%
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">
              {myTeam.name} 직관 승률
            </p>
            <p className="mt-2 text-base text-slate-600">
              <span className="font-semibold text-slate-800">
                {totalGames}경기
              </span>{" "}
              {wins}승 {losses}패 {draws}무
            </p>
          </section>

          {/* 홈/원정 승률 */}
          <section className="mb-6 grid grid-cols-2 gap-3">
            <WinRateCard
              label="홈 직관"
              games={homeRecords.length}
              wins={homeWins}
              winRate={calcWinRatePercent(homeWins, homeLosses)}
              accent={myTeam.pastelBg}
              color={myTeam.color}
            />
            <WinRateCard
              label="원정 직관"
              games={awayRecords.length}
              wins={awayWins}
              winRate={calcWinRatePercent(awayWins, awayLosses)}
              accent={myTeam.pastelBg}
              color={myTeam.color}
            />
          </section>

          {/* 최근 5경기 */}
          {recentResults.length > 0 ? (
            <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">
                최근 {recentResults.length}경기
              </h2>
              <div className="flex items-center justify-center gap-3">
                {recentResults.map((result, index) => (
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
          ) : null}

          {/* 상대팀별 전적 */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              상대팀별 전적
            </h2>
            <div className="space-y-4">
              {opponents.map(({ team, games, wins }) => {
                const opponent = getTeam(team);
                const rate = calcWinRatePercent(wins, games - wins);

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
  color,
}: {
  label: string;
  games: number;
  wins: number;
  winRate: number;
  accent: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 shadow-sm"
      style={{ backgroundColor: accent }}
    >
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold" style={{ color }}>
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
