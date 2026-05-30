import type { CardProps } from "./types";

/**
 * 클래식 카드 템플릿 (Phase 2)
 * 현재는 자리표시자 — 추후 디자인 구현 예정
 */
export function ClassicCard({ data }: CardProps) {
  return (
    <div className="flex aspect-[9/16] w-full items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
      Classic 템플릿 (구현 예정) — {data.myTeam.short}
    </div>
  );
}
