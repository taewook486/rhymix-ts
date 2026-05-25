/**
 * NextAuth 미들웨어 — SPEC-AUTH-001 Slice F + SPEC-ADMIN-001 Slice B + SPEC-INSTALL-001 Slice A/D.
 *
 * 처리 순서:
 *   1. INSTALL_LOCK 410 (REQ-INSTALL-023) — 잠긴 설치 경로 차단.
 *   2. Install gate (REQ-INSTALL-001, 020) — 미설치 시 /install 302 리다이렉트.
 *   3. Host → Domain 해석 + 헤더 주입 (REQ-ADMIN-010, REQ-ADMIN-011).
 *   4. forceHttps 검사 (REQ-ADMIN-014).
 *   5. SiteLock 503 (REQ-INSTALL-024) — IP 차단.
 *   6. 기존 AUTH-001 Slice F 인증 보호 (REQ-AUTH-F006, REQ-AUTH-F007).
 *   7. 도메인 헤더 주입 + HSTS 헤더 (REQ-INSTALL-040).
 *
 * @MX:ANCHOR: [AUTO] 모든 페이지 요청이 통과하는 미들웨어 — 인증·라우팅 컨텍스트의 단일 진입점.
 * @MX:REASON: REQ-ADMIN-010/011 에서 주입한 헤더를 라우트/Server Component/tRPC 모두가 신뢰.
 *             헤더 스푸핑은 Node Runtime + Same-origin 가정 위에서 방지됨.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-F006, SPEC-ADMIN-001 REQ-ADMIN-010~014, SPEC-INSTALL-001 REQ-INSTALL-001/020/023/024/040
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';

import { authConfig } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { shouldRedirectToInstall } from '@/lib/install/middleware-gate';
import { getSiteLockStatus } from '@/lib/install/sitelock';
import { extractClientIp } from '@/lib/install/extract-ip';
import { HSTS_HEADER_VALUE } from '@/lib/install/headers';

export const runtime = 'nodejs';

const protectedRoutes = ['/dashboard', '/admin', '/settings', '/profile'];
const authOnlyRoutes = ['/login', '/signup', '/password-reset'];

/** /install 또는 /api/install/ 로 시작하는 경로 판별 */
function isInstallPath(pathname: string): boolean {
  return pathname.startsWith('/install') || pathname.startsWith('/api/install/');
}

// next-auth v5 beta31 + TS 5.9: default import resolves as namespace; cast needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { auth } = (NextAuth as any)(authConfig);

export default auth(async (req: NextRequest & { auth: unknown }) => {
  const { nextUrl } = req;

  // -------------------------------------------------------------------------
  // 단계 1: INSTALL_LOCK 410 (REQ-INSTALL-023)
  // INSTALL_LOCK=1 이고 /install/* 또는 /api/install/* 경로이면 410 Gone.
  // install gate(302)보다 먼저 실행하여 잠긴 설치 경로를 원천 차단.
  //
  // @MX:NOTE: [AUTO] 클라우드/운영 환경에서 설치 UI 접근을 HTTP 수준에서 차단.
  // @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-023
  // -------------------------------------------------------------------------
  if (process.env.INSTALL_LOCK === '1' && isInstallPath(nextUrl.pathname)) {
    return new Response('Gone', { status: 410 });
  }

  // -------------------------------------------------------------------------
  // 단계 2: Site 상태 조회 (install gate + HSTS 에서 공통 사용)
  // scheme 포함하여 단일 쿼리로 조회.
  // -------------------------------------------------------------------------
  let siteRow: { id: number; installedAt: Date | null; scheme: string | null } | null = null;
  try {
    siteRow = await prisma.site.findFirst({
      where: { installedAt: { not: null } },
      select: { id: true, installedAt: true, scheme: true },
    });
  } catch (_err) {
    // P2021/P2010: 테이블 미존재 — 미설치 상태로 처리.
  }

  // -------------------------------------------------------------------------
  // 단계 3: Install gate (REQ-INSTALL-001, 020)
  //
  // @MX:ANCHOR: [AUTO] 미설치 상태 리다이렉트 — 모든 non-install 경로의 진입 차단.
  // @MX:REASON: SPEC-INSTALL-001 REQ-INSTALL-001/020 — installedAt IS NULL 이면 /install 302.
  // @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-001, REQ-INSTALL-020
  // -------------------------------------------------------------------------
  const needsInstall = await shouldRedirectToInstall(nextUrl.pathname, {
    isInstalled: async () => siteRow !== null,
  });
  if (needsInstall) {
    return NextResponse.redirect(new URL('/install', nextUrl), 302);
  }

  // -------------------------------------------------------------------------
  // 단계 4: Host → Domain 해석 (REQ-ADMIN-010)
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
  // 단계 5: forceHttps 검사 (REQ-ADMIN-014)
  // -------------------------------------------------------------------------
  if (domain?.forceHttps && nextUrl.protocol === 'http:') {
    const httpsUrl = new URL(nextUrl.toString());
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl, 301);
  }

  // -------------------------------------------------------------------------
  // 단계 6: SiteLock 503 (REQ-INSTALL-024)
  // sitelock_enabled=true 이고 요청 IP 가 allowlist 에 없으면 503.
  // /admin/* 경로는 제외 (관리자 접근 허용).
  //
  // @MX:WARN: [AUTO] getSiteLockStatus 는 react cache() 메모이제이션 적용 — 동일 요청 내 1회 쿼리.
  // @MX:REASON: 요청당 중복 쿼리를 방지하여 DB 부하를 제어.
  // @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-024
  // -------------------------------------------------------------------------
  if (!nextUrl.pathname.startsWith('/admin')) {
    const siteLock = await getSiteLockStatus();
    if (siteLock.enabled) {
      const clientIp = extractClientIp(req.headers);
      if (!siteLock.allowlist.includes(clientIp)) {
        return new Response('Site Locked', { status: 503 });
      }
    }
  }

  // -------------------------------------------------------------------------
  // 단계 7: 기존 AUTH-001 인증 보호 (REQ-AUTH-F006, REQ-AUTH-F007)
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
  // 단계 8: 도메인 헤더 주입 (REQ-ADMIN-010/011) + HSTS (REQ-INSTALL-040)
  // -------------------------------------------------------------------------
  const res = NextResponse.next();
  if (domain) {
    res.headers.set('x-site-id', String(domain.siteId));
    res.headers.set('x-domain-id', String(domain.id));
    const lang = domain.defaultLanguage ?? domain.site.defaultLanguage;
    res.headers.set('x-language', lang);
  }

  // REQ-INSTALL-040: site.scheme === 'https' 이면 HSTS 헤더 추가.
  if (siteRow?.scheme === 'https') {
    res.headers.set('strict-transport-security', HSTS_HEADER_VALUE);
  }

  return res;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
