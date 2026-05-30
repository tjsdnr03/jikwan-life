// 직관생활 공통 타입 정의

/** 팀 코드 (10개 구단) */
export type TeamCode =
  | "lions"
  | "twins"
  | "tigers"
  | "bears"
  | "eagles"
  | "giants"
  | "dinos"
  | "wiz"
  | "heroes"
  | "landers";

/** 구장 코드 */
export type StadiumCode =
  | "jamsil"
  | "gocheok"
  | "incheon"
  | "suwon"
  | "daegu"
  | "gwangju"
  | "daejeon"
  | "busan"
  | "changwon";

/** 경기 결과 */
export type GameResult = "win" | "loss" | "draw";

/** KBO 경기 진행 상태 */
export type GameStatus = "scheduled" | "live" | "finished" | "cancelled";

/** 팀 정보 (컬러 매핑 포함) */
export interface Team {
  /** 팀 코드 (예: 'lions') */
  code: TeamCode;
  /** 팀 별칭 (예: '라이온즈') */
  name: string;
  /** 구단 단축명 (예: '삼성') */
  short: string;
  /** 구단 대표 컬러 */
  color: string;
  /** 파스텔 컬러 (카드 포인트용) */
  pastel: string;
  /** 파스텔 배경 컬러 */
  pastelBg: string;
}

/** 구장 정보 */
export interface Stadium {
  /** 구장 코드 (예: 'jamsil') */
  code: StadiumCode;
  /** 구장 이름 (예: '잠실야구장') */
  name: string;
  /** 도시 */
  city: string;
  /** 홈으로 사용하는 팀 코드 목록 */
  teams: TeamCode[];
}

/** 직관 기록 (records 테이블) */
export interface Record {
  id: string;
  user_id: string;
  game_date: string; // ISO date (YYYY-MM-DD)
  stadium: StadiumCode;
  my_team: TeamCode;
  opponent_team: TeamCode;
  my_score: number | null;
  opponent_score: number | null;
  result: GameResult | null;
  comment: string | null;
  is_home: boolean;
  photos: string[]; // Supabase Storage URL 배열
  created_at: string;
}

/** KBO 경기 데이터 캐시 (kbo_games 테이블) */
export interface KBOGame {
  id: string;
  game_date: string; // ISO date (YYYY-MM-DD)
  stadium: StadiumCode;
  home_team: TeamCode;
  away_team: TeamCode;
  home_score: number | null;
  away_score: number | null;
  status: GameStatus;
  inning_scores: InningScores | null; // 이닝별 점수
  fetched_at: string;
}

/** 이닝별 점수 (kbo_games.inning_scores) */
export interface InningScores {
  home: number[];
  away: number[];
}

/** 사용자 (users 테이블) */
export interface User {
  id: string;
  email: string;
  nickname: string | null;
  my_team: TeamCode;
  avatar_url: string | null;
  created_at: string;
}
