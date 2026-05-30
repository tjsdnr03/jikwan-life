import { BottomNav } from "@/components/layout/bottom-nav";

/**
 * 승률 통계 (/stats)
 * 전체/홈원정/상대팀별/월별 승률 — recharts 사용 (Phase 1에서 구현)
 */
export default function StatsPage() {
  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center bg-white px-6 pb-28">
        <div className="mx-auto w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-[#1A56DB]">승률 통계</h1>
          <p className="mt-2 text-slate-500">승률 대시보드 (구현 예정)</p>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
