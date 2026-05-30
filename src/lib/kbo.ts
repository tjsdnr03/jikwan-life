import type { KBOGame, StadiumCode, TeamCode } from "@/types";

/**
 * KBO 데이터 유틸
 * 실제 크롤링/매칭 로직은 Phase 1 (api/kbo)에서 구현 예정.
 * 여기서는 기록 작성 시 경기 자동 매칭에 필요한 헬퍼만 정의한다.
 */

/** 날짜+구장으로 캐시된 경기 목록에서 매칭 (해당 구장 홈경기 1건) */
export function matchGame(
  games: KBOGame[],
  gameDate: string,
  stadium: StadiumCode
): KBOGame | null {
  return (
    games.find(
      (g) => g.game_date === gameDate && g.stadium === stadium
    ) ?? null
  );
}

/** 내 팀 기준으로 홈/원정 여부 판별 */
export function isHomeGame(game: KBOGame, myTeam: TeamCode): boolean {
  return game.home_team === myTeam;
}

/** 매칭된 경기 + 내 팀 기준으로 (내 점수, 상대 점수, 상대팀) 추출 */
export function resolveScore(
  game: KBOGame,
  myTeam: TeamCode
): {
  myScore: number | null;
  opponentScore: number | null;
  opponentTeam: TeamCode;
} {
  const home = isHomeGame(game, myTeam);
  return {
    myScore: home ? game.home_score : game.away_score,
    opponentScore: home ? game.away_score : game.home_score,
    opponentTeam: home ? game.away_team : game.home_team,
  };
}
