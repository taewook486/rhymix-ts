import { NextResponse, type NextRequest } from 'next/server';

/**
 * SPEC-INSTALL-001 / SPEC-ADMIN-001 middleware skeleton.
 *
 * Responsibilities (full implementation deferred to /moai run):
 *  - REQ-INSTALL-001: redirect to /install when not yet installed
 *  - REQ-INSTALL-023: return 410 Gone on /install once INSTALL_LOCK=1
 *  - REQ-INSTALL-024: SiteLock 503 page when IP not in allowlist
 *  - REQ-ADMIN-*:    domain → site resolution, attach `x-site-id` header
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isInstallLocked = process.env.INSTALL_LOCK === '1';

  if (isInstallLocked && pathname.startsWith('/install')) {
    return new NextResponse('Gone', { status: 410 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
