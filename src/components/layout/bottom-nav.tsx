"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Home,
  PenSquare,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIVE_COLOR = "#1A56DB";

/** 하단 탭: 홈 / 기록 / 달력 / 통계 / 마이 */
const TABS = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/record", label: "기록", icon: PenSquare },
  { href: "/calendar", label: "달력", icon: Calendar },
  { href: "/stats", label: "통계", icon: BarChart3 },
  { href: "/my", label: "마이", icon: User },
] as const;

/** 모바일 하단 고정 탭 네비게이션 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-slate-200 bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      aria-label="하단 탭 메뉴"
    >
      <div className="flex h-16 items-center justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors",
                active ? "text-[#1A56DB]" : "text-slate-400"
              )}
              style={active ? { color: ACTIVE_COLOR } : undefined}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.4 : 1.8}
                color={active ? ACTIVE_COLOR : undefined}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
