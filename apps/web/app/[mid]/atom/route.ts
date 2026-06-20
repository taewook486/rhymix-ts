/**
 * [mid]/atom/route.ts — SPEC-FEED-001 Slice A (T-006)
 *
 * GET /{mid}/atom — 게시판별 Atom 1.0 피드. rss/route.ts 와 동일하게 resolveFeedXml() 에
 * 위임하고 format/Content-Type 만 다르다(REQ-FEED-006).
 *
 * @MX:SPEC: SPEC-FEED-001 REQ-FEED-003
 */
import { resolveFeedXml } from '@rhymix-ts/board/feed';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import { prisma } from '@/lib/db/prisma';

/** REQ-FEED-040: 라우트 세그먼트 캐시 — rss/route.ts 와 동일 정책. */
export const revalidate = 300;

interface AtomRouteParams {
  params: Promise<{ mid: string }>;
}

/** 요청 헤더에서 절대 baseUrl(scheme+host) 을 도출한다 — rss/route.ts 와 동일 로직. */
function resolveBaseUrl(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

export async function GET(request: Request, { params }: AtomRouteParams): Promise<Response> {
  const { mid } = await params;
  const siteIdStr = request.headers.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;

  if (!Number.isFinite(siteId) || siteId <= 0) {
    return new Response(null, { status: 404 });
  }

  const result = await resolveFeedXml({
    format: 'atom',
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
      'Content-Type': 'application/atom+xml; charset=utf-8',
      // REQ-FEED-041: rss/route.ts 와 동일한 캐시 정책.
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
