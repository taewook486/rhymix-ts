/**
 * AutoLoginRefresher — SPEC-AUTH-001 Slice H.
 *
 * NextAuth 세션 쿠키가 없는 (unauthenticated) 상태이지만 `rx_autologin` 쿠키만
 * 있는 방문자에 대해, 클라이언트가 한 번만 `/api/auth/autologin-refresh` 를
 * 호출해 NextAuth 세션을 자동 재발급한다.
 *
 * 호출 조건 (AND):
 *   1) useSession().status === 'unauthenticated'
 *   2) document.cookie 안에 `rx_autologin=` 토큰이 존재
 *
 * useRef guard 로 컴포넌트 라이프사이클 동안 1회만 호출한다 — re-render 시
 * 중복 호출 금지. 응답이 ok=true 인 경우 `router.refresh()` 를 호출해 RSC
 * 트리를 새 세션 기반으로 다시 렌더링한다.
 *
 * @MX:NOTE: 본 컴포넌트는 RootLayout 안에 마운트되어 모든 페이지에서 작동.
 *   ok=false 응답은 silent 처리 — 사용자에게 오류를 노출하지 않는다 (UX).
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-019
 */
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function AutoLoginRefresher(): null {
  const { status } = useSession();
  const router = useRouter();
  const attempted = useRef(false);

  useEffect(() => {
    if (status !== 'unauthenticated') return;
    if (attempted.current) return;
    if (typeof document === 'undefined') return;
    if (!document.cookie.includes('rx_autologin=')) return;

    attempted.current = true;

    fetch('/api/auth/autologin-refresh', { method: 'POST' })
      .then((res) => res.json())
      .then((data: { ok?: boolean }) => {
        if (data?.ok === true) {
          router.refresh();
        }
      })
      .catch((err) => {
        // 네트워크 오류는 silent — UX 를 깨뜨리지 않는다.
        // eslint-disable-next-line no-console
        console.error('[AutoLoginRefresher] refresh failed:', err);
      });
  }, [status, router]);

  return null;
}
