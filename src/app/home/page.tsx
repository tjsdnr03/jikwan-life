"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TeamMascot } from "@/components/team/team-mascot";
import { createClient } from "@/lib/supabase";
import { authLog } from "@/lib/authDebug";
import { getStadium } from "@/lib/stadiums";
import { getTeam } from "@/lib/teams";
import { cn, displayDate, formatDate, resultLabel, winRate } from "@/lib/utils";
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

function gameStatusBadgeClass(status: GameStatus): string {
  const base = "rounded-full px-2 py-0.5 text-[10px] font-semibold";
  switch (status) {
    case "live":
      return `${base} bg-accent-bg-strong text-accent`;
    case "finished":
      return `${base} bg-surface-subtle text-text-secondary`;
    case "scheduled":
      return `${base} bg-accent-bg text-accent-muted`;
    case "cancelled":
      return `${base} bg-surface-subtle text-text-tertiary`;
  }
}

/** 팀 구분용 작은 색 점 */
function TeamDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full ring-2 ring-white/60"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

/** 승률 미니 도넛 */
function WinRateDonut({ percent }: { percent: number }) {
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 42 42"
      className="shrink-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx="21"
        cy="21"
        r={radius}
        fill="none"
        stroke="var(--surface-subtle)"
        strokeWidth="3.5"
      />
      <circle
        cx="21"
        cy="21"
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3.5"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 오늘의 경기 카드 스켈레톤 — 실제 카드와 동일 높이 */
function TodayGameSkeleton() {
  return (
    <section
      className="glass-card mb-3 min-h-[152px] p-5"
      aria-busy="true"
      aria-label="경기 정보 불러오는 중"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="skeleton h-3 w-[4.5rem] rounded-full" />
        <div className="flex gap-1.5">
          <div className="skeleton h-5 w-14 rounded-full" />
          <div className="skeleton h-5 w-[3.25rem] rounded-full" />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-5">
        <div className="skeleton h-4 w-14 rounded-full" />
        <div className="skeleton h-9 w-[4.5rem] rounded-lg" />
        <div className="skeleton h-4 w-14 rounded-full" />
      </div>
      <div className="mx-auto mt-5 skeleton h-3 w-48 max-w-full rounded-full" />
    </section>
  );
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
 * 로그인 후 메인 화면 — 글래스 UI 파일럿
 */
export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [recentRecords, setRecentRecords] = useState<Record[]>([]);
  const [myGame, setMyGame] = useState<MyGame | null>(null);
  const [gameLoading, setGameLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      authLog("home: load() 시작");
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      const user = session?.user;
      authLog(
        `home: getSession → user=${user ? user.id.slice(0, 8) : "null"} err=${sessionError?.message ?? "-"}`
      );

      if (!user) {
        authLog("home: 세션 없음 → /login");
        router.replace("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("nickname, my_team")
        .eq("id", user.id)
        .maybeSingle();
      authLog(
        `home: profile 조회 → data=${profileData ? "있음" : "null"} err=${profileError?.message ?? "-"}`
      );

      if (!profileData) {
        authLog("home: 프로필 null → /onboarding");
        router.replace("/onboarding");
        return;
      }

      setProfile(profileData as Profile);

      const { data: allRecords } = await supabase
        .from("records")
        .select("*")
        .eq("user_id", user.id)
        .order("game_date", { ascending: false });

      const list = (allRecords ?? []) as Record[];
      setRecords(list);
      setRecentRecords(list.slice(0, 3));
      setLoading(false);

      const monthStr = formatDate(new Date()).slice(0, 7);
      const myTeam = (profileData as Profile).my_team;
      try {
        const res = await fetch(`/api/kbo?month=${monthStr}`);
        const schedule = res.ok ? ((await res.json()) as KBOScheduleGame[]) : [];
        if (Array.isArray(schedule)) {
          setMyGame(pickMyGame(schedule, myTeam));
        }
      } catch {
        // 일정 로드 실패 — 경기 섹션만 생략
      } finally {
        setGameLoading(false);
      }
    }

    load();
  }, [router]);

  if (loading || !profile) {
    return (
      <main className="page-gradient flex flex-1 items-center justify-center">
        <p className="text-sm text-text-tertiary">불러오는 중...</p>
      </main>
    );
  }

  const myTeam = getTeam(profile.my_team);
  const wins = records.filter((r) => r.result === "win").length;
  const losses = records.filter((r) => r.result === "loss").length;
  const winRatePercent = Math.round(winRate(wins, losses) * 100);
  const opponentTeam = myGame ? getTeam(myGame.opponent) : null;

  return (
    <>
      <main className="page-gradient flex flex-1 flex-col px-5 pt-8 pb-[calc(4rem+4.25rem+max(1.5rem,env(safe-area-inset-bottom))+1rem)]">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          {/* 헤더 — 마스코트는 작게 한 곳만 */}
          <header className="mb-7 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-secondary">
                {myTeam.name} 팬
              </p>
              <h1 className="mt-1 text-[1.625rem] font-bold leading-snug tracking-tight text-text-primary">
                {profile.nickname
                  ? `${profile.nickname}님, 안녕하세요`
                  : "안녕하세요"}
              </h1>
              <p className="mt-1.5 text-sm text-text-tertiary">
                오늘도 좋은 직관 되세요
              </p>
            </div>
            <div className="glass flex shrink-0 items-center justify-center rounded-[var(--radius-md)] p-2">
              <TeamMascot team={myTeam} size="md" />
            </div>
          </header>

          {/* 오늘/다가오는 내 팀 경기 */}
          {gameLoading ? (
            <TodayGameSkeleton />
          ) : myGame && opponentTeam ? (
            <section className="glass-card mb-3 min-h-[152px] p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {myGame.game.date === formatDate(new Date())
                    ? "오늘의 경기"
                    : "다가오는 경기"}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <span className={gameStatusBadgeClass(myGame.game.status)}>
                    {statusLabel(myGame.game.status)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      myGame.isHome
                        ? "bg-accent-bg text-accent"
                        : "bg-surface-subtle text-text-secondary"
                    )}
                  >
                    {myGame.isHome ? "홈경기" : "원정경기"}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                  <TeamDot color={myTeam.color} />
                  <span className="text-sm font-semibold text-text-primary">
                    {myTeam.name}
                  </span>
                </div>
                {myGame.myScore !== null && myGame.opponentScore !== null ? (
                  <span className="text-3xl font-bold tabular-nums tracking-tight text-accent">
                    {myGame.myScore}
                    <span className="mx-1.5 text-xl font-medium text-text-tertiary">
                      :
                    </span>
                    {myGame.opponentScore}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-text-tertiary">
                    vs
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <TeamDot color={opponentTeam.color} />
                  <span className="text-sm font-semibold text-text-primary">
                    {opponentTeam.name}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-center text-xs leading-relaxed text-text-secondary">
                {displayDate(myGame.game.date)} ·{" "}
                {getStadium(myGame.game.stadium).name}
              </p>
            </section>
          ) : null}

          {/* 시즌 요약 */}
          <section className="glass-card mb-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              시즌 요약
            </p>
            <div className="mt-4 grid grid-cols-2">
              <div className="pr-4">
                <p className="text-4xl font-bold tabular-nums tracking-tight text-accent">
                  {records.length}
                </p>
                <p className="mt-1.5 text-sm text-text-secondary">직관</p>
              </div>
              <div className="relative border-l border-[var(--border-subtle)] pl-4">
                <div className="flex items-center gap-3">
                  <WinRateDonut percent={winRatePercent} />
                  <div>
                    <p className="text-4xl font-bold tabular-nums tracking-tight text-accent">
                      {winRatePercent}
                      <span className="ml-0.5 text-2xl font-semibold">%</span>
                    </p>
                    <p className="mt-1.5 text-sm text-text-secondary">승률</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 최근 기록 */}
          {recentRecords.length > 0 ? (
            <section className="mb-5">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                최근 기록
              </p>
              <ul className="space-y-2">
                {recentRecords.map((record) => {
                  const opponent = getTeam(record.opponent_team);
                  return (
                    <li key={record.id}>
                      <Link
                        href={`/record/${record.id}`}
                        className="glass-card flex items-center justify-between gap-4 p-4 transition-opacity active:opacity-80"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">
                            {myTeam.name} vs {opponent.name}
                          </p>
                          <p className="mt-1 text-xs text-text-tertiary">
                            {displayDate(record.game_date)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {record.my_score !== null &&
                          record.opponent_score !== null ? (
                            <p className="text-lg font-bold tabular-nums text-text-primary">
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
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {recentRecords.length === 0 ? (
            <p className="mt-2 text-center text-sm text-text-tertiary">
              아직 기록이 없어요. 첫 직관을 남겨보세요!
            </p>
          ) : null}
        </div>
      </main>

      {/* 하단 고정 CTA — 탭바 바로 위, 스크롤과 무관하게 항상 접근 */}
      <div
        className="fixed inset-x-0 z-40 mx-auto max-w-md px-5"
        style={{
          bottom:
            "calc(4rem + max(1.5rem, env(safe-area-inset-bottom)) + 0.625rem)",
        }}
      >
        <Link
          href="/record/new"
          className="flex h-14 w-full items-center justify-center rounded-[var(--radius-lg)] bg-accent text-base font-semibold text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-accent-hover active:scale-[0.99]"
        >
          오늘의 직관 기록하기
        </Link>
      </div>

      <BottomNav variant="glass" />
    </>
  );
}

function resultBadgeClass(result: GameResult): string {
  const base =
    "mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold";
  switch (result) {
    case "win":
      return `${base} bg-accent-bg text-accent`;
    case "loss":
      return `${base} bg-surface-subtle text-text-secondary`;
    case "draw":
      return `${base} bg-surface-subtle text-text-tertiary`;
  }
}
