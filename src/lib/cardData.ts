import { getStadium } from "@/lib/stadiums";
import { getTeam } from "@/lib/teams";
import { getResult } from "@/lib/utils";
import type { CardData } from "@/components/card/StoryCard";
import type { GameResult, Record as GameRecord } from "@/types";

/** 내 팀 기준 승패(win/loss/draw) → 카드 표기(WIN/LOSE/DRAW) */
const RESULT_TO_CARD: Record<GameResult, CardData["result"]> = {
  win: "WIN",
  loss: "LOSE",
  draw: "DRAW",
};

/** 'YYYY-MM-DD' → 'YYYY.MM.DD' (카드 표기용) */
function toCardDate(isoDate: string): string {
  return isoDate.replace(/-/g, ".");
}

/**
 * 직관 기록(records 행) → StoryCard 의 CardData 로 변환한다.
 *
 * - is_home 기준으로 home/away 팀과 스코어를 배치 (홈팀이 앞)
 * - result 는 record.result(내 팀 기준 승패)를 우선 사용하고,
 *   없으면 내 팀 스코어로 계산한다
 * - 팀명은 단축명(삼성, SSG 등), 날짜는 'YYYY.MM.DD', 구장은 약칭(잠실, 고척 등)
 * - photoUrl 은 첫 번째 사진(있으면)
 *
 * 표시 전용 변환이며 DB 를 변경하지 않는다.
 */
export function recordToCardData(record: GameRecord): CardData {
  const myTeam = getTeam(record.my_team);
  const opponentTeam = getTeam(record.opponent_team);

  const myScore = record.my_score ?? 0;
  const opponentScore = record.opponent_score ?? 0;

  // 내 팀 기준 승패: 저장된 값 우선, 없으면 스코어로 계산
  const myResult: GameResult =
    record.result ?? getResult(myScore, opponentScore);

  // 홈/원정 배치 (홈팀이 home, 원정팀이 away)
  const homeTeam = record.is_home ? myTeam : opponentTeam;
  const awayTeam = record.is_home ? opponentTeam : myTeam;
  const homeScore = record.is_home ? myScore : opponentScore;
  const awayScore = record.is_home ? opponentScore : myScore;

  return {
    date: toCardDate(record.game_date),
    stadium: getStadium(record.stadium).short,
    homeTeam: homeTeam.short,
    awayTeam: awayTeam.short,
    homeScore,
    awayScore,
    result: RESULT_TO_CARD[myResult],
    comment: record.comment ?? undefined,
    photoUrl: record.photos?.[0],
  };
}
