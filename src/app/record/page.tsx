import { BottomNav } from "@/components/layout/bottom-nav";

/**
 * 직관 기록 목록 (/record)
 * 기록 작성 플로우는 Phase 1에서 구현
 */
export default function RecordListPage() {
  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center bg-white px-6 pb-28">
        <div className="mx-auto w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-[#1A56DB]">직관 기록</h1>
          <p className="mt-2 text-slate-500">기록 목록 (구현 예정)</p>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
