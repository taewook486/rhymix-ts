/**
 * [mid] 동적 라우팅 페이지 — SPEC-ADMIN-001 Slice B + SPEC-CONTENT-001 Slice B.
 *
 * x-site-id 헤더에서 siteId 를 읽고, URL 파라미터 mid 로 모듈 인스턴스를 조회한다.
 * 인스턴스가 없으면 notFound() 를 호출한다.
 * 모듈 레지스트리에서 def.routes.index 를 찾아 위임한다 (SPEC-CONTENT-001 Slice B T-005).
 *
 * @MX:ANCHOR [AUTO]: 모든 모듈 인스턴스 페이지의 진입점.
 * @MX:REASON: 모든 모듈 인덱스 라우트가 이 파일을 통해 위임됨. fan_in = 등록된 모듈 수.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-012, SPEC-CONTENT-001 REQ-CONTENT-001
 */
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import { renderModuleWithLayout } from '@rhymix-ts/core';
import { runPageView } from '@rhymix-ts/core/addons';
import { prisma } from '@/lib/db/prisma';
import { getModuleDefinition } from '@/lib/modules/registry';
import { boardFeedConfigSchema, resolveFeedAlternates } from '@rhymix-ts/board/feed';
// 레이아웃 레지스트리 초기화 (정적 import — REQ-LAYOUT-009)
import '@/lib/layout-init';

interface MidPageProps {
  params: Promise<{ mid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * REQ-FEED-007: 게시판 피드 자동 검출을 위한 메타데이터 생성.
 * 피드가 활성화된 경우 `<link rel="alternate" type="application/rss+xml">` 태그를 추가한다.
 *
 * @MX:SPEC: SPEC-FEED-001 REQ-FEED-007
 */
export async function generateMetadata({ params }: MidPageProps): Promise<Metadata> {
  const { mid } = await params;
  const h = await headers();
  const siteIdStr = h.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;

  // siteId가 유효하지 않은 경우 빈 메타데이터 반환 (metadata generator는 notFound를 호출하지 않음)
  if (!Number.isFinite(siteId) || siteId <= 0) {
    return {};
  }

  const instance = await getModuleInstanceByMid(siteId, mid, { prisma });
  if (!instance || instance.moduleCode !== 'board') {
    return {};
  }

  const board = await prisma.board.findUnique({
    where: { moduleInstanceId: instance.id },
  });
  if (!board) {
    return {};
  }

  // SPEC-SEO-001 REQ-SEO-001: 게시판 목록 title/description
  // (title.template이 layout.tsx에서 "%s | Rhymix-TS"를 자동으로 붙인다)
  const seoMetadata: Metadata = {
    title: board.name,
    description: board.description || undefined,
  };

  const feedConfig = boardFeedConfigSchema.parse(board.feedConfig ?? {});
  const alternates = resolveFeedAlternates(feedConfig, mid);

  if (!alternates) {
    return seoMetadata;
  }

  return {
    ...seoMetadata,
    alternates: {
      types: alternates,
    },
  };
}

export default async function MidPage({ params, searchParams }: MidPageProps) {
  const { mid } = await params;
  const resolvedSearchParams = await searchParams;
  const h = await headers();
  const siteIdStr = h.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;

  if (!Number.isFinite(siteId) || siteId <= 0) {
    notFound();
  }

  const instance = await getModuleInstanceByMid(siteId, mid, { prisma });
  if (!instance) {
    notFound();
  }

  const def = getModuleDefinition(instance.moduleCode);
  if (!def?.routes?.index) {
    notFound();
  }

  const moduleOutput = await def.routes.index({
    instance,
    params: { mid },
    searchParams: resolvedSearchParams,
    prisma,
  });

  // REQ-LAYOUT-040: 모듈 출력을 레이아웃으로 감싸 반환
  const rendered = renderModuleWithLayout({
    instance,
    moduleOutput,
    prisma,
    request: h,
  });

  // SPEC-ADDON-001 REQ-ADDON-063: 페이지 뷰 후크 실행 (fire-and-forget)
  // AbortSignal을 전달하여 요청 취소 시 중단
  const controller = new AbortController();
  void runPageView(mid, {
    prisma,
    request: { mid },
    domain: null
  }, controller.signal);

  return rendered;
}
