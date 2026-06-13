import type { Team, TeamCode } from "@/types";

/**
 * KBO 10개 구단 정보 매핑
 * - color: 구단 대표 컬러 (정보 표시용, 직접 노출 최소화)
 * - pastel / pastelBg: 카드/UI에 사용하는 파스텔 버전
 * - mascot: 자체 캐릭터 PNG (구단 로고/공식 마스코트 아님)
 */
export const TEAMS: Record<TeamCode, Team> = {
  lions: {
    code: "lions",
    name: "라이온즈",
    short: "삼성",
    color: "#1A56DB",
    pastel: "#B8D4F8",
    pastelBg: "#EBF2FD",
    mascot: "/mascots/lions.png",
    emoji: "💙",
  },
  twins: {
    code: "twins",
    name: "트윈스",
    short: "LG",
    color: "#C62828",
    pastel: "#F4B8B8",
    pastelBg: "#FDE8E8",
    mascot: "/mascots/twins.png",
    emoji: "❤️",
  },
  tigers: {
    code: "tigers",
    name: "타이거즈",
    short: "KIA",
    color: "#E53935",
    pastel: "#F8C0B8",
    pastelBg: "#FDECEB",
    mascot: "/mascots/tigers.png",
    emoji: "🧡",
  },
  bears: {
    code: "bears",
    name: "베어스",
    short: "두산",
    color: "#1B1B3A",
     pastel: "#B8B8D4",
    pastelBg: "#EBEBF5",
    mascot: "/mascots/bears.png",
    emoji: "🌙",
  },
  eagles: {
    code: "eagles",
    name: "이글스",
    short: "한화",
    color: "#F57C00",
    pastel: "#F8D8B8",
    pastelBg: "#FDF0E0",
    mascot: "/mascots/eagles.png",
    emoji: "☀️",
  },
  giants: {
    code: "giants",
    name: "자이언츠",
    short: "롯데",
    color: "#1565C0",
    pastel: "#B8CCF4",
    pastelBg: "#E8F0FD",
    mascot: "/mascots/giants.png",
    emoji: "🌊",
  },
  dinos: {
    code: "dinos",
    name: "다이노스",
    short: "NC",
    color: "#00838F",
    pastel: "#B8E8EC",
    pastelBg: "#E0F5F7",
    mascot: "/mascots/dinos.png",
    emoji: "💚",
  },
  wiz: {
    code: "wiz",
    name: "위즈",
    short: "KT",
    color: "#000000",
    pastel: "#C8C8C8",
    pastelBg: "#F0F0F0",
    mascot: "/mascots/wiz.png",
    emoji: "✨",
  },
  heroes: {
    code: "heroes",
    name: "히어로즈",
    short: "키움",
    color: "#880E4F",
    pastel: "#E8B8D0",
    pastelBg: "#F8E8F0",
    mascot: "/mascots/heroes.png",
    emoji: "💖",
  },
  landers: {
    code: "landers",
    name: "랜더스",
    short: "SSG",
    color: "#C62828",
    pastel: "#F4B8B8",
    pastelBg: "#FDE8E8",
    mascot: "/mascots/landers.png",
    emoji: "🏟️",
  },
};

/** 팀 코드 → 팀 정보 조회 */
export function getTeam(code: TeamCode): Team {
  return TEAMS[code];
}

/** 전체 팀 목록 (온보딩 그리드 등에서 사용) */
export const TEAM_LIST: Team[] = Object.values(TEAMS);
