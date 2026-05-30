/**
 * 카드 생성 진입 (/card)
 * 템플릿 선택 → 미리보기 → 공유 (Phase 1에서 구현)
 */
export default function CardPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-white px-6">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-[#1A56DB]">카드 만들기</h1>
        <p className="mt-2 text-slate-500">템플릿 선택 (구현 예정)</p>
      </div>
    </main>
  );
}
