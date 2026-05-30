import Link from "next/link";

/**
 * 랜딩 페이지 (/)
 * 비로그인 진입점 — 서비스 소개 + 시작하기 CTA
 * 모바일 퍼스트, 파스텔 블루 포인트
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#EBF2FD] px-6 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        {/* 이모지 심볼 (자체 캐릭터/색상만 활용) */}
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-[#B8D4F8] text-5xl shadow-sm">
          ⚾️
        </div>

        {/* 서비스명 */}
        <h1 className="text-4xl font-bold tracking-tight text-[#1A56DB]">
          직관생활
        </h1>

        {/* 부제 */}
        <p className="mt-4 text-lg leading-7 text-slate-600">
          직관을 기록하고,
          <br />
          예쁘게 만들어서,
          <br />
          바로 공유하세요
        </p>

        {/* 시작하기 CTA */}
        <Link
          href="/login"
          className="mt-10 flex h-14 w-full items-center justify-center rounded-2xl bg-[#1A56DB] text-lg font-semibold text-white shadow-md transition-colors hover:bg-[#1547b8] active:scale-[0.99]"
        >
          시작하기
        </Link>

        {/* 보조 안내 */}
        <p className="mt-6 text-sm text-slate-400">
          20~30대 KBO 팬을 위한 직관 기록 앱
        </p>
      </div>
    </main>
  );
}
