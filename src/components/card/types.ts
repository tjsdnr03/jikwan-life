import type { GameResult } from "@/types";
import type { Team } from "@/types";

/**
 * 카드 템플릿 공통 props
 * 인스타 스토리 비율(9:16, 1080x1920) 기준으로 렌더링한다.
 */
export interface CardData {
  myTeam: Team;
  opponentTeam: Team;
  myScore: number;
  opponentScore: number;
  result: GameResult;
  stadiumName: string;
  gameDate: string; // 표시용 포맷 (displayDate 결과)
  comment?: string;
  photoUrl?: string;
  /** 시즌 승률 (0~1) — 선택 */
  seasonWinRate?: number;
}

export interface CardProps {
  data: CardData;
}
