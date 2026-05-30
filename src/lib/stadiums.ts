import type { Stadium, StadiumCode } from "@/types";

/**
 * KBO 9개 구장 정보 매핑
 * teams: 해당 구장을 홈으로 사용하는 팀 코드 목록
 * (잠실은 두산/LG 공동 사용)
 */
export const STADIUMS: Record<StadiumCode, Stadium> = {
  jamsil: {
    code: "jamsil",
    name: "잠실야구장",
    city: "서울",
    teams: ["bears", "twins"],
  },
  gocheok: {
    code: "gocheok",
    name: "고척스카이돔",
    city: "서울",
    teams: ["heroes"],
  },
  incheon: {
    code: "incheon",
    name: "인천SSG랜더스필드",
    city: "인천",
    teams: ["landers"],
  },
  suwon: {
    code: "suwon",
    name: "수원KT위즈파크",
    city: "수원",
    teams: ["wiz"],
  },
  daegu: {
    code: "daegu",
    name: "대구삼성라이온즈파크",
    city: "대구",
    teams: ["lions"],
  },
  gwangju: {
    code: "gwangju",
    name: "기아챔피언스필드",
    city: "광주",
    teams: ["tigers"],
  },
  daejeon: {
    code: "daejeon",
    name: "한화생명이글스파크",
    city: "대전",
    teams: ["eagles"],
  },
  busan: {
    code: "busan",
    name: "사직구장",
    city: "부산",
    teams: ["giants"],
  },
  changwon: {
    code: "changwon",
    name: "창원NC파크",
    city: "창원",
    teams: ["dinos"],
  },
};

/** 구장 코드 → 구장 정보 조회 */
export function getStadium(code: StadiumCode): Stadium {
  return STADIUMS[code];
}

/** 전체 구장 목록 (구장 선택 리스트 등에서 사용) */
export const STADIUM_LIST: Stadium[] = Object.values(STADIUMS);
