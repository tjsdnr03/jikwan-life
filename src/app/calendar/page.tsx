"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TeamMascot } from "@/components/team/team-mascot";
import { createClient } from "@/lib/supabase";
import { getStadium } from "@/lib/stadiums";
import { getTeam } from "@/lib/teams";
import { cn, formatDate, resultLabel } from "@/lib/utils";
import type {
  GameResult,
  GameStatus,
  KBOScheduleGame,
  Record,
  TeamCode,
} from "@/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const TODAY = formatDate(new Date());

/** 내 팀 경기 (캘린더 셀/상세에서 사용) */
interface MyGame {
  game: KBOScheduleGame;
  isHome: boolean;
  opponent: TeamCode;
  /** 내 팀 점수 / 상대 점수 (집계된 경기만) */
  myScore: number | null;
  opponentScore: number | null;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function formatSelectedLabel(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function resultDotColor(result: GameResult): string {
  switch (result) {
    case "win":
      return "bg-emerald-500";
    case "loss":
      return "bg-red-400";
    case "draw":
      return "bg-slate-400";
  }
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

/** 기록 한 건 → 캘린더 요약 문구 */
function summarize(record: Record, myTeamName: string): string {
  const opponent = getTeam(record.opponent_team).name;
  const score =
    record.my_score !== null && record.opponent_score !== null
      ? ` ${record.my_score}:${record.opponent_score}`
      : "";
  const label = record.result ? ` ${resultLabel(record.result)}` : "";
  return `${myTeamName}${score} ${opponent}${label}`.trim();
}

/**
 * 달력 뷰 (/calendar)
 * 월간 캘린더 + 직관 승/패 dot(records) + KBO 내 팀 경기 일정(api/kbo) 오버레이
 */
export default function CalendarPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [myTeam, setMyTeam] = useState<TeamCode | null>(null);
  const [schedule, setSchedule] = useState<KBOScheduleGame[]>([]);

  // 1. 로그인/프로필/기록 로드
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

      setMyTeam(profile.my_team as TeamCode);

      const { data: allRecords } = await supabase
        .from("records")
        .select("*")
        .eq("user_id", user.id);

      setRecords((allRecords ?? []) as Record[]);
    }

    load();
  }, [router]);

  // 2. 표시 중인 월의 KBO 일정 로드 (실패해도 오버레이만 생략)
  useEffect(() => {
    if (!myTeam) return;
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    let cancelled = false;

    fetch(`/api/kbo?month=${monthStr}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((games: KBOScheduleGame[]) => {
        if (!cancelled) setSchedule(Array.isArray(games) ? games : []);
      })
      .catch(() => {
        if (!cancelled) setSchedule([]);
      });

    return () => {
      cancelled = true;
    };
  }, [year, month, myTeam]);

  // 날짜 → 기록 매핑
  const recordMap = useMemo(() => {
    const map = new Map<string, Record>();
    for (const record of records) {
      map.set(record.game_date, record);
    }
    return map;
  }, [records]);

  // 날짜 → 내 팀 경기 매핑
  const myGameMap = useMemo(() => {
    const map = new Map<string, MyGame>();
    if (!myTeam) return map;
    for (const g of schedule) {
      if (g.homeTeam !== myTeam && g.awayTeam !== myTeam) continue;
      const isHome = g.homeTeam === myTeam;
      map.set(g.date, {
        game: g,
        isHome,
        opponent: isHome ? g.awayTeam : g.homeTeam,
        myScore: isHome ? g.homeScore : g.awayScore,
        opponentScore: isHome ? g.awayScore : g.homeScore,
      });
    }
    return map;
  }, [schedule, myTeam]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const calendarCells: Array<number | null> = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const handleDateClick = (dateKey: string) => {
    // 경기 또는 기록이 있는 날만 선택
    if (recordMap.has(dateKey) || myGameMap.has(dateKey)) {
      setSelectedDate(dateKey);
    } else {
      setSelectedDate(null);
    }
  };

  const goPrevMonth = () => {
    setSelectedDate(null);
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    setSelectedDate(null);
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const myTeamName = myTeam ? getTeam(myTeam).name : "";
  const selectedRecord = selectedDate ? recordMap.get(selectedDate) : null;
  const selectedMyGame = selectedDate ? myGameMap.get(selectedDate) : null;

  return (
    <>
      <main className="flex flex-1 flex-col bg-white px-6 pb-28 pt-8">
        <div className="mx-auto w-full max-w-md">
          {/* 월 헤더 */}
          <header className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrevMonth}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50"
              aria-label="이전 달"
            >
              <ChevronLeft size={22} />
            </button>
            <h1 className="text-xl font-bold text-slate-800">
              {year}년 {month}월
            </h1>
            <button
              type="button"
              onClick={goNextMonth}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50"
              aria-label="다음 달"
            >
              <ChevronRight size={22} />
            </button>
          </header>

          {/* 요일 헤더 */}
          <div className="mb-2 grid grid-cols-7 text-center">
            {WEEKDAYS.map((day, index) => (
              <span
                key={day}
                className={cn(
                  "py-2 text-xs font-semibold",
                  index === 0 && "text-red-400",
                  index === 6 && "text-[#1A56DB]"
                )}
              >
                {day}
              </span>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-y-1">
            {calendarCells.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const record = recordMap.get(dateKey);
              const myGame = myGameMap.get(dateKey);
              const isToday = dateKey === TODAY;
              const isSelected = dateKey === selectedDate;
              const interactive = Boolean(record || myGame);

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => handleDateClick(dateKey)}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-start gap-0.5 rounded-xl pt-1 text-sm transition-colors",
                    isToday && "border-2 border-[#1A56DB]",
                    isSelected && "bg-[#EBF2FD]",
                    !isSelected && !isToday && "hover:bg-slate-50",
                    interactive ? "cursor-pointer" : "cursor-default"
                  )}
                  aria-label={`${day}일${myGame ? `, ${getTeam(myGame.opponent).name}전` : ""}${record?.result ? `, ${resultLabel(record.result)}` : ""}`}
                >
                  <span
                    className={cn(
                      "text-xs font-medium leading-none",
                      isToday ? "text-[#1A56DB]" : "text-slate-700"
                    )}
                  >
                    {day}
                  </span>

                  {/* 내 팀 경기: 상대팀 캐릭터 (홈=파란/원정=빨간 테두리) */}
                  {myGame ? (
                    <span className="relative">
                      <TeamMascot
                        team={myGame.opponent}
                        size="sm"
                        className={cn(
                          "border-2",
                          myGame.isHome
                            ? "border-[#1A56DB]"
                            : "border-red-400"
                        )}
                      />
                      {/* 직관 기록 승/패는 캐릭터 위 작은 dot 으로 함께 표시 */}
                      {record?.result ? (
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-white",
                            resultDotColor(record.result)
                          )}
                        />
                      ) : null}
                    </span>
                  ) : record?.result ? (
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full",
                        resultDotColor(record.result)
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* 선택된 날짜 상세 */}
          <div className="mt-6 space-y-3">
            {selectedDate && (selectedMyGame || selectedRecord) ? (
              <>
                {/* 내 팀 경기 정보 */}
                {selectedMyGame ? (
                  <div className="rounded-2xl bg-[#EBF2FD] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#1A56DB]">
                        {formatSelectedLabel(selectedDate)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          selectedMyGame.isHome
                            ? "bg-[#1A56DB]/10 text-[#1A56DB]"
                            : "bg-red-400/15 text-red-500"
                        )}
                      >
                        {selectedMyGame.isHome ? "홈경기" : "원정경기"}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <TeamMascot team={myTeam!} size="md" />
                        <span className="text-xs font-medium text-slate-600">
                          {myTeamName}
                        </span>
                      </div>
                      {selectedMyGame.myScore !== null &&
                      selectedMyGame.opponentScore !== null ? (
                        <span className="text-lg font-bold text-slate-800">
                          {selectedMyGame.myScore} : {selectedMyGame.opponentScore}
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">
                          vs
                        </span>
                      )}
                      <div className="flex flex-col items-center gap-1">
                        <TeamMascot team={selectedMyGame.opponent} size="md" />
                        <span className="text-xs font-medium text-slate-600">
                          {getTeam(selectedMyGame.opponent).name}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-center text-xs text-slate-500">
                      {getStadium(selectedMyGame.game.stadium).name} ·{" "}
                      {statusLabel(selectedMyGame.game.status)}
                    </p>
                  </div>
                ) : null}

                {/* 직관 기록 정보 */}
                {selectedRecord ? (
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="mb-1 text-xs font-semibold text-slate-400">
                      내 직관 기록
                    </p>
                    <p className="text-sm text-slate-700">
                      {summarize(selectedRecord, myTeamName)}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="min-h-[72px] rounded-2xl bg-[#EBF2FD] p-4">
                <p className="text-sm text-slate-400">
                  경기나 직관 기록이 있는 날짜를 탭해보세요
                </p>
              </div>
            )}
          </div>

          {/* 범례 */}
          <div className="mt-5 space-y-2 text-xs text-slate-400">
            <div className="flex justify-center gap-4">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />승
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-400" />패
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-400" />무
              </span>
            </div>
            <div className="flex justify-center gap-4">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-md border-2 border-[#1A56DB]" />
                홈경기
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-md border-2 border-red-400" />
                원정경기
              </span>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
