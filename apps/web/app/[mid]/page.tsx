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
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import { renderModuleWithLayout } from '@rhymix-ts/core';
import { prisma } from '@/lib/db/prisma';
import { getModuleDefinition } from '@/lib/modules/registry';
// 레이아웃 레지스트리 초기화 (정적 import — REQ-LAYOUT-009)
import '@/lib/layout-init';

interface MidPageProps {
  params: Promise<{ mid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  return renderModuleWithLayout({
    instance,
    moduleOutput,
    prisma,
    request: h,
  });
}
