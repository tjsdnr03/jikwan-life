/**
 * 인증/세션 디버그용 브레드크럼 로거 (임시 — 진단 후 제거)
 *
 * iOS standalone PWA 는 Mac 없이는 원격 인스펙터를 못 붙이므로,
 * 콜드 런치 때 "어떤 경로에서 무슨 일이 일어났는지"를 localStorage 에 남겨
 * 화면(AuthDebugOverlay)에서 직접 확인한다. 리다이렉트로 페이지가 바뀌어도
 * 기록이 남으므로 전이 순서를 추적할 수 있다.
 */
const KEY = "__authlog";
const MAX = 50;

export interface AuthLogEntry {
  t: string; // 시각 HH:MM:SS.mmm
  p: string; // pathname
  m: string; // 메시지
}

export function authLog(m: string): void {
  if (typeof window === "undefined") return;
  try {
    const arr = readAuthLog();
    arr.push({
      t: new Date().toISOString().slice(11, 23),
      p: window.location.pathname,
      m,
    });
    while (arr.length > MAX) arr.shift();
    window.localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    // 저장 실패는 무시 (디버그용)
  }
}

export function readAuthLog(): AuthLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]") as AuthLogEntry[];
  } catch {
    return [];
  }
}

export function clearAuthLog(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
