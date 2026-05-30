// SPEC-LAYOUT-001 Slice A — DB 기반 레이아웃 해석기
// REQ-LAYOUT-011: resolveLayoutFromInstance 우선순위 체인

import type { PrismaClient } from '@prisma/client';
import type { ResolveResult } from './types';
import { loadLayoutById } from './loader';

/** resolveLayoutFromInstance의 컨텍스트 타입 */
interface ResolveContext {
  site: { id: number; title: string | null };
  domain: { id: number; hostname: string; defaultLayoutId: string | null };
}

/** 모듈 인스턴스 파라미터 (필요한 필드만 추출) */
interface ModuleInstanceLike {
  layoutId: string | null;
  mobileLayoutId?: string | null;
}

/**
 * 모듈 인스턴스를 기반으로 레이아웃을 해석한다.
 * 우선순위: module_instance → domain → site(ThemeAssignment) → fallback
 *
 * REQ-LAYOUT-011, REQ-LAYOUT-012, REQ-LAYOUT-013
 */
// @MX:ANCHOR: [AUTO] resolveLayoutFromInstance — DB 기반 레이아웃 해석 진입점
// @MX:REASON: apps/web 라우트 + 렌더 파이프라인에서 호출됨 (fan_in >= 3 예상)
export async function resolveLayoutFromInstance(
  instance: ModuleInstanceLike,
  prisma: PrismaClient,
  ctx: ResolveContext,
): Promise<ResolveResult> {
  // 1단계: 모듈 인스턴스 오버라이드 (instance.layoutId)
  if (instance.layoutId) {
    const config = await loadLayoutById(instance.layoutId, prisma);
    if (config) {
      // REQ-LAYOUT-013: MOBILE layoutType은 무시
      if (config.layoutType === 'DESKTOP') {
        return { type: 'component', config, source: 'module_instance' };
      }
    }
  }

  // 2단계: 도메인 기본 레이아웃 (domain.defaultLayoutId)
  if (ctx.domain.defaultLayoutId) {
    const config = await loadLayoutById(ctx.domain.defaultLayoutId, prisma);
    if (config && config.layoutType === 'DESKTOP') {
      return { type: 'component', config, source: 'domain' };
    }
  }

  // 3단계: 사이트 기본값 — ThemeAssignment(scope=SITE) 조회
  const siteAssignment = await prisma.themeAssignment.findFirst({
    where: {
      scope: 'SITE',
      refType: 'site',
      refId: String(ctx.site.id),
    },
  });

  if (siteAssignment?.layoutName) {
    // ThemeAssignment.layoutName으로 Layout 행 조회
    const siteLayout = await prisma.layout.findFirst({
      where: {
        name: siteAssignment.layoutName,
        themeId: siteAssignment.themeId,
        layoutType: 'DESKTOP',
      },
    });

    if (siteLayout) {
      return {
        type: 'component',
        config: {
          id: siteLayout.id,
          themeId: siteLayout.themeId,
          name: siteLayout.name,
          title: siteLayout.title,
          layoutPath: siteLayout.layoutPath,
          layoutType: 'DESKTOP',
          siteSrl: siteLayout.siteSrl,
          extraVars: siteLayout.extraVars,
        },
        source: 'site',
      };
    }
  }

  // 4단계: 폴백 — 어떤 레이아웃도 해석 불가
  // REQ-LAYOUT-012: 폴백 시 경고 로그 출력
  console.warn('[Layout] no layout resolved; rendering module output without wrapper');

  return { type: 'fallback' };
}
