"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { cn } from "@/lib/utils";
import type { GameResult } from "@/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const mockRecords = [
  { date: "2026-05-03", result: "win" as const },
  { date: "2026-05-10", result: "loss" as const },
  { date: "2026-05-15", result: "win" as const },
  { date: "2026-05-17", result: "win" as const },
  { date: "2026-05-22", result: "draw" as const },
  { date: "2026-05-24", result: "win" as const },
  { date: "2026-05-30", result: "win" as const },
];

/** 날짜별 기록 요약 (MVP 더미) */
const RECORD_SUMMARIES: Record<string, string> = {
  "2026-05-03": "라이온즈 4:2 트윈스 승리",
  "2026-05-10": "라이온즈 2:5 베어스 패배",
  "2026-05-15": "라이온즈 6:3 타이거즈 승리",
  "2026-05-17": "라이온즈 3:1 이글스 승리",
  "2026-05-22": "라이온즈 4:4 자이언츠 무승부",
  "2026-05-24": "라이온즈 5:3 베어스 승리",
  "2026-05-30": "라이온즈 5:3 베어스 승리",
};

const CURRENT_YEAR = 2026;
const CURRENT_MONTH = 5; // 0-indexed: 4 = May, but we use 1-indexed display
const TODAY = "2026-05-30";

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

/**
 * 달력 뷰 (/calendar)
 * 월간 캘린더 + 직관 날짜 승/패 dot 표시
 */
export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const recordMap = useMemo(() => {
    const map = new Map<string, GameResult>();
    for (const record of mockRecords) {
      map.set(record.date, record.result);
    }
    return map;
  }, []);

  const daysInMonth = getDaysInMonth(CURRENT_YEAR, CURRENT_MONTH);
  const firstDay = getFirstDayOfWeek(CURRENT_YEAR, CURRENT_MONTH);

  const calendarCells: Array<number | null> = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const handleDateClick = (day: number) => {
    const dateKey = `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (recordMap.has(dateKey)) {
      setSelectedDate(dateKey);
    } else {
      setSelectedDate(null);
    }
  };

  return (
    <>
      <main className="flex flex-1 flex-col bg-white px-6 pb-28 pt-8">
        <div className="mx-auto w-full max-w-md">
          {/* 월 헤더 */}
          <header className="mb-6 flex items-center justify-between">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400"
              aria-label="이전 달"
            >
              <ChevronLeft size={22} />
            </button>
            <h1 className="text-xl font-bold text-slate-800">
              {CURRENT_YEAR}년 {CURRENT_MONTH}월
            </h1>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400"
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

              const dateKey = `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const result = recordMap.get(dateKey);
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
                    result ? "cursor-pointer" : "cursor-default"
                  )}
                  aria-label={`${day}일${result ? `, ${result}` : ""}`}
                >
                  <span
                    className={cn(
                      "font-medium",
                      isToday ? "text-[#1A56DB]" : "text-slate-700"
                    )}
                  >
                    {day}
                  </span>
                  {result ? (
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full",
                        resultDotColor(result)
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
            {selectedDate && RECORD_SUMMARIES[selectedDate] ? (
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-[#1A56DB]">
                  {formatSelectedLabel(selectedDate)}
                </span>
                {" — "}
                {RECORD_SUMMARIES[selectedDate]}
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
