/**
 * Cloudflare Turnstile 전역 타입.
 *
 * 스크립트가 로드되면서 window 에 붙여 주는 객체라 선언이 필요하다.
 * 컴포넌트와 테스트가 각자 declare global 을 두면 "identical modifiers" 충돌이
 * 나므로 선언은 이 파일 한 곳에만 둔다.
 */
export {};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
      getResponse?: () => string;
    };
  }
}
