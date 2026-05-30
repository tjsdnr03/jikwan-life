import type { CardProps } from "./types";

/**
 * 볼드 카드 템플릿 (Phase 2)
 * 현재는 자리표시자 — 추후 디자인 구현 예정
 */
export function BoldCard({ data }: CardProps) {
  return (
    <div className="flex aspect-[9/16] w-full items-center justify-center rounded-3xl bg-slate-800 text-slate-300">
      Bold 템플릿 (구현 예정) — {data.myTeam.short}
    </div>
  );
}
