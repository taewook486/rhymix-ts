/**
 * tRPC context 생성 — SPEC-ADMIN-001 Slice B.
 *
 * siteId 출처: req.headers.host → prisma.domain.findFirst 재해석.
 * x-site-id 헤더를 신뢰하지 않아 헤더 스푸핑을 차단한다.
 *
 * @MX:WARN: [AUTO] hostname 재해석으로 x-site-id 헤더 스푸핑을 차단.
 * @MX:REASON: dev 환경에서 외부 클라이언트가 직접 x-site-id 헤더를 박아 보내면
 *             잘못된 사이트 컨텍스트로 데이터에 접근할 수 있음.
 *             본 createContext 는 항상 hostname 으로 domain 을 재해석하여 이를 방지.
 */
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import type { AdminSession } from '@/lib/auth/admin-middleware';

export interface Context {
  session: AdminSession | null;
  prisma: typeof prisma;
  ip?: string;
  userAgent?: string;
  siteId?: number;
}

export async function createContext(opts: { req: Request }): Promise<Context> {
  const { req } = opts;

  // NextAuth 세션 조회
  // auth() 는 Next.js 의 cookies()/headers() 를 내부에서 사용하는 Server-side 함수
  // Route Handler 컨텍스트에서 호출 가능하다.
  let session: AdminSession | null = null;
  try {
    const rawSession = await (auth as unknown as () => Promise<unknown>)();
    session = rawSession as AdminSession | null;
  } catch {
    // 세션 조회 실패 시 null 처리 (unauthenticated)
    session = null;
  }

  // hostname 으로 domain 재해석
  const host = req.headers.get('host') ?? '';
  const hostname = host.split(':')[0];

  let siteId: number | undefined;
  try {
    const domain = await prisma.domain.findFirst({
      where: { hostname },
      select: { siteId: true },
    });
    if (domain) {
      siteId = domain.siteId;
    }
  } catch {
    // DB 오류 시 siteId 미설정
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined;

  const userAgent = req.headers.get('user-agent') ?? undefined;

  return { session, prisma, ip, userAgent, siteId };
}
