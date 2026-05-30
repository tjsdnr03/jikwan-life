import type { GameResult } from "@/types";

/**
 * Tailwind 클래스 병합용 간단 유틸 (falsy 값 제거)
 * 추후 clsx/tailwind-merge 도입 시 교체 가능
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** 내 점수 / 상대 점수로 경기 결과 판정 */
export function getResult(myScore: number, opponentScore: number): GameResult {
  if (myScore > opponentScore) return "win";
  if (myScore < opponentScore) return "loss";
  return "draw";
}

/** 경기 결과 → 한글 라벨 */
export function resultLabel(result: GameResult): string {
  switch (result) {
    case "win":
      return "승";
    case "loss":
      return "패";
    case "draw":
      return "무";
  }
}

/** Date → 'YYYY-MM-DD' 포맷 (Supabase date 컬럼용) */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 'YYYY-MM-DD' → '2026.05.30 (금)' 같은 표시용 포맷 */
export function displayDate(isoDate: string): string {
  const date = new Date(isoDate);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d} (${days[date.getDay()]})`;
}

/** 승률 계산 (0~1). 무승부는 제외하고 계산 */
export function winRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return wins / total;
}
