"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TeamMascot } from "@/components/team/team-mascot";
import { createClient } from "@/lib/supabase";
import { getStadium } from "@/lib/stadiums";
import { getTeam } from "@/lib/teams";
import { displayDate, formatDate, resultLabel, winRate } from "@/lib/utils";
import type {
  GameResult,
  GameStatus,
  KBOScheduleGame,
  Record,
  TeamCode,
} from "@/types";

interface Profile {
  nickname: string | null;
  my_team: TeamCode;
}

/** 내 팀 경기 + 내 팀 기준 점수 */
interface MyGame {
  game: KBOScheduleGame;
  isHome: boolean;
  opponent: TeamCode;
  myScore: number | null;
  opponentScore: number | null;
}

function statusLabel(status: GameStatus): string {
  switch (status) {
    case "scheduled":
      return "경기 예정";
    case "live":
      return "경기 중";
    case "finished":
      return "경기 종료";
    case "cancelled":
      return "취소/연기";
  }
}

/** 월간 일정에서 오늘 경기(없으면 다가오는 가장 가까운 경기)를 고른다 */
function pickMyGame(
  schedule: KBOScheduleGame[],
  myTeam: TeamCode
): MyGame | null {
  const today = formatDate(new Date());
  const mine = schedule
    .filter((g) => g.homeTeam === myTeam || g.awayTeam === myTeam)
    .sort((a, b) => a.date.localeCompare(b.date));

  const target =
    mine.find((g) => g.date === today) ?? mine.find((g) => g.date >= today);
  if (!target) return null;

  const isHome = target.homeTeam === myTeam;
  return {
    game: target,
    isHome,
    opponent: isHome ? target.awayTeam : target.homeTeam,
    myScore: isHome ? target.homeScore : target.awayScore,
    opponentScore: isHome ? target.awayScore : target.homeScore,
  };
}

/**
 * 홈 (/home)
 * 로그인 후 메인 화면 — 시즌 요약 + 최근 기록 + 직관 기록 CTA
 */
export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [recentRecords, setRecentRecords] = useState<Record[]>([]);
  const [myGame, setMyGame] = useState<MyGame | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // 1. 로그인 확인
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // 2. 프로필 조회 — 없으면 온보딩으로
      const { data: profileData } = await supabase
        .from("users")
        .select("nickname, my_team")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileData) {
        router.replace("/onboarding");
        return;
      }

      setProfile(profileData as Profile);

      // 3. 시즌 요약용 전체 기록 + 최근 3개
      const { data: allRecords } = await supabase
        .from("records")
        .select("*")
        .eq("user_id", user.id)
        .order("game_date", { ascending: false });

      const list = (allRecords ?? []) as Record[];
      setRecords(list);
      setRecentRecords(list.slice(0, 3));
      setLoading(false);

      // 4. 이번 달 KBO 일정에서 오늘/다가오는 내 팀 경기 (실패해도 무시)
      const monthStr = formatDate(new Date()).slice(0, 7); // YYYY-MM
      const myTeam = (profileData as Profile).my_team;
      try {
        const res = await fetch(`/api/kbo?month=${monthStr}`);
        const schedule = res.ok ? ((await res.json()) as KBOScheduleGame[]) : [];
        if (Array.isArray(schedule)) {
          setMyGame(pickMyGame(schedule, myTeam));
        }
      } catch {
        // 일정 로드 실패 — 경기 섹션만 생략
      }
    }

    load();
  }, [router]);

  if (loading || !profile) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#EBF2FD]">
        <p className="text-sm text-slate-400">불러오는 중...</p>
      </main>
    );
  }

  const myTeam = getTeam(profile.my_team);
  const wins = records.filter((r) => r.result === "win").length;
  const losses = records.filter((r) => r.result === "loss").length;
  const winRatePercent = Math.round(winRate(wins, losses) * 100);

  return (
    <>
      <main className="flex flex-1 flex-col bg-[#EBF2FD] px-6 pb-28 pt-8">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          <header className="mb-8 flex items-center gap-4">
            <TeamMascot team={myTeam} size="xl" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {profile.nickname
                  ? `${profile.nickname}님, 안녕하세요!`
                  : "안녕하세요!"}
              </h1>
              <p className="mt-1 text-base text-slate-500">
                {myTeam.name} 오늘도 승리하세요
              </p>
            </div>
          </header>

          {/* 오늘/다가오는 내 팀 경기 */}
          {myGame ? (
            <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-500">
                  {myGame.game.date === formatDate(new Date())
                    ? "오늘의 경기"
                    : "다가오는 경기"}
                </h2>
                <span
                  className={
                    myGame.isHome
                      ? "rounded-full bg-[#1A56DB]/10 px-2 py-0.5 text-xs font-semibold text-[#1A56DB]"
                      : "rounded-full bg-red-400/15 px-2 py-0.5 text-xs font-semibold text-red-500"
                  }
                >
                  {myGame.isHome ? "홈경기" : "원정경기"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <TeamMascot team={myTeam} size="lg" />
                  <span className="text-xs font-medium text-slate-600">
                    {myTeam.name}
                  </span>
                </div>
                {myGame.myScore !== null && myGame.opponentScore !== null ? (
                  <span className="text-xl font-bold text-slate-800">
                    {myGame.myScore} : {myGame.opponentScore}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-slate-400">vs</span>
                )}
                <div className="flex flex-col items-center gap-1">
                  <TeamMascot team={myGame.opponent} size="lg" />
                  <span className="text-xs font-medium text-slate-600">
                    {getTeam(myGame.opponent).name}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-center text-xs text-slate-500">
                {displayDate(myGame.game.date)} ·{" "}
                {getStadium(myGame.game.stadium).name} ·{" "}
                {statusLabel(myGame.game.status)}
              </p>
            </section>
          ) : null}

          <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500">시즌 요약</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div
                className="rounded-xl px-4 py-3 text-center"
                style={{ backgroundColor: myTeam.pastelBg }}
              >
                <p
                  className="text-2xl font-bold"
                  style={{ color: myTeam.color }}
                >
                  {records.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">직관</p>
              </div>
              <div
                className="rounded-xl px-4 py-3 text-center"
                style={{ backgroundColor: myTeam.pastelBg }}
              >
                <p
                  className="text-2xl font-bold"
                  style={{ color: myTeam.color }}
                >
                  {winRatePercent}%
                </p>
                <p className="mt-1 text-xs text-slate-500">승률</p>
              </div>
            </div>
          </section>

          {/* 최근 기록 */}
          {recentRecords.length > 0 ? (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-slate-500">
                최근 기록
              </h2>
              <ul className="space-y-3">
                {recentRecords.map((record) => {
                  const opponent = getTeam(record.opponent_team);
                  return (
                    <li
                      key={record.id}
                      className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <TeamMascot team={myTeam} size="md" />
                        <span className="text-xs text-slate-400">vs</span>
                        <TeamMascot team={opponent} size="md" />
                        <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {myTeam.name} vs {opponent.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {displayDate(record.game_date)}
                        </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {record.my_score !== null &&
                        record.opponent_score !== null ? (
                          <p className="text-sm font-bold text-slate-700">
                            {record.my_score} : {record.opponent_score}
                          </p>
                        ) : null}
                        {record.result ? (
                          <span
                            className={resultBadgeClass(record.result)}
                          >
                            {resultLabel(record.result)}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <div className="mt-auto space-y-4">
            <Link
              href="/record/new"
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#B8D4F8] text-base font-semibold text-[#1A56DB] shadow-sm transition-colors hover:bg-[#a5c7f5] active:scale-[0.99]"
            >
              오늘의 직관 기록하기
            </Link>
            {recentRecords.length === 0 ? (
              <p className="text-center text-sm text-slate-400">
                최근 기록이 없습니다
              </p>
            ) : null}
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}

function resultBadgeClass(result: GameResult): string {
  const base =
    "ml-auto mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold";
  switch (result) {
    case "win":
      return `${base} bg-emerald-50 text-emerald-600`;
    case "loss":
      return `${base} bg-red-50 text-red-500`;
    case "draw":
      return `${base} bg-slate-100 text-slate-500`;
  }
}
