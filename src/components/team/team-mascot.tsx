"use client";

import Image from "next/image";
import { useState } from "react";
import { getTeam } from "@/lib/teams";
import { cn } from "@/lib/utils";
import type { Team, TeamCode } from "@/types";

const SIZE_CLASS = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
} as const;

const SIZE_PX = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
} as const;

type TeamMascotSize = keyof typeof SIZE_CLASS;

interface TeamMascotProps {
  team: Team | TeamCode;
  size?: TeamMascotSize;
  className?: string;
  /** html2canvas 캡처용 — next/image 최적화 비활성화 */
  unoptimized?: boolean;
}

/** 팀 자체 캐릭터 이미지 (로드 실패 시 emoji fallback) */
export function TeamMascot({
  team,
  size = "md",
  className,
  unoptimized = false,
}: TeamMascotProps) {
  const [failed, setFailed] = useState(false);
  const t = typeof team === "string" ? getTeam(team) : team;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl",
        SIZE_CLASS[size],
        className
      )}
    >
      {failed ? (
        <span className="text-base leading-none" role="img" aria-label={t.name}>
          {t.emoji}
        </span>
      ) : (
        <Image
          src={t.mascot}
          alt={t.name}
          fill
          unoptimized={unoptimized}
          className="object-contain"
          sizes={`${SIZE_PX[size]}px`}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
