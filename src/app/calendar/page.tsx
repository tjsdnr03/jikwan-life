"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { createClient } from "@/lib/supabase";
import { getTeam } from "@/lib/teams";
import { cn, formatDate, resultLabel } from "@/lib/utils";
import type { GameResult, Record } from "@/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const TODAY = formatDate(new Date());

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
 * 월간 캘린더 + 직관 날짜 승/패 dot 표시 — records 테이블 기반
 */
export default function CalendarPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [myTeamName, setMyTeamName] = useState("");

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

      setMyTeamName(getTeam(profile.my_team).name);

      const { data: allRecords } = await supabase
        .from("records")
        .select("*")
        .eq("user_id", user.id);

      setRecords((allRecords ?? []) as Record[]);
    }

    load();
  }, [router]);

  // 날짜 → 기록 매핑
  const recordMap = useMemo(() => {
    const map = new Map<string, Record>();
    for (const record of records) {
      map.set(record.game_date, record);
    }
    return map;
  }, [records]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const calendarCells: Array<number | null> = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const handleDateClick = (day: number) => {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(recordMap.has(dateKey) ? dateKey : null);
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

  const selectedRecord = selectedDate ? recordMap.get(selectedDate) : null;

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
              const isToday = dateKey === TODAY;
              const isSelected = dateKey === selectedDate;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors",
                    isToday && "border-2 border-[#1A56DB]",
                    isSelected && "bg-[#EBF2FD]",
                    !isSelected && !isToday && "hover:bg-slate-50",
                    record ? "cursor-pointer" : "cursor-default"
                  )}
                  aria-label={`${day}일${record?.result ? `, ${record.result}` : ""}`}
                >
                  <span
                    className={cn(
                      "font-medium",
                      isToday ? "text-[#1A56DB]" : "text-slate-700"
                    )}
                  >
                    {day}
                  </span>
                  {record?.result ? (
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full",
                        resultDotColor(record.result)
                      )}
                    />
                  ) : (
                    <span className="mt-1 h-1.5 w-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 선택된 날짜 요약 */}
          <div className="mt-6 min-h-[72px] rounded-2xl bg-[#EBF2FD] p-4">
            {selectedDate && selectedRecord ? (
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-[#1A56DB]">
                  {formatSelectedLabel(selectedDate)}
                </span>
                {" — "}
                {summarize(selectedRecord, myTeamName)}
              </p>
            ) : (
              <p className="text-sm text-slate-400">
                직관 기록이 있는 날짜를 탭해보세요
              </p>
            )}
          </div>

          {/* 범례 */}
          <div className="mt-4 flex justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              승
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              패
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              무
            </span>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
