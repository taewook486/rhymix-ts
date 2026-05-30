// SPEC-LAYOUT-001 Slice B — 레이아웃 렌더 파이프라인
// 모듈 출력을 레이아웃으로 감싼다

import type { ReactNode, ComponentType } from 'react';
import { createElement } from 'react';
import type { PrismaClient } from '@prisma/client';
import { resolveLayoutFromInstance } from './resolver-with-db';
import { getLayout } from './registry';
import { parseLayoutExtraVars } from './extra-vars';
import { LayoutProvider } from './context';
import type { LayoutContextValue, ParsedExtraVars } from './types';

/**
 * 모듈 인스턴스 (필요한 필드만)
 */
interface ModuleInstance {
  layoutId: string | null;
  mobileLayoutId?: string | null;
}

/**
 * request headers의 최소 인터페이스 (Next.js ReadonlyHeaders 호환)
 */
interface RequestHeaders {
  get(name: string): string | null;
}

/**
 * renderModuleWithLayout 옵션
 */
interface RenderModuleWithLayoutOptions {
  instance: ModuleInstance;
  moduleOutput: ReactNode;
  prisma: PrismaClient;
  request: RequestHeaders;
}

/** Prisma site 행의 최소 타입 */
interface SiteRow {
  id: number;
  title: string | null;
}

/** Prisma domain 행의 최소 타입 */
interface DomainRow {
  id: number;
  hostname: string;
  defaultLayoutId: string | null;
}

/** PrismaClient에 site/domain이 있는 경우의 최소 인터페이스 */
interface PrismaWithSiteDomain {
  site?: { findFirst(opts: unknown): Promise<SiteRow | null> };
  domain?: { findFirst(opts: unknown): Promise<DomainRow | null> };
}

/**
 * 모듈 출력을 레이아웃 컴포넌트로 감싸 반환한다.
 *
 * 처리 순서:
 * 1. request headers에서 x-domain-id를 추출하여 site/domain 조회
 * 2. resolveLayoutFromInstance로 레이아웃 결정
 * 3. fallback → moduleOutput 그대로 반환 + console.warn
 * 4. 레지스트리에 없는 레이아웃 → moduleOutput 그대로 반환 + console.error
 * 5. extraVars 파싱 → LayoutContextValue 구성
 * 6. LayoutProvider + LayoutComponent로 감싼 ReactNode 반환
 *
 * REQ-LAYOUT-011, REQ-LAYOUT-012
 */
// @MX:ANCHOR: [AUTO] renderModuleWithLayout — 레이아웃 렌더 파이프라인 진입점
// @MX:REASON: apps/web 라우트 핸들러, page 컴포넌트에서 호출됨 (fan_in >= 3 예상)
export async function renderModuleWithLayout({
  instance,
  moduleOutput,
  prisma,
  request,
}: RenderModuleWithLayoutOptions): Promise<ReactNode> {
  // 1단계: site/domain 컨텍스트 조회
  const p = prisma as unknown as PrismaWithSiteDomain;
  const domainIdHeader = request.get('x-domain-id');
  const domainId = domainIdHeader ? parseInt(domainIdHeader, 10) : null;

  const [siteRow, domainRow] = await Promise.all([
    p.site?.findFirst(domainId ? { where: { domains: { some: { id: domainId } } } } : {}) ??
      Promise.resolve(null),
    domainId
      ? (p.domain?.findFirst({ where: { id: domainId } }) ?? Promise.resolve(null))
      : Promise.resolve(null),
  ]);

  // 헤더에서 얻지 못한 경우 폴백 컨텍스트
  const siteCtx: SiteRow = siteRow ?? { id: 1, title: null };
  const domainCtx: DomainRow = domainRow ?? { id: 1, hostname: 'localhost', defaultLayoutId: null };

  const resolveCtx = {
    site: { id: siteCtx.id, title: siteCtx.title },
    domain: {
      id: domainCtx.id,
      hostname: domainCtx.hostname,
      defaultLayoutId: domainCtx.defaultLayoutId,
    },
  };

  // 2단계: 레이아웃 결정
  const resolved = await resolveLayoutFromInstance(instance, prisma, resolveCtx);

  // 3단계: fallback 처리
  if (resolved.type === 'fallback') {
    console.warn('[Layout] no layout resolved; rendering module output without wrapper');
    return moduleOutput;
  }

  // 4단계: 레지스트리에서 컴포넌트 조회
  const LayoutComponent = getLayout(resolved.config.name);
  if (!LayoutComponent) {
    console.error('[Layout] registry missing entry for: ' + resolved.config.name);
    return moduleOutput;
  }

  // 5단계: extraVars 파싱
  const parsed = parseLayoutExtraVars(resolved.config.extraVars);

  // 6단계: LayoutContextValue 구성
  const layoutCtx: LayoutContextValue = {
    site: { id: siteCtx.id, title: siteCtx.title },
    domain: { id: domainCtx.id, hostname: domainCtx.hostname },
    user: null, // Phase 1: 인증 통합은 SPEC-AUTH-001 담당
    menu: [], // Phase 1: 메뉴는 SPEC-WIDGET-001 담당
    extraVars: parsed,
  };

  // 7단계: LayoutProvider + LayoutComponent로 감싸기
  // createElement 세 번째 인자가 children으로 전달되므로 props 타입의 children 필수 제약을 완화
  const wrappedModule = createElement(
    LayoutComponent as ComponentType<{ extraVars: ParsedExtraVars; children?: ReactNode }>,
    { extraVars: parsed },
    moduleOutput,
  );
  return createElement(
    LayoutProvider as ComponentType<{ value: LayoutContextValue; children?: ReactNode }>,
    { value: layoutCtx },
    wrappedModule,
  );
}
