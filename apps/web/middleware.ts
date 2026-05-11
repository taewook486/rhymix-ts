/**
 * NextAuth 미들웨어 — SPEC-AUTH-001 Slice F.
 *
 * 보호 경로(protectedRoutes) 에 비인증 사용자가 접근하면 /login 으로 리다이렉트하고,
 * 인증 전용 경로(authOnlyRoutes) 에 인증 사용자가 접근하면 / 로 리다이렉트한다.
 *
 * @MX:ANCHOR: [AUTO] 모든 페이지 요청이 통과하는 미들웨어 — 인증 라우팅의 단일 진입점.
 * @MX:REASON: 보호 경로와 인증 전용 경로를 한 곳에서 관리하여 우회 방지.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-F006, REQ-AUTH-F007
 */
import NextAuth from 'next-auth';

import { authConfig } from '@/lib/auth/config';

const protectedRoutes = ['/dashboard', '/admin', '/settings', '/profile'];
const authOnlyRoutes = ['/login', '/signup', '/password-reset'];

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isProtected = protectedRoutes.some((r) =>
    nextUrl.pathname.startsWith(r),
  );
  const isAuthRoute = authOnlyRoutes.some((r) =>
    nextUrl.pathname.startsWith(r),
  );

  if (!isLoggedIn && isProtected) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return Response.redirect(loginUrl, 307);
  }

  if (isLoggedIn && isAuthRoute) {
    return Response.redirect(new URL('/', nextUrl), 307);
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
