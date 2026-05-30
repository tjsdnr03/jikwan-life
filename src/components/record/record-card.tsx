import Link from "next/link";
import { getTeam } from "@/lib/teams";
import { getStadium } from "@/lib/stadiums";
import { displayDate, resultLabel } from "@/lib/utils";
import type { Record } from "@/types";

/** 결과별 뱃지 색상 (승=초록 / 패=빨강 / 무=회색) */
const RESULT_COLOR: { [key: string]: string } = {
  win: "bg-emerald-100 text-emerald-700",
  loss: "bg-rose-100 text-rose-700",
  draw: "bg-slate-100 text-slate-600",
};

/** 기록 목록/홈 화면에서 사용하는 직관 기록 요약 카드 */
export function RecordCard({ record }: { record: Record }) {
  const myTeam = getTeam(record.my_team);
  const opponent = getTeam(record.opponent_team);
  const stadium = getStadium(record.stadium);

  return (
    <Link
      href={`/record/${record.id}`}
      className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
      style={{ borderColor: myTeam.pastel }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {displayDate(record.game_date)}
        </span>
        {record.result ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              RESULT_COLOR[record.result] ?? RESULT_COLOR.draw
            }`}
          >
            {resultLabel(record.result)}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-base font-semibold text-slate-800">
          {myTeam.short} {record.my_score ?? "-"}
        </span>
        <span className="text-slate-400">:</span>
        <span className="text-base font-semibold text-slate-800">
          {record.opponent_score ?? "-"} {opponent.short}
        </span>
      </div>

      <p className="mt-1 text-xs text-slate-400">{stadium.name}</p>
    </Link>
  );
}
