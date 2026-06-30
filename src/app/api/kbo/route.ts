import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { STADIUM_LIST } from "@/lib/stadiums";
import { TEAM_LIST } from "@/lib/teams";
import type {
  GameStatus,
  InningScores,
  KBOGame,
  KBOGameResult,
  KBOScheduleGame,
  LineScoreTotals,
  StadiumCode,
  TeamCode,
} from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 캐시된 경기가 확정값(종료/취소)인지 */
function isFinal(g: KBOGame): boolean {
  return g.status === "finished" || g.status === "cancelled";
}

/**
 * KBO 경기 API
 *   - /api/kbo?date=YYYY-MM-DD  → 해당 날짜 경기 결과 (KBOGameResult[])
 *   - /api/kbo?month=YYYY-MM    → 해당 월 전체 일정 (KBOScheduleGame[], date 포함)
 *
 * 공통 동작:
 *   1. kbo_games 캐시에 데이터가 있고 모두 확정(종료/취소)이면 그대로 반환
 *   2. 아니면 네이버 스포츠 스케줄 API(JSON)에서 가져와 파싱·매핑
 *   3. service_role 로 kbo_games 에 upsert(캐싱) — 키가 없으면 캐싱만 생략
 *   4. 어떤 에러든 빈 배열([])로 응답
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const linescore = searchParams.get("linescore") ?? "";
  const month = searchParams.get("month") ?? "";
  const date = searchParams.get("date") ?? "";

  // 라인스코어 지연 수집 모드 (/api/kbo?linescore=<gameId>)
  // 종료 경기의 inning_scores 가 비어 있을 때만 record 1회 호출 → 캐시. 응답: InningScores | null
  if (linescore) {
    // gameId 형식 검증 (영숫자) — 비정상 입력은 record 호출 없이 차단
    if (!/^[A-Za-z0-9]{1,32}$/.test(linescore)) {
      return NextResponse.json(null);
    }
    try {
      const result = await collectLineScore(linescore);
      return NextResponse.json(result);
    } catch (err) {
      // gameId 만 로그 (선수 정보 없음)
      console.error("[kbo] 라인스코어 수집 실패:", linescore, err);
      return NextResponse.json(null);
    }
  }

  // 월간 일정 모드 (YYYY-MM)
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json([] as KBOScheduleGame[]);
    }
    const [year, mon] = month.split("-").map(Number);
    const fromDate = `${month}-01`;
    const lastDay = new Date(year, mon, 0).getDate();
    const toDate = `${month}-${String(lastDay).padStart(2, "0")}`;

    try {
      const admin = createAdminClient();

      // 1. 네이버 스케줄 API는 fromDate~toDate 범위 조회를 지원하므로
      //    월 전체를 단 한 번의 호출로 가져온다 (날짜별 30회 호출 불필요).
      const rows = await fetchKboGames(fromDate, toDate);

      if (rows.length > 0) {
        // 2. 캐싱 (best-effort) 후 신선한 데이터 반환
        await cacheRows(admin, rows);
        return NextResponse.json(rows.map(rowToSchedule));
      }

      // 3. 네이버 실패(네트워크 등) — 캐시로 폴백.
      //    단일 날짜(api/kbo?date=) 호출로 일부 날짜만 캐시돼 있을 수 있어
      //    "완결 여부"는 신뢰하지 않고, 가진 만큼만 폴백으로 돌려준다.
      const db = admin ?? (await createServerClient());
      const { data: cachedData } = await db
        .from("kbo_games")
        .select("*")
        .gte("game_date", fromDate)
        .lte("game_date", toDate);
      const cached = (cachedData ?? []) as KBOGame[];
      return NextResponse.json(cached.map(rowToSchedule));
    } catch (err) {
      console.error("[kbo] 월간 일정 조회 실패:", err);
      return NextResponse.json([] as KBOScheduleGame[]);
    }
  }

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
    if (cached.length > 0 && cached.every(isFinal)) {
      return NextResponse.json(cached.map(rowToResult));
    }

    // 2. 네이버에서 가져와 파싱
    const rows = await fetchKboGames(date, date);
    if (rows.length === 0) {
      // 네트워크 실패 등 — 캐시라도 있으면 반환, 없으면 빈 배열
      return NextResponse.json(cached.map(rowToResult));
    }

    // 3. 캐싱 (best-effort — service_role 이 있을 때만 시도)
    await cacheRows(admin, rows);

    // 4. 응답
    return NextResponse.json(rows.map(rowToResult));
  } catch (err) {
    console.error("[kbo] 조회 실패:", err);
    return NextResponse.json([] as KBOGameResult[]);
  }
}

/** kbo_games 에 best-effort upsert (admin 클라이언트가 있을 때만) */
async function cacheRows(
  admin: ReturnType<typeof createAdminClient>,
  rows: KBOGame[]
): Promise<void> {
  if (!admin) {
    // service_role 키가 없어 캐시 쓰기를 건너뜀 → 무음 실패 재발 방지를 위해 경고.
    console.warn(
      "[kbo] 캐시 저장 건너뜀: SUPABASE_SERVICE_ROLE_KEY 없음 (rows:",
      rows.length,
      ")"
    );
    return;
  }
  const { error } = await admin
    .from("kbo_games")
    .upsert(rows, { onConflict: "game_date,home_team,away_team" });
  if (error) {
    console.error("[kbo] 캐시 저장 실패:", error.message);
  }
}

// ============================================================
// 라인스코어(이닝별 점수) 지연 수집 — record 엔드포인트
// ============================================================

/**
 * game_id 로 종료 경기의 라인스코어를 1회 수집해 kbo_games.inning_scores 에 캐시한다.
 *
 * 정책:
 *  - 행이 없으면 null.
 *  - inning_scores 가 이미 있으면 record 호출 없이 그대로 반환(영구 캐시).
 *  - status 가 'finished' 인 경기에만 수집(예정/진행/취소는 null).
 *  - 경기당 record 1회만 호출(폴링 없음). 저장 실패/네이버 실패는 best-effort(예외 던지지 않음).
 */
async function collectLineScore(gameId: string): Promise<InningScores | null> {
  const admin = createAdminClient();
  const db = admin ?? (await createServerClient());

  const { data: row } = await db
    .from("kbo_games")
    .select("status, inning_scores")
    .eq("game_id", gameId)
    .maybeSingle<Pick<KBOGame, "status" | "inning_scores">>();

  if (!row) return null;
  // 이미 캐시돼 있으면 record 호출하지 않고 그대로 반환
  if (row.inning_scores) return row.inning_scores;
  // 종료 경기만 수집
  if (row.status !== "finished") return null;

  const scoreBoard = await fetchScoreBoard(gameId);
  const lineScore = scoreBoardToInningScores(scoreBoard);
  if (!lineScore) return null;

  // best-effort 저장 (service_role 있을 때만). game_id 로 해당 행만 갱신.
  if (admin) {
    const { error } = await admin
      .from("kbo_games")
      .update({ inning_scores: lineScore })
      .eq("game_id", gameId);
    if (error) {
      console.error("[kbo] 라인스코어 저장 실패:", gameId, error.message);
    }
  } else {
    // service_role 키가 없어 쓰기를 건너뜀 → 캐시가 안 쌓여 매 호출마다 record 재요청됨.
    // 과거의 무음 실패 재발 방지를 위해 경고를 남긴다 (민감정보 없이 gameId 만).
    console.warn(
      "[kbo] 라인스코어 저장 건너뜀: SUPABASE_SERVICE_ROLE_KEY 없음 (gameId:",
      gameId,
      ")"
    );
  }

  return lineScore;
}

/**
 * 네이버 record 엔드포인트에서 scoreBoard 객체만 꺼내 반환한다.
 * ★ scoreBoard 외 키(battersBoxscore/pitchersBoxscore/teamPitchingBoxscore/
 *   pitchingResult/etcRecords 등 선수 포함 데이터)는 읽지도 저장하지도 로그에 남기지도 않는다.
 * 실패 시 null.
 */
async function fetchScoreBoard(gameId: string): Promise<unknown> {
  const url = `https://api-gw.sports.naver.com/schedule/games/${gameId}/record`;
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
    console.error("[kbo] record 응답 오류:", gameId, res.status);
    return null;
  }
  const json = (await res.json()) as {
    result?: { recordData?: { scoreBoard?: unknown } };
  };
  // scoreBoard 키만 추출하고 나머지는 버린다.
  return json?.result?.recordData?.scoreBoard ?? null;
}

/**
 * 네이버 scoreBoard → 우리 InningScores 로 방어적 변환.
 * inn/rheb 또는 home/away 가 없거나 형태가 다르면 null (예외 던지지 않음).
 * scoreBoard 외 키는 일절 참조하지 않는다.
 */
function scoreBoardToInningScores(sb: unknown): InningScores | null {
  if (!sb || typeof sb !== "object") return null;
  const board = sb as {
    inn?: { home?: unknown; away?: unknown };
    rheb?: { home?: unknown; away?: unknown };
  };
  if (!board.inn || !board.rheb) return null;

  const innHome = toIntArray(board.inn.home);
  const innAway = toIntArray(board.inn.away);
  if (!innHome || !innAway) return null;

  const rhebHome = toTotals(board.rheb.home);
  const rhebAway = toTotals(board.rheb.away);
  if (!rhebHome || !rhebAway) return null;

  return {
    inn: { home: innHome, away: innAway },
    rheb: { home: rhebHome, away: rhebAway },
  };
}

/** 이닝별 득점 배열(문자/숫자 혼재 가능) → number[]. 배열 아니면 null */
function toIntArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  return value.map((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  });
}

/** {r,h,e,b} 합계 → LineScoreTotals. 객체 아니면 null */
function toTotals(value: unknown): LineScoreTotals | null {
  if (!value || typeof value !== "object") return null;
  const t = value as Record<string, unknown>;
  const num = (x: unknown) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  };
  return { r: num(t.r), h: num(t.h), e: num(t.e), b: num(t.b) };
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
  gameId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamScore?: number | string | null;
  awayTeamScore?: number | string | null;
  statusCode?: string;
  gameStatusCode?: string;
  cancel?: boolean;
  suspended?: boolean;
  gameDate?: number | string;
  gameDateTime?: string;
  timeTbd?: boolean;
}

/**
 * 네이버 스포츠 스케줄 API에서 [fromDate, toDate] 범위의 KBO 경기를 가져와
 * kbo_games 테이블 형태의 row 배열로 변환한다 (각 row 의 game_date 는 실제 경기일).
 */
async function fetchKboGames(
  fromDate: string,
  toDate: string
): Promise<KBOGame[]> {
  const url =
    `https://api-gw.sports.naver.com/schedule/games` +
    `?fields=basic,schedule,baseball` +
    `&upperCategoryId=kbaseball&categoryId=kbo` +
    `&fromDate=${fromDate}&toDate=${toDate}&size=500`;

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
      game_id: g.gameId ?? null, // 네이버 경기 식별자 (record 엔드포인트 등 후속 단계용)
      game_date: parseGameDate(g, fromDate),
      game_datetime: parseGameDateTime(g),
      time_tbd: g.timeTbd ?? false,
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

/**
 * 네이버 경기 객체에서 경기일(YYYY-MM-DD)을 추출한다.
 * gameDate(20260614) / gameDateTime(ISO) 등 표기 변형을 모두 처리하고,
 * 파싱 실패 시 fallback(요청 시작일)을 사용한다.
 */
function parseGameDate(g: NaverGame, fallback: string): string {
  const raw = g.gameDate ?? g.gameDateTime;
  if (raw === undefined || raw === null) return fallback;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return fallback;
}

/**
 * 네이버 gameDateTime("2026-06-19T18:30:00", 오프셋 없는 KST 벽시계)을
 * KST 오프셋(+09:00)을 붙인 ISO 문자열로 변환한다. 없거나 형식이 다르면 null.
 * TIMESTAMPTZ 컬럼에 정확한 시점으로 저장된다.
 */
function parseGameDateTime(g: NaverGame): string | null {
  const raw = g.gameDateTime;
  if (!raw) return null;
  // "YYYY-MM-DDTHH:MM:SS" (오프셋 없음) 형태만 보정. 이미 오프셋이 있으면 그대로 둔다.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw) && !/[+-]\d{2}:?\d{2}|Z$/.test(raw)) {
    return `${raw}+09:00`;
  }
  return raw;
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

/** kbo_games row → API 응답 형태 (날짜 미포함) */
function rowToResult(row: KBOGame): KBOGameResult {
  return {
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    homeScore: row.home_score,
    awayScore: row.away_score,
    stadium: row.stadium,
    status: row.status,
    gameId: row.game_id,
    gameDateTime: row.game_datetime,
    timeTbd: row.time_tbd,
  };
}

/** kbo_games row → 월간 일정 응답 형태 (날짜 포함) */
function rowToSchedule(row: KBOGame): KBOScheduleGame {
  return { date: row.game_date, ...rowToResult(row) };
}
