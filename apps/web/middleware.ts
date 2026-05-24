/**
 * NextAuth 미들웨어 — SPEC-AUTH-001 Slice F + SPEC-ADMIN-001 Slice B + SPEC-INSTALL-001 Slice A.
 *
 * 처리 순서:
 *   1. forceHttps 검사 (REQ-ADMIN-014) — 인증보다 먼저 실행.
 *   2. Install gate (REQ-INSTALL-001, 020) — 미설치 시 /install 302 리다이렉트.
 *   3. Host → Domain 해석 + 헤더 주입 (REQ-ADMIN-010, REQ-ADMIN-011).
 *   4. 기존 AUTH-001 Slice F 인증 보호 (REQ-AUTH-F006, REQ-AUTH-F007).
 *
 * @MX:ANCHOR: [AUTO] 모든 페이지 요청이 통과하는 미들웨어 — 인증·라우팅 컨텍스트의 단일 진입점.
 * @MX:REASON: REQ-ADMIN-010/011 에서 주입한 헤더를 라우트/Server Component/tRPC 모두가 신뢰.
 *             헤더 스푸핑은 Node Runtime + Same-origin 가정 위에서 방지됨.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-F006, SPEC-ADMIN-001 REQ-ADMIN-010~014, SPEC-INSTALL-001 REQ-INSTALL-001/020
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';

import { authConfig } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { shouldRedirectToInstall } from '@/lib/install/middleware-gate';

export const runtime = 'nodejs';

const protectedRoutes = ['/dashboard', '/admin', '/settings', '/profile'];
const authOnlyRoutes = ['/login', '/signup', '/password-reset'];

const { auth } = NextAuth(authConfig);

export default auth(async (req: NextRequest & { auth: unknown }) => {
  const { nextUrl } = req;

  // -------------------------------------------------------------------------
  // 단계 1: Install gate (REQ-INSTALL-001, 020)
  // forceHttps 이후, Domain 해석 이전 위치 — 미설치 인스턴스는 Domain row 없을 수 있음.
  //
  // @MX:ANCHOR: [AUTO] 미설치 상태 리다이렉트 — 모든 non-install 경로의 진입 차단.
  // @MX:REASON: SPEC-INSTALL-001 REQ-INSTALL-001/020 — installedAt IS NULL 이면 /install 302.
  // @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-001, REQ-INSTALL-020
  // -------------------------------------------------------------------------
  const needsInstall = await shouldRedirectToInstall(nextUrl.pathname, {
    isInstalled: async () => {
      const site = await prisma.site.findFirst({
        where: { installedAt: { not: null } },
        select: { id: true },
      });
      return site !== null;
    },
  });
  if (needsInstall) {
    return NextResponse.redirect(new URL('/install', nextUrl), 302);
  }

  // -------------------------------------------------------------------------
  // 단계 2: Host → Domain 해석 (REQ-ADMIN-010)
  // @MX:NOTE: [AUTO] forceHttps 는 인증 검사보다 먼저 실행되어야 함 (REQ-ADMIN-014).
  // -------------------------------------------------------------------------
  const rawHost = req.headers.get('host') ?? '';
  const hostname = rawHost.split(':')[0]; // port 제거

  let domain: {
    id: number;
    siteId: number;
    forceHttps: boolean;
    defaultLanguage: string | null;
    site: { defaultLanguage: string };
  } | null = null;

  domain = await prisma.domain.findFirst({
    where: { hostname },
    select: {
      id: true,
      siteId: true,
      forceHttps: true,
      defaultLanguage: true,
      site: { select: { defaultLanguage: true } },
    },
  });

  // REQ-ADMIN-011: hostname 매칭 실패 시 isDefault=true 도메인 폴백
  if (!domain) {
    domain = await prisma.domain.findFirst({
      where: { isDefault: true },
      select: {
        id: true,
        siteId: true,
        forceHttps: true,
        defaultLanguage: true,
        site: { select: { defaultLanguage: true } },
      },
    });
  }

  // -------------------------------------------------------------------------
  // 단계 2: forceHttps 검사 (REQ-ADMIN-014)
  // -------------------------------------------------------------------------
  if (domain?.forceHttps && nextUrl.protocol === 'http:') {
    const httpsUrl = new URL(nextUrl.toString());
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl, 301);
  }

  // -------------------------------------------------------------------------
  // 단계 3: 기존 AUTH-001 인증 보호 (REQ-AUTH-F006, REQ-AUTH-F007)
  // -------------------------------------------------------------------------
  const isLoggedIn = !!(req as { auth: unknown }).auth;

  const isProtected = protectedRoutes.some((r) => nextUrl.pathname.startsWith(r));
  const isAuthRoute = authOnlyRoutes.some((r) => nextUrl.pathname.startsWith(r));

  if (!isLoggedIn && isProtected) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return Response.redirect(loginUrl, 307);
  }

  if (isLoggedIn && isAuthRoute) {
    return Response.redirect(new URL('/', nextUrl), 307);
  }

  // -------------------------------------------------------------------------
  // 단계 4: 도메인 헤더 주입 (REQ-ADMIN-010/011)
  // -------------------------------------------------------------------------
  const res = NextResponse.next();
  if (domain) {
    res.headers.set('x-site-id', String(domain.siteId));
    res.headers.set('x-domain-id', String(domain.id));
    const lang = domain.defaultLanguage ?? domain.site.defaultLanguage;
    res.headers.set('x-language', lang);
  }
  return res;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
