import Link from "next/link";
import { BottomNav } from "@/components/layout/bottom-nav";

/**
 * 홈 (/home)
 * 로그인 후 메인 화면 — 시즌 요약 + 직관 기록 CTA
 */
export default function HomePage() {
  return (
    <>
      <main className="flex flex-1 flex-col bg-[#EBF2FD] px-6 pb-28 pt-8">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800">
              안녕하세요! 🦁
            </h1>
            <p className="mt-1 text-base text-slate-500">오늘도 승리하세요</p>
          </header>

          <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500">시즌 요약</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-[#EBF2FD] px-4 py-3 text-center">
                <p className="text-2xl font-bold text-[#1A56DB]">0</p>
                <p className="mt-1 text-xs text-slate-500">직관</p>
              </div>
              <div className="rounded-xl bg-[#EBF2FD] px-4 py-3 text-center">
                <p className="text-2xl font-bold text-[#1A56DB]">0%</p>
                <p className="mt-1 text-xs text-slate-500">승률</p>
              </div>
            </div>
          </section>

          <div className="mt-auto space-y-4">
            <Link
              href="/record/new"
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#B8D4F8] text-base font-semibold text-[#1A56DB] shadow-sm transition-colors hover:bg-[#a5c7f5] active:scale-[0.99]"
            >
              오늘의 직관 기록하기
            </Link>
            <p className="text-center text-sm text-slate-400">
              최근 기록이 없습니다
            </p>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
