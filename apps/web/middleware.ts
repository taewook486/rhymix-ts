import { NextResponse, type NextRequest } from 'next/server';

import { getInstallStatus } from '@/lib/install/site-status';

/**
 * SPEC-INSTALL-001 미들웨어.
 *
 * 책임:
 *  - REQ-INSTALL-001: 미설치 인스턴스에서 /install로 리다이렉트
 *  - REQ-INSTALL-020: 같은 조건의 상태 게이트
 *  - REQ-INSTALL-023: INSTALL_LOCK=1일 때 /install 및 /api/install/* 410 Gone
 *  - 진단용 rewrite-test 라우트는 잠금 상태에서도 통과 (REQ-INSTALL-012)
 *
 * Prisma 호출이 들어가므로 Edge가 아닌 Node 런타임 강제.
 *
 * @MX:WARN: 미들웨어는 모든 요청 경로에서 실행되므로 추가 로직 도입 시 지연 영향 검토 필요.
 * @MX:REASON: 단일 진입점이므로 잘못 변경하면 전체 사이트가 잠길 수 있음.
 */
export const runtime = 'nodejs';

const REWRITE_TEST_PREFIX = '/api/install/rewrite-test/';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // (1) 진단 echo 라우트는 항상 통과.
  if (pathname.startsWith(REWRITE_TEST_PREFIX)) {
    return NextResponse.next();
  }

  const isInstallLocked = process.env.INSTALL_LOCK === '1';

  // (2) INSTALL_LOCK=1일 때 /install 및 /api/install/* 차단.
  // 단, /install/complete는 1회성 환영 페이지 표시를 위해 예외(REQ-INSTALL-014 사후 UX).
  // 페이지 자체가 세션 마커(`step==='finish'`)가 없으면 fallback 안내로 분기하므로,
  // 미들웨어 단계에서 추가 검증은 불필요합니다.
  if (
    isInstallLocked &&
    !pathname.startsWith('/install/complete') &&
    (pathname.startsWith('/install') || pathname.startsWith('/api/install'))
  ) {
    return new NextResponse('Gone', { status: 410 });
  }

  // (3) 미설치 인스턴스 → /install로 리다이렉트 (install/api/install 경로는 허용).
  const status = await getInstallStatus();
  if (
    !status.installed &&
    !pathname.startsWith('/install') &&
    !pathname.startsWith('/api/install')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/install';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
