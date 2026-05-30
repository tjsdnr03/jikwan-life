import { NextResponse } from "next/server";

/**
 * KBO 데이터 크롤링/매칭 API (/api/kbo)
 * 날짜+구장 기준 경기 결과 조회 — kbo_games 캐시 + 크롤링 (Phase 1에서 구현)
 */
export async function GET() {
  return NextResponse.json({ message: "KBO API — 구현 예정", games: [] });
}
