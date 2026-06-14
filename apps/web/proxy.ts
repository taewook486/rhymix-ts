/**
 * Next.js 16 proxy (구 middleware) — SPEC-AUTH-001 Slice F + SPEC-ADMIN-001 Slice B + SPEC-INSTALL-001 Slice A/D.
 *
 * 처리 순서:
 *  1. /api/install/rewrite-test/* → next() (진단 echo, REQ-INSTALL-012)
 *  2. INSTALL_LOCK 410 (REQ-INSTALL-023) — 잠긴 설치 경로 차단.
 *  3. SiteLock 503 (REQ-INSTALL-024) — IP allowlist 검사 (/admin, /api/auth 우회).
 *  4. Install redirect 302 (REQ-INSTALL-001, 020) — 미설치 시 /install 리다이렉트.
 *  5. Host → Domain 해석 + 헤더 주입 (REQ-ADMIN-010, REQ-ADMIN-011).
 *  6. forceHttps 301 리다이렉트 (REQ-ADMIN-014).
 *  7. NextAuth 인증 보호 (REQ-AUTH-F006, REQ-AUTH-F007).
 *  8. 도메인 헤더 주입 + HSTS (REQ-INSTALL-040).
 *
 * Note: Next.js 16의 proxy.ts는 항상 Node.js 런타임이라 `export const runtime`
 * 명시는 금지됩니다.
 *
 * @MX:ANCHOR: [AUTO] 모든 페이지 요청이 통과하는 proxy — 인증·라우팅 컨텍스트의 단일 진입점.
 * @MX:REASON: REQ-ADMIN-010/011 에서 주입한 헤더를 라우트/Server Component/tRPC 모두가 신뢰.
 *             헤더 스푸핑은 Node Runtime + Same-origin 가정 위에서 방지됨.
 * @MX:WARN: [AUTO] proxy는 모든 요청 경로에서 실행되므로 추가 로직 도입 시 지연 영향 검토 필요.
 * @MX:REASON: 단일 진입점이므로 잘못 변경하면 전체 사이트가 잠길 수 있음.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-F006/F007, SPEC-ADMIN-001 REQ-ADMIN-010~014, SPEC-INSTALL-001 REQ-INSTALL-001/012/020/023/024/040
 */
import { NextResponse, type NextRequest } from 'next/server';
import NextAuth from 'next-auth';

import { authConfig } from './lib/auth/config';
import { prisma } from './lib/db/prisma';
import { extractClientIp } from './lib/install/extract-ip';
import { HSTS_HEADER_VALUE } from './lib/install/headers';
import { getInstallStatus } from './lib/install/site-status';
import { getSiteLockStatus } from './lib/install/sitelock';

// next-auth v5 beta31 + TS 5.9: default import resolves as namespace; cast needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { auth } = (NextAuth as any)(authConfig);

const REWRITE_TEST_PREFIX = '/api/install/rewrite-test/';

// SiteLock 우회 경로 — 인증 페이지/admin은 자체 인증 게이트가 별도로 동작.
const SITELOCK_BYPASS_PREFIXES = ['/admin', '/api/auth'] as const;

const protectedRoutes = ['/dashboard', '/admin', '/settings', '/profile'];
const authOnlyRoutes = ['/login', '/signup', '/password-reset'];

/**
 * @MX:ANCHOR: [AUTO] proxy — 설치 게이트·도메인 해석·인증 보호를 순서대로 처리하는 단일 함수.
 * @MX:REASON: install-lock→sitelock→install-redirect→domain→auth 순서는 SPEC 요구사항 의존성 그래프에 의해 고정됨.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // ---------------------------------------------------------------------------
  // (1) 진단 echo 라우트 + 헬스체크는 항상 통과 (REQ-INSTALL-012).
  // ---------------------------------------------------------------------------
  if (pathname.startsWith(REWRITE_TEST_PREFIX) || pathname === '/api/health') {
    return NextResponse.next();
  }

  // ---------------------------------------------------------------------------
  // (2) 설치 상태 조회 — env 잠금과 DB 잠금을 OR로 결합.
  //
  // @MX:NOTE: [AUTO] INSTALL_LOCK=1 은 운영/클라우드 배포 시 설치 UI를 HTTP 수준에서 차단.
  // @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-023
  // ---------------------------------------------------------------------------
  const status = await getInstallStatus();
  const isInstallLocked = process.env.INSTALL_LOCK === '1' || status.installed;

  // (2a) 잠금 상태에서 /install 및 /api/install/* 차단 (단, /install/complete는 1회성 허용).
  if (
    isInstallLocked &&
    !pathname.startsWith('/install/complete') &&
    (pathname.startsWith('/install') || pathname.startsWith('/api/install'))
  ) {
    return new NextResponse('Gone', { status: 410 });
  }

  // ---------------------------------------------------------------------------
  // (3) SiteLock 체크 (REQ-INSTALL-024) — /admin, /api/auth는 자체 인증 흐름 우회.
  //
  // @MX:WARN: [AUTO] getSiteLockStatus 는 react cache() 메모이제이션 적용 — 동일 요청 내 1회 쿼리.
  // @MX:REASON: 요청당 중복 쿼리를 방지하여 DB 부하를 제어.
  // @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-024
  // ---------------------------------------------------------------------------
  const isSiteLockBypass = SITELOCK_BYPASS_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  if (!isSiteLockBypass) {
    const siteLock = await getSiteLockStatus();
    if (siteLock.enabled) {
      const clientIp = extractClientIp(request.headers);
      if (!siteLock.allowlist.includes(clientIp)) {
        return renderSiteLockResponse(clientIp);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // (4) 미설치 인스턴스 → /install 302 리다이렉트 (REQ-INSTALL-001, 020).
  //
  // @MX:ANCHOR: [AUTO] 미설치 상태 리다이렉트 — 모든 non-install 경로의 진입 차단.
  // @MX:REASON: SPEC-INSTALL-001 REQ-INSTALL-001/020 — installedAt IS NULL 이면 /install 302.
  // @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-001, REQ-INSTALL-020
  // ---------------------------------------------------------------------------
  if (
    !status.installed &&
    !pathname.startsWith('/install') &&
    !pathname.startsWith('/api/install') &&
    !pathname.startsWith('/api/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/install';
    return NextResponse.redirect(url);
  }

  // ---------------------------------------------------------------------------
  // (5) Host → Domain 해석 (REQ-ADMIN-010, REQ-ADMIN-011).
  // @MX:NOTE: [AUTO] forceHttps는 인증 검사보다 먼저 실행되어야 함 (REQ-ADMIN-014).
  // ---------------------------------------------------------------------------
  const rawHost = request.headers.get('host') ?? '';
  const hostname = rawHost.split(':')[0]; // port 제거

  let domain: {
    id: number;
    siteId: number;
    forceHttps: boolean;
    defaultLanguage: string | null;
    site: { defaultLanguage: string };
  } | null = null;

  try {
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

    // REQ-ADMIN-011: hostname 매칭 실패 시 isDefault=true 도메인 폴백.
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
  } catch (_err) {
    // 도메인 테이블 미존재 — 도메인 헤더 없이 진행.
  }

  // ---------------------------------------------------------------------------
  // (6) forceHttps 301 리다이렉트 (REQ-ADMIN-014).
  // ---------------------------------------------------------------------------
  if (domain?.forceHttps && request.nextUrl.protocol === 'http:') {
    const httpsUrl = new URL(request.nextUrl.toString());
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl, 301);
  }

  // ---------------------------------------------------------------------------
  // (7) NextAuth 인증 보호 (REQ-AUTH-F006, REQ-AUTH-F007).
  // auth()를 호출하여 현재 세션을 조회.
  // ---------------------------------------------------------------------------
  let isLoggedIn = false;
  try {
    const session = await auth();
    isLoggedIn = !!session?.user;
  } catch (_err) {
    // auth 초기화 전 또는 세션 조회 실패 — 비로그인으로 처리.
  }

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authOnlyRoutes.some((r) => pathname.startsWith(r));

  if (!isLoggedIn && isProtected) {
    const loginUrl = new URL('/login', request.nextUrl);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl, 307);
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.nextUrl), 307);
  }

  // ---------------------------------------------------------------------------
  // (8) 도메인 헤더 주입 (REQ-ADMIN-010/011) + HSTS (REQ-INSTALL-040).
  //     x-pathname은 Server Component(AdminLayout)에서 현재 경로를 읽을 수 있도록
  //     request 헤더로 전달한다 (response 헤더는 Server Component에서 읽기 불가).
  // ---------------------------------------------------------------------------
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (domain) {
    response.headers.set('x-site-id', String(domain.siteId));
    response.headers.set('x-domain-id', String(domain.id));
    const lang = domain.defaultLanguage ?? domain.site.defaultLanguage;
    response.headers.set('x-language', lang);
  }

  // REQ-INSTALL-040: site.scheme === 'https' 이면 HSTS 헤더 추가.
  if (status.installed && status.site?.scheme === 'https') {
    response.headers.set('strict-transport-security', HSTS_HEADER_VALUE);
  }

  return response;
}

/**
 * SiteLock 503 응답 — Next.js 페이지가 아닌 인라인 HTML.
 *
 * 페이지 라우트로 만들면 SiteLock이 자기 자신을 차단할 수 있어 인라인이 안전.
 */
function renderSiteLockResponse(clientIp: string): NextResponse {
  const escapedIp = escapeHtml(clientIp);
  const body = `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>사이트 잠금</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; max-width: 40rem; margin: 0 auto; color: #1f2937; }
      h1 { font-size: 1.5rem; margin-bottom: 1rem; }
      p { line-height: 1.6; margin-bottom: 0.75rem; }
      code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
    </style>
  </head>
  <body>
    <h1>사이트 잠금 (SiteLock)</h1>
    <p>관리자가 사이트 접근을 제한해 두었습니다. 허용된 IP에서만 접속할 수 있습니다.</p>
    <p>현재 IP: <code>${escapedIp}</code></p>
  </body>
</html>`;

  return new NextResponse(body, {
    status: 503,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

/** 최소 HTML escape — IP 문자열은 통제된 입력이지만 방어적으로 처리. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
