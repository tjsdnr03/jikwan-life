import { resultLabel } from "@/lib/utils";
import type { CardProps } from "./types";

/**
 * 파스텔 카드 템플릿 (MVP 기본)
 * - 인스타 스토리 비율 9:16 (1080x1920) — 미리보기는 aspect-[9/16]
 * - 내 팀 파스텔 컬러 적용 (구단 컬러 직접 노출 X, 로고/마스코트 X)
 * - html2canvas로 캡처할 수 있도록 순수 DOM/스타일로 구성
 */
export function PastelCard({ data }: CardProps) {
  const {
    myTeam,
    opponentTeam,
    myScore,
    opponentScore,
    result,
    stadiumName,
    gameDate,
    comment,
    photoUrl,
    seasonWinRate,
  } = data;

  return (
    <div
      className="relative flex aspect-[9/16] w-full flex-col overflow-hidden rounded-3xl p-7"
      style={{ backgroundColor: myTeam.pastelBg }}
    >
      {/* 상단: 날짜 + 구장 */}
      <div className="text-center">
        <p className="text-sm font-medium text-slate-500">{gameDate}</p>
        <p className="mt-1 text-base font-semibold text-slate-700">
          {stadiumName}
        </p>
      </div>

      {/* 사진 (선택) */}
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt="직관 사진"
          className="mt-5 h-44 w-full rounded-2xl object-cover"
        />
      ) : (
        <div
          className="mt-5 flex h-44 w-full items-center justify-center rounded-2xl text-5xl"
          style={{ backgroundColor: myTeam.pastel }}
        >
          ⚾️
        </div>
      )}

      {/* 스코어보드 */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <TeamScore name={myTeam.short} score={myScore} highlight />
        <span className="text-2xl font-bold text-slate-400">:</span>
        <TeamScore name={opponentTeam.short} score={opponentScore} />
      </div>

      {/* 결과 뱃지 */}
      <div className="mt-5 flex justify-center">
        <span
          className="rounded-full px-6 py-2 text-lg font-bold text-slate-700"
          style={{ backgroundColor: myTeam.pastel }}
        >
          {result === "win" ? "🎉 " : ""}
          {resultLabel(result)}
          {result === "win" ? "리!" : ""}
        </span>
      </div>

      {/* 코멘트 */}
      {comment ? (
        <p className="mt-6 px-2 text-center text-base leading-6 text-slate-600">
          “{comment}”
        </p>
      ) : null}

      {/* 하단: 시즌 승률 + 워터마크 */}
      <div className="mt-auto pt-6 text-center">
        {typeof seasonWinRate === "number" ? (
          <p className="text-sm font-medium text-slate-500">
            시즌 승률 {Math.round(seasonWinRate * 100)}%
          </p>
        ) : null}
        <p className="mt-1 text-xs font-semibold text-slate-400">직관생활</p>
      </div>
    </div>
  );
}

/** 카드 내 팀별 점수 표시 */
function TeamScore({
  name,
  score,
  highlight = false,
}: {
  name: string;
  score: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`text-sm font-semibold ${
          highlight ? "text-slate-700" : "text-slate-400"
        }`}
      >
        {name}
      </span>
      <span
        className={`text-5xl font-extrabold ${
          highlight ? "text-slate-800" : "text-slate-400"
        }`}
      >
        {score}
      </span>
    </div>
  );
}
