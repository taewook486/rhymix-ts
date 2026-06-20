/**
 * [mid]/rss/route.ts — SPEC-FEED-001 Slice A (T-005)
 *
 * GET /{mid}/rss — 게시판별 RSS 2.0 피드. 게이트/조회/직렬화 로직은
 * resolveFeedXml() 에 위임하고 이 파일은 Content-Type 만 다르게 설정한다(REQ-FEED-006).
 *
 * @MX:SPEC: SPEC-FEED-001 REQ-FEED-001, REQ-FEED-002, REQ-FEED-004, REQ-FEED-005
 */
import { resolveFeedXml } from '@rhymix-ts/board/feed';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import { prisma } from '@/lib/db/prisma';

/** REQ-FEED-040: 라우트 세그먼트 캐시 — 5분(300초) 단위로 origin DB 보호. */
export const revalidate = 300;

interface RssRouteParams {
  params: Promise<{ mid: string }>;
}

/** 요청 헤더에서 절대 baseUrl(scheme+host) 을 도출한다 — 멀티사이트 x-site-id 와 일관된 패턴. */
function resolveBaseUrl(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

export async function GET(request: Request, { params }: RssRouteParams): Promise<Response> {
  const { mid } = await params;
  const siteIdStr = request.headers.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;

  if (!Number.isFinite(siteId) || siteId <= 0) {
    return new Response(null, { status: 404 });
  }

  const result = await resolveFeedXml({
    format: 'rss',
    siteId,
    mid,
    baseUrl: resolveBaseUrl(request),
    prisma,
    loadInstance: (sid, m, ctx) => getModuleInstanceByMid(sid, m, ctx),
    loadBoard: (moduleInstanceId, ctx) => ctx.prisma.board.findUnique({ where: { moduleInstanceId } }),
  });

  if (result.status === 404) {
    return new Response(null, { status: 404 });
  }

  return new Response(result.xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // REQ-FEED-041: CDN/리버스 프록시/피드 리더가 origin 부하 없이 캐시·재검증하도록 함.
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
