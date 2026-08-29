/**
 * 홈 페이지 — SPEC-LAYOUT-001 Slice C, SPEC-INSTALL-003 Groups 1-4.
 *
 * x-domain-id 헤더에서 domainId를 읽고, Domain.indexModuleInstanceId로
 * 모듈 인스턴스를 직접 dispatch한 뒤 renderModuleWithLayout으로 감싼다.
 *
 * - indexModuleInstanceId가 null이면 placeholder 페이지 렌더 (REQ-LAYOUT-041)
 * - x-domain-id 헤더 없음/비정상이면 기존 welcome 화면 유지 (REQ-LAYOUT-042)
 * - 인증된 운영자이고 온보딩이 해제되지 않은 경우, 온보딩 표면을 prepend (REQ-INSTALL3-001)
 *
 * @MX:SPEC: SPEC-LAYOUT-001 REQ-LAYOUT-041, REQ-LAYOUT-042
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-013
 * @MX:SPEC: SPEC-INSTALL-003 REQ-INSTALL3-001~006
 */
import React from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { renderModuleWithLayout } from '@rhymix-ts/core';
import { runPageView } from '@rhymix-ts/core/addons';
import { prisma } from '@/lib/db/prisma';
import { getModuleDefinition } from '@/lib/modules/registry';
import { auth } from '@/lib/auth/config';
import { OperatorOnboarding } from '@/components/onboarding/OperatorOnboarding';
import { renderBodyWithWidgets } from '@/lib/widgets/render';
// 레이아웃 레지스트리 초기화 (정적 import — REQ-LAYOUT-009)
import '@/lib/layout-init';
// 위젯 레지스트리 초기화 — [app-rsc] 컨텍스트 (instrumentation과 별도 싱글톤)
import '@/lib/widget-init';

export default async function RootPage() {
  const h = await headers();
  const domainIdStr = h.get('x-domain-id');
  const domainId = domainIdStr != null ? Number(domainIdStr) : NaN;

  // REQ-LAYOUT-042: x-domain-id 헤더 없거나 비정상이면 welcome 화면 유지
  if (!Number.isFinite(domainId) || domainId <= 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Rhymix-TS</h1>
        <p className="mt-4 text-lg">
          TypeScript + Next.js 16 redesign of Rhymix CMS.
        </p>
        <p className="mt-2 text-sm">
          Status: <strong>scaffolded — install pending</strong>.
        </p>
      </div>
    );
  }

  // Domain + indexModuleInstance 조회
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: {
      siteId: true,
      defaultLayoutId: true,
      indexModuleInstance: {
        include: { config: true },
      },
    },
  });

  // REQ-LAYOUT-041: indexModuleInstanceId가 null이면 placeholder 렌더
  if (!domain?.indexModuleInstance) {
    return (
      <div>No index module configured for this domain.</div>
    );
  }

  const instance = domain.indexModuleInstance;
  const def = getModuleDefinition(instance.moduleCode);

  // 모듈 정의 없으면 notFound
  if (!def?.routes?.index) {
    notFound();
  }

  // 인증 상태 확인 (모듈 렌더 전에 세션을 가져와 위젯 컨텍스트에 주입)
  const session = await auth();
  const userId = session?.user?.id
    ? (typeof session.user.id === 'string' ? Number.parseInt(session.user.id, 10) : session.user.id)
    : null;
  const sessionUser = userId != null
    ? { id: userId, nickname: session?.user?.name ?? '' }
    : null;

  // 모듈 인덱스 라우트 호출.
  // page 모듈은 mcontent를 renderBodyWithWidgets로 렌더하여 rx-widget 토큰을 치환한다.
  let moduleOutput: React.ReactNode;
  if (instance.moduleCode === 'page') {
    moduleOutput = await renderBodyWithWidgets(instance.mcontent ?? '', {
      isAdmin: Boolean(session?.user?.isAdmin),
      user: sessionUser,
      prisma,
      domainId,
    });
  } else {
    moduleOutput = await def.routes.index({
      instance,
      params: {},
      searchParams: {},
      prisma,
    });
  }

  // REQ-LAYOUT-041: renderModuleWithLayout으로 레이아웃 감싸기
  const rendered = renderModuleWithLayout({
    instance,
    moduleOutput,
    prisma,
    request: h,
  });

  // SPEC-ADDON-001 REQ-ADDON-063: 인덱스 모듈 페이지 뷰 후크 실행 (fire-and-forget)
  const controller = new AbortController();
  void runPageView(instance.mid, {
    prisma,
    request: { mid: instance.mid },
    domain: null
  }, controller.signal);

  // 인증된 사용자이고 siteId가 있는 경우에만 온보딩 렌더
  const onboarding = userId != null && domain.siteId != null
    ? <OperatorOnboarding siteId={domain.siteId} />
    : null;

  return (
    <>
      {onboarding}
      {rendered}
    </>
  );
}
