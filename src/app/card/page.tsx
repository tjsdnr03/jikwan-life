import { BottomNav } from "@/components/layout/bottom-nav";

const BOTTOM_NAV_PADDING =
  "pb-[calc(4rem+max(1.5rem,env(safe-area-inset-bottom))+1rem)]";

/**
 * 카드 생성 진입 (/card)
 * 템플릿 선택 → 미리보기 → 공유 (Phase 1에서 구현)
 */
export default function CardPage() {
  return (
    <>
      <main
        className={`page-gradient flex flex-1 flex-col items-center justify-center px-5 ${BOTTOM_NAV_PADDING}`}
      >
        <div className="mx-auto w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-text-primary">카드 만들기</h1>
          <p className="mt-2 text-text-secondary">템플릿 선택 (구현 예정)</p>
        </div>
      </main>
      <BottomNav variant="glass" />
    </>
  );
}
