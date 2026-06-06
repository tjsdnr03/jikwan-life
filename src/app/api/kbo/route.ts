import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { STADIUM_LIST } from "@/lib/stadiums";
import { TEAM_LIST } from "@/lib/teams";
import type {
  GameStatus,
  KBOGame,
  KBOGameResult,
  StadiumCode,
  TeamCode,
} from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * KBO 경기 결과 API (/api/kbo?date=YYYY-MM-DD)
 *
 * 동작:
 *   1. kbo_games 캐시에 해당 날짜 데이터가 있으면 그대로 반환
 *   2. 없으면 네이버 스포츠 스케줄 API(JSON)에서 가져와 파싱·매핑
 *   3. service_role 로 kbo_games 에 upsert(캐싱) — 키가 없으면 캐싱만 생략
 *   4. 어떤 에러든 빈 배열([])로 응답
 *
 * 응답: KBOGameResult[]  (팀/구장은 우리 코드로 매핑된 값)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";

  // 날짜 형식 검증 (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json([] as KBOGameResult[]);
  }

  try {
    // 쓰기는 service_role 우선, 없으면 쿠키 기반 클라이언트(읽기 전용)로 폴백
    const admin = createAdminClient();
    const db = admin ?? (await createServerClient());

    // 1. 캐시 조회
    const { data: cachedData } = await db
      .from("kbo_games")
      .select("*")
      .eq("game_date", date);
    const cached = (cachedData ?? []) as KBOGame[];

    // 모든 경기가 종료/취소된 날이면 캐시가 확정값이므로 그대로 반환.
    // 예정/진행 중 경기가 섞여 있으면 최신 결과 반영을 위해 다시 가져온다.
    const allFinal =
      cached.length > 0 &&
      cached.every((g) => g.status === "finished" || g.status === "cancelled");
    if (allFinal) {
      return NextResponse.json(cached.map(rowToResult));
    }

    // 2. 네이버에서 가져와 파싱
    const rows = await fetchKboGames(date);
    if (rows.length === 0) {
      // 네트워크 실패 등 — 캐시라도 있으면 반환, 없으면 빈 배열
      return NextResponse.json(cached.map(rowToResult));
    }

    // 3. 캐싱 (best-effort — service_role 이 있을 때만 시도)
    if (admin) {
      const { error: upsertError } = await admin
        .from("kbo_games")
        .upsert(rows, { onConflict: "game_date,home_team,away_team" });
      if (upsertError) {
        console.error("[kbo] 캐시 저장 실패:", upsertError.message);
      }
    }

    // 4. 응답
    return NextResponse.json(rows.map(rowToResult));
  } catch (err) {
    console.error("[kbo] 조회 실패:", err);
    return NextResponse.json([] as KBOGameResult[]);
  }
}

// ============================================================
// 매핑 테이블
// ============================================================

/** 구단 단축명(네이버 표기) → 팀 코드 (예: '삼성' → 'lions') */
const NAME_TO_CODE: Record<string, TeamCode> = (() => {
  const map: Record<string, TeamCode> = {};
  for (const team of TEAM_LIST) map[team.short] = team.code;
  // 과거/표기 변형 보정
  Object.assign(map, {
    kt: "wiz" as TeamCode,
    KIA: "tigers" as TeamCode,
    기아: "tigers" as TeamCode,
    SK: "landers" as TeamCode, // SSG 전신
    넥센: "heroes" as TeamCode, // 키움 전신
    우리: "heroes" as TeamCode,
  });
  return map;
})();

/** 홈팀 코드 → 홈 구장 코드 (잠실은 bears/twins 공용) */
const STADIUM_BY_HOME_TEAM: Record<TeamCode, StadiumCode> = (() => {
  const map = {} as Record<TeamCode, StadiumCode>;
  for (const s of STADIUM_LIST) {
    for (const t of s.teams) map[t] = s.code;
  }
  return map;
})();

// ============================================================
// 네이버 스포츠 스케줄 API
// ============================================================

interface NaverGame {
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamScore?: number | string | null;
  awayTeamScore?: number | string | null;
  statusCode?: string;
  gameStatusCode?: string;
  cancel?: boolean;
  suspended?: boolean;
}

/**
 * 네이버 스포츠 스케줄 API에서 특정 날짜의 KBO 경기를 가져와
 * kbo_games 테이블 형태의 row 배열로 변환한다.
 */
async function fetchKboGames(date: string): Promise<KBOGame[]> {
  const url =
    `https://api-gw.sports.naver.com/schedule/games` +
    `?fields=basic,schedule,baseball` +
    `&upperCategoryId=kbaseball&categoryId=kbo` +
    `&fromDate=${date}&toDate=${date}&size=500`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Referer: "https://sports.news.naver.com/kbaseball/schedule/index",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[kbo] 네이버 응답 오류:", res.status);
    return [];
  }

  const json = (await res.json()) as { result?: { games?: NaverGame[] } };
  const games = json?.result?.games ?? [];

  const rows: KBOGame[] = [];
  for (const g of games) {
    const home = resolveTeamCode(g.homeTeamName);
    const away = resolveTeamCode(g.awayTeamName);
    if (!home || !away) continue; // 매핑 실패한 경기는 건너뜀

    const stadium = STADIUM_BY_HOME_TEAM[home];
    if (!stadium) continue;

    // 취소/서스펜디드 경기는 상태코드가 'BEFORE'로 남아있을 수 있어 boolean 우선 처리
    const status: GameStatus =
      g.cancel || g.suspended
        ? "cancelled"
        : mapStatus(g.statusCode ?? g.gameStatusCode);
    const scored = status === "finished" || status === "live";

    rows.push({
      // id/fetched_at 은 DB 기본값에 맡긴다.
      game_date: date,
      stadium,
      home_team: home,
      away_team: away,
      home_score: scored ? parseScore(g.homeTeamScore) : null,
      away_score: scored ? parseScore(g.awayTeamScore) : null,
      status,
      inning_scores: null,
    } as KBOGame);
  }

  return rows;
}

/** 네이버 팀명 → 팀 코드 (공백 제거 후 매핑) */
function resolveTeamCode(name?: string): TeamCode | null {
  if (!name) return null;
  const key = name.replace(/\s+/g, "");
  return NAME_TO_CODE[key] ?? NAME_TO_CODE[key.toUpperCase()] ?? null;
}

/** 네이버 상태 코드 → 우리 GameStatus */
function mapStatus(code?: string): GameStatus {
  switch ((code ?? "").toUpperCase()) {
    case "RESULT":
    case "FINAL":
    case "END":
      return "finished";
    case "STARTED":
    case "LIVE":
    case "PLAYING":
      return "live";
    case "CANCEL":
    case "CANCELLED":
    case "POSTPONED":
    case "SUSPENDED":
    case "RAINCANCEL":
      return "cancelled";
    default:
      return "scheduled";
  }
}

/** 점수 파싱 (숫자 아니면 null) */
function parseScore(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** kbo_games row → API 응답 형태 */
function rowToResult(row: KBOGame): KBOGameResult {
  return {
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    homeScore: row.home_score,
    awayScore: row.away_score,
    stadium: row.stadium,
    status: row.status,
  };
}
