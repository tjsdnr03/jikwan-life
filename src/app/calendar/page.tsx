import { BottomNav } from "@/components/layout/bottom-nav";

/**
 * 달력 뷰 (/calendar)
 * 월간 캘린더 + 직관 날짜 승/패 dot 표시 (Phase 1에서 구현)
 */
export default function CalendarPage() {
  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center bg-white px-6 pb-28">
        <div className="mx-auto w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-[#1A56DB]">달력</h1>
          <p className="mt-2 text-slate-500">월간 직관 캘린더 (구현 예정)</p>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
