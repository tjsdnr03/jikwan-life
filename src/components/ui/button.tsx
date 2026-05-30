import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-[#1A56DB] text-white hover:bg-[#1547b8]",
  secondary: "bg-[#B8D4F8] text-[#1A56DB] hover:bg-[#a5c7f5]",
  ghost: "bg-transparent text-[#1A56DB] hover:bg-[#EBF2FD]",
};

/** 기본 버튼 컴포넌트 (모바일 친화 — 높이 큼, 둥근 모서리) */
export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "flex h-12 w-full items-center justify-center rounded-2xl px-5 text-base font-semibold transition-colors active:scale-[0.99] disabled:opacity-50",
        VARIANT_CLASS[variant],
        className
      )}
      {...props}
    />
  );
}
