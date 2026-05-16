/**
 * SessionProviderWrapper — SPEC-AUTH-001 Slice H.
 *
 * NextAuth `SessionProvider` 는 client-only 컴포넌트이므로 RootLayout 의
 * Server Component 안에서 직접 사용할 수 없다. 본 thin wrapper 가
 * 경계 역할을 한다.
 *
 * @MX:NOTE: SessionProvider 옵션 튜닝(`refetchInterval`, `refetchOnWindowFocus`)
 *   은 본 슬라이스의 OUT OF SCOPE — 기본값 사용.
 */
'use client';

import { SessionProvider } from 'next-auth/react';

export function SessionProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
