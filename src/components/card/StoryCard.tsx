import type { CSSProperties } from "react";
import { Star } from "lucide-react";

/**
 * 직관생활 포토카드 표시 컴포넌트 (1단계: 정적 카드)
 *
 * - 9:16 인스타 스토리 비율
 * - 두 가지 모드: "fill"(사진 꽉 채우기) / "matte"(사진 + 여백 배경색)
 * - 색상은 html2canvas-pro 추출 안정성을 위해 Tailwind 클래스 대신 inline style(hex/rgba)로 처리
 * - 이 컴포넌트는 "표시"만 담당한다. 컨트롤(모드/배경색/데코 토글)은 2단계 에디터에서 붙인다.
 */

// 카드에 들어갈 경기 데이터
export interface CardData {
  date: string; // 예: "2026.06.14"
  stadium: string; // 예: "대구"
  homeTeam: string; // 예: "삼성"
  awayTeam: string; // 예: "SSG"
  homeScore: number;
  awayScore: number;
  result: "WIN" | "LOSE" | "DRAW";
  comment?: string; // 자유 한 줄 코멘트 (선택)
  photoUrl?: string; // 사용자 사진 URL (없으면 샘플 배경)
}

export type CardMode = "fill" | "matte";

// 여백(matte) 모드 배경색 프리셋 — 2단계 에디터에서 그대로 재사용
export const BG_PRESETS = [
  { key: "cream", label: "크림", color: "#efe8db" },
  { key: "blue", label: "연파랑", color: "#d9e3ef" },
  { key: "pink", label: "연핑크", color: "#f4dde6" },
  { key: "mint", label: "민트", color: "#cfe3d6" },
  { key: "charcoal", label: "차콜", color: "#3a4150" },
] as const;

interface StoryCardProps {
  data: CardData;
  mode: CardMode;
  bgColor?: string; // matte 모드 배경색
  showDeco?: boolean; // 데코(별 등) 표시
  showCharacter?: boolean; // 캐릭터 스티커 표시
  characterUrl?: string; // 캐릭터 이미지 경로 (예: "/mascots/lions.png")
}

// 결과 영문 → 한글 표시
const RESULT_LABEL: Record<CardData["result"], string> = {
  WIN: "승리",
  LOSE: "패배",
  DRAW: "무승부",
};

// 사진이 없을 때 쓰는 샘플 배경(그라데이션)
const PLACEHOLDER_BG =
  "linear-gradient(160deg,#8ea6c9 0%,#5b7099 45%,#3a4a73 100%)";

const PHOTO_IMG_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center",
  display: "block",
  imageOrientation: "from-image",
};

/** 사진 또는 그라데이션 플레이스홀더 */
function PhotoArea({
  photoUrl,
  containerStyle,
}: {
  photoUrl?: string;
  containerStyle: CSSProperties;
}) {
  return (
    <div style={containerStyle}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="직관 사진" style={PHOTO_IMG_STYLE} />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: PLACEHOLDER_BG,
          }}
        />
      )}
    </div>
  );
}

// 배경색 밝기로 글씨색을 자동 결정 (밝은 배경 → 진한 남색 / 어두운 배경 → 흰색)
function getTextColor(hex: string): { main: string; sub: string } {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6
    ? { main: "#2d3a5c", sub: "#6b7794" }
    : { main: "#ffffff", sub: "rgba(255,255,255,0.72)" };
}

export default function StoryCard({
  data,
  mode,
  bgColor = "#efe8db",
  showDeco = false,
  showCharacter = false,
  characterUrl,
}: StoryCardProps) {
  const resultLabel = RESULT_LABEL[data.result];
  const scoreText = `${data.homeScore} : ${data.awayScore}`;

  // 카드 바깥 틀 (9:16). 5단계에서 PNG 추출 시 이 div를 ref로 잡는다.
  const frameStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth: 360,
    aspectRatio: "9 / 16",
    borderRadius: 16,
    overflow: "hidden",
    fontFamily: "Pretendard, sans-serif",
  };

  // ===== 채우기(fill) 모드: 사진을 꽉 채우고 정보 카드를 위에 얹는다 =====
  if (mode === "fill") {
    return (
      <div style={frameStyle}>
        <PhotoArea
          photoUrl={data.photoUrl}
          containerStyle={{ position: "absolute", inset: 0 }}
        />

        {showDeco && (
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              display: "flex",
              gap: 8,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            <Star size={16} />
            <Star size={16} />
          </div>
        )}

        {showCharacter && characterUrl && (
          <img
            src={characterUrl}
            alt=""
            style={{ position: "absolute", top: 12, left: 12, width: 40, height: 40 }}
          />
        )}

        {/* 정보 블록: 인스타 UI에 가리지 않게 하단 안전구역(17%)에 배치 */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "17%", padding: "0 16px" }}>
          <div
            style={{
              background: "rgba(0,0,0,0.36)",
              border: "0.5px solid rgba(255,255,255,0.25)",
              borderRadius: 14,
              padding: "14px 16px",
              color: "#ffffff",
            }}
          >
            {/* 날짜 + 결과 배지: 한 줄, 양끝 정렬 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.78)" }}>
                {data.date} · {data.stadium}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  background: "rgba(255,255,255,0.92)",
                  color: "#2d4079",
                  padding: "3px 10px",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                }}
              >
                {resultLabel}
              </span>
            </div>
            {/* 스코어: 한 줄, 팀명/점수는 줄바꿈 방지 */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>{data.homeTeam}</span>
              <span style={{ fontSize: 22, fontWeight: 500, whiteSpace: "nowrap" }}>{scoreText}</span>
              <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>{data.awayTeam}</span>
            </div>
            {data.comment && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 10, lineHeight: 1.5 }}>
                {data.comment}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== 여백(matte) 모드: 사진을 다 보여주고 남는 공간을 배경색 + 정보로 채운다 =====
  const txt = getTextColor(bgColor);
  return (
    <div
      style={{
        ...frameStyle,
        background: bgColor,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 16px",
      }}
    >
      <PhotoArea
        photoUrl={data.photoUrl}
        containerStyle={{
          width: "100%",
          aspectRatio: "3 / 2",
          borderRadius: 10,
          overflow: "hidden",
        }}
      />

      <div style={{ marginTop: 16, textAlign: "center" }}>
        {showDeco && (
          <div style={{ display: "flex", justifyContent: "center", gap: 9, color: txt.main, marginBottom: 7 }}>
            <Star size={14} />
            <Star size={14} />
          </div>
        )}

        {showCharacter && characterUrl && (
          <img src={characterUrl} alt="" style={{ width: 40, height: 40, margin: "0 auto 6px" }} />
        )}

        <div style={{ fontSize: 11, color: txt.sub }}>
          {data.date} · {data.stadium}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: txt.main,
            marginTop: 5,
            textAlign: "center",
          }}
        >
          {data.homeTeam} {scoreText} {data.awayTeam}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              whiteSpace: "nowrap",
              background: txt.main,
              color: bgColor,
            }}
          >
            {resultLabel}
          </span>
        </div>
        {data.comment && (
          <div style={{ fontSize: 12, color: txt.sub, marginTop: 8, lineHeight: 1.5 }}>{data.comment}</div>
        )}
      </div>
    </div>
  );
}
