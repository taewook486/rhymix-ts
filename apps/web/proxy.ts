import { NextResponse, type NextRequest } from 'next/server';

import { extractClientIp } from './lib/install/extract-ip';
import { HSTS_HEADER_VALUE } from './lib/install/headers';
import { getInstallStatus } from './lib/install/site-status';
import { getSiteLockStatus } from './lib/install/sitelock';

/**
 * SPEC-INSTALL-001 proxy (구 middleware) — Next.js 16 신규 컨벤션.
 *
 * 책임:
 *  - REQ-INSTALL-001: 미설치 인스턴스에서 /install로 리다이렉트
 *  - REQ-INSTALL-020: 같은 조건의 상태 게이트
 *  - REQ-INSTALL-023: INSTALL_LOCK=1일 때 /install 및 /api/install/* 410 Gone
 *  - REQ-INSTALL-024: SiteLock 활성화 시 allowlist 외 IP 503 차단
 *  - REQ-INSTALL-040: 설치된 site.scheme === 'https' 일 때 HSTS 헤더 부여
 *  - 진단용 rewrite-test 라우트는 잠금 상태에서도 통과 (REQ-INSTALL-012)
 *
 * Prisma 호출이 들어가므로 Edge가 아닌 Node 런타임 강제.
 *
 * 처리 순서 (Slice E-core 기준):
 *  1. /api/install/rewrite-test/* → next() (진단 echo)
 *  2. install-lock 체크 → 410 (locked + not /install/complete + /install·/api/install)
 *  3. SiteLock 체크 → 503 (enabled + IP not in allowlist + not bypass path)
 *  4. installed-redirect → /install (not installed + outside install scope)
 *  5. else next() (필요 시 HSTS 헤더 부여)
 *
 * @MX:WARN: proxy는 모든 요청 경로에서 실행되므로 추가 로직 도입 시 지연 영향 검토 필요.
 * @MX:REASON: 단일 진입점이므로 잘못 변경하면 전체 사이트가 잠길 수 있음.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-001/020/023/024/040
 *
 * Note: Next.js 16의 proxy.ts는 항상 Node.js 런타임이라 `export const runtime`
 * 명시는 금지됩니다 (middleware.ts에서 옮길 때 제거).
 */

const REWRITE_TEST_PREFIX = '/api/install/rewrite-test/';

// SiteLock 우회 경로 — 인증 페이지/admin은 자체 인증 게이트가 별도로 동작.
const SITELOCK_BYPASS_PREFIXES = ['/admin', '/api/auth'] as const;

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // (1) 진단 echo 라우트는 항상 통과.
  if (pathname.startsWith(REWRITE_TEST_PREFIX)) {
    return NextResponse.next();
  }

  // (2) 설치 상태 조회 — env 잠금과 DB 잠금을 OR로 결합.
  const status = await getInstallStatus();
  const isInstallLocked = process.env.INSTALL_LOCK === '1' || status.installed;

  // (3) 잠금 상태에서 /install 및 /api/install/* 차단 (단, /install/complete는 1회성 환영 허용).
  if (
    isInstallLocked &&
    !pathname.startsWith('/install/complete') &&
    (pathname.startsWith('/install') || pathname.startsWith('/api/install'))
  ) {
    return new NextResponse('Gone', { status: 410 });
  }

  // (4) SiteLock 체크 (REQ-INSTALL-024) — install-lock 통과 이후, 정상 응답 직전.
  // /admin/* 와 /api/auth/* 는 자체 인증 흐름이 있으므로 bypass.
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

  // (5) 미설치 인스턴스 → /install로 리다이렉트 (install/api/install 경로는 허용).
  if (
    !status.installed &&
    !pathname.startsWith('/install') &&
    !pathname.startsWith('/api/install')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/install';
    return NextResponse.redirect(url);
  }

  // (6) 정상 통과 — 설치 완료 + scheme=https 인 경우 HSTS 부여.
  const response = NextResponse.next();
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
