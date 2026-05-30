import { NextResponse } from "next/server";

/**
 * 카드 이미지 생성 API (/api/card)
 * 1080x1920 인스타 스토리 이미지 생성 — @vercel/og 등 (Phase 1에서 구현)
 */
export async function POST() {
  return NextResponse.json({ message: "Card API — 구현 예정" });
}
