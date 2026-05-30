// SPEC-LAYOUT-001 Slice A — 데이터베이스에서 Layout 행을 로드하는 헬퍼
// REQ-LAYOUT-006: loadLayoutById, loadLayoutByName

import type { PrismaClient } from '@prisma/client';
import type { LayoutConfig } from './types';

/**
 * Prisma Layout 행을 LayoutConfig로 변환한다.
 * layoutType이 'DESKTOP'이 아닌 경우에도 그대로 반환한다.
 * (모바일 필터링은 resolver-with-db.ts에서 수행 — REQ-LAYOUT-013)
 */
function mapToLayoutConfig(row: {
  id: string;
  themeId: string;
  name: string;
  title: string;
  layoutPath: string;
  layoutType: string;
  siteSrl: number | null;
  extraVars: unknown;
}): LayoutConfig {
  return {
    id: row.id,
    themeId: row.themeId,
    name: row.name,
    title: row.title,
    layoutPath: row.layoutPath,
    // Phase 1에서 DESKTOP만 사용 (타입 캐스팅 — REQ-LAYOUT-004)
    layoutType: 'DESKTOP',
    siteSrl: row.siteSrl,
    extraVars: row.extraVars,
  };
}

/**
 * Layout ID(cuid)로 레이아웃을 조회한다.
 * row가 없으면 null 반환, throw 없음.
 *
 * REQ-LAYOUT-006
 */
// @MX:ANCHOR: [AUTO] loadLayoutById — Layout DB 조회 진입점 (ID 기반)
// @MX:REASON: resolver-with-db + 외부 호출자가 공유하는 API 경계
export async function loadLayoutById(
  id: string,
  prisma: PrismaClient,
): Promise<LayoutConfig | null> {
  const row = await prisma.layout.findUnique({
    where: { id },
  });

  if (!row) return null;
  return mapToLayoutConfig(row);
}

/**
 * themeId + 이름(name)으로 DESKTOP 레이아웃을 조회한다.
 * row가 없으면 null 반환, throw 없음.
 *
 * 주의: MOBILE 레이아웃은 Phase 1에서 제외 (layoutType: 'DESKTOP' 필터)
 */
// @MX:NOTE: [AUTO] loadLayoutByName — Phase 1에서 DESKTOP 레이아웃만 조회
// @MX:SPEC: SPEC-LAYOUT-001 REQ-LAYOUT-006
export async function loadLayoutByName(
  themeId: string,
  name: string,
  prisma: PrismaClient,
): Promise<LayoutConfig | null> {
  // DESKTOP만 반환 — MOBILE layoutType은 Phase 1에서 미지원 (REQ-LAYOUT-013)
  const row = await prisma.layout.findFirst({
    where: {
      themeId,
      name,
      layoutType: 'DESKTOP',
    },
  });

  if (!row) return null;
  return mapToLayoutConfig(row);
}
