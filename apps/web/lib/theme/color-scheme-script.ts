/**
 * FOIT 방지 인라인 스크립트 — SSR `<head>`에 주입
 *
 * REQ-THEME-POLISH-033: React hydration 전에 localStorage와 prefers-color-scheme을
 * 확인하여 <html> 요소에 dark 클래스를 추가한다.
 *
 * @see apps/web/app/layout.tsx
 *
 * @remarks
 * dangerouslySetInnerHTML로 사용 — 정적 문자열, 사용자 입력을 포함하지 않으므로 XSS 위험 없음.
 */

// IIFE로 즉시 실행 — 동기 실행, defer/async 없음
// REQ-THEME-POLISH-033: FOIT 방지를 위해 hydration 전에 실행
export const colorSchemeScript = `
(function() {
  try {
    var pref = localStorage.getItem('rx-color-scheme');
    var dark = pref === 'dark' || (pref === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`.trim();
