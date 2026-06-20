"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { authLog, clearAuthLog, readAuthLog, type AuthLogEntry } from "@/lib/authDebug";

/**
 * 인증/세션 진단용 화면 오버레이 (임시 — 진단 후 제거)
 *
 * iOS standalone PWA 에서 콜드 런치 시 실제로 무슨 일이 일어나는지 폰 화면에서
 * 바로 확인한다. 측정 항목:
 *  - 어떤 URL 로 앱이 열렸는가 (pathname)
 *  - standalone(홈 화면 PWA) 모드인가
 *  - localStorage 에 supabase 세션 키가 있는가
 *  - getSession() 이 세션을 복원하는가 (만료 여부 포함)
 *  - 가드들이 남긴 브레드크럼 로그
 */
export function AuthDebugOverlay() {
  const [open, setOpen] = useState(true);
  const [lines, setLines] = useState<string[]>(["측정 중..."]);
  const [log, setLog] = useState<AuthLogEntry[]>([]);

  async function measure() {
    const out: string[] = [];
    try {
      const standalone =
        // iOS Safari 전용 플래그
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
          true ||
        window.matchMedia("(display-mode: standalone)").matches;
      out.push(`path: ${window.location.pathname}`);
      out.push(`standalone: ${standalone}`);
      out.push(`online: ${navigator.onLine}`);

      const sbKeys = Object.keys(window.localStorage).filter((k) =>
        /^sb-.*-auth-token/.test(k)
      );
      out.push(`localStorage sb-key: ${sbKeys.length ? sbKeys.join(", ") : "없음"}`);

      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        out.push(`getSession: ERROR ${error.message}`);
      } else if (!data.session) {
        out.push(`getSession: 세션 없음`);
      } else {
        const s = data.session;
        const exp = s.expires_at ? new Date(s.expires_at * 1000) : null;
        const expired = exp ? exp.getTime() < Date.now() : false;
        out.push(`getSession: OK ${s.user.email ?? s.user.id.slice(0, 8)}`);
        out.push(
          `expires: ${exp ? exp.toLocaleString() : "?"} ${expired ? "(만료됨!)" : "(유효)"}`
        );
      }
    } catch (e) {
      out.push(`측정 예외: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLines(out);
    setLog(readAuthLog());
  }

  useEffect(() => {
    authLog("overlay: mount");
    // 비동기 측정 — await 이후에 setState 하므로 동기 cascading 아님
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void measure();
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          top: "calc(env(safe-area-inset-top) + 4px)",
          right: 4,
          zIndex: 99999,
          fontSize: 11,
          padding: "2px 8px",
          borderRadius: 6,
          background: "#1A56DB",
          color: "#fff",
        }}
      >
        debug
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top) + 4px)",
        left: 4,
        right: 4,
        zIndex: 99999,
        background: "rgba(0,0,0,0.86)",
        color: "#e6f0ff",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        lineHeight: 1.45,
        padding: 8,
        borderRadius: 8,
        maxHeight: "55vh",
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <strong style={{ flex: 1 }}>AUTH DEBUG</strong>
        <button type="button" onClick={measure} style={btn}>
          새로고침
        </button>
        <button
          type="button"
          onClick={() => {
            clearAuthLog();
            setLog([]);
          }}
          style={btn}
        >
          로그삭제
        </button>
        <button type="button" onClick={() => setOpen(false)} style={btn}>
          닫기
        </button>
      </div>

      {lines.map((l, i) => (
        <div key={i} style={{ whiteSpace: "pre-wrap" }}>
          {l}
        </div>
      ))}

      <div style={{ marginTop: 8, opacity: 0.75 }}>── 브레드크럼 ──</div>
      {log.length === 0 ? (
        <div style={{ opacity: 0.6 }}>(없음)</div>
      ) : (
        log.map((e, i) => (
          <div key={i} style={{ whiteSpace: "pre-wrap" }}>
            {e.t} [{e.p}] {e.m}
          </div>
        ))
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 6,
  background: "#1A56DB",
  color: "#fff",
};
