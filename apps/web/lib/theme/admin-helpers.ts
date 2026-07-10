/**
 * admin-helpers.ts
 *
 * Admin UI에서 사용하는 theme/layout/skin 조회 헬퍼 함수들.
 * Server-side 전용이며, Prisma를 직접 호출한다.
 *
 * SPEC-THEME-POLISH-001 Slice A — admin design page 데이터 소스.
 */
import 'server-only';
import { prisma, Prisma } from '@rhymix-ts/db';
import { DEFAULT_THEME_TOKENS, type ThemeTokens } from '@rhymix-ts/core';

/**
 * 사이트의 모든 테마 목록을 조회.
 *
 * @param siteId - 사이트 ID
 * @returns 테마 목록 (layouts 포함)
 *
 * @example
 * ```ts
 * const themes = await getThemesForSite(1);
 * // [{ id: 'theme1', name: 'default', layouts: [...], ... }]
 * ```
 */
export async function getThemesForSite(siteId: number): Promise<Prisma.ThemeGetPayload<Record<string, never>>[]> {
  // @MX:NOTE: [AUTO] Theme는 DB에 저장되며 status로 필터링
  // SPEC-LAYOUT-001 기반 Theme 모델
  return prisma.theme.findMany({
    where: { status: 'INSTALLED' },
    include: {
      layouts: true,
    },
  });
}

/**
 * 특정 범위(site/domain)의 ThemeAssignment 조회.
 *
 * @param scope - 'site' 또는 'domain'
 * @param refId - site ID 또는 domain ID
 * @returns ThemeAssignment 또는 null
 *
 * @example
 * ```ts
 * const siteAssignment = await getThemeAssignment('site', 1);
 * const domainAssignment = await getThemeAssignment('domain', 5);
 * ```
 */
export async function getThemeAssignment(
  scope: 'site' | 'domain',
  refId: number,
): Promise<Prisma.ThemeAssignmentGetPayload<Record<string, never>> | null> {
  // @MX:NOTE: [AUTO] Scope를 대문자로 변환하여 DB에 저장된 값과 매칭
  // ThemeAssignment.scope는 AssignmentScope enum (SITE, DOMAIN, MODULE_INSTANCE)
  const scopeUpper = scope.toUpperCase() as 'SITE' | 'DOMAIN';

  return prisma.themeAssignment.findFirst({
    where: {
      scope: scopeUpper,
      refType: scope, // 'site' 또는 'domain'
      refId: refId.toString(),
    },
  });
}

/**
 * 테마의 모든 레이아웃 목록을 조회.
 *
 * @param themeId - 테마 ID
 * @returns 레이아웃 목록
 *
 * @example
 * ```ts
 * const layouts = await getLayoutsForTheme('theme1');
 * // [{ id: 'layout1', name: 'default', title: 'Default Layout', ... }]
 * ```
 */
export async function getLayoutsForTheme(themeId: string): Promise<Prisma.LayoutGetPayload<Record<string, never>>[]> {
  // @MX:NOTE: [AUTO] Layout는 themeId로 필터링
  // Layout 모델은 Theme에 속하며 themeId를 외래키로 가짐
  return prisma.layout.findMany({
    where: { themeId },
  });
}

/**
 * 레이아웃의 스킨 목록을 조회.
 *
 * @param layoutId - 레이아웃 ID (현재 미사용, 향후 확장용)
 * @param themeId - 테마 ID
 * @returns 스킨 목록
 *
 * @example
 * ```ts
 * const skins = await getSkinsForLayout('layout1', 'theme1');
 * // [{ id: 'skin1', name: 'default', title: 'Default Skin', ... }]
 * ```
 *
 * @remarks
 * Prisma schema에서 Skin 모델은 moduleType 필드를 가지며,
 * layoutName 필드가 없습니다. 따라서 themeId로만 필터링합니다.
 * layoutName은 ThemeAssignment.skinName으로 저장되며,
 * 실제 스킨 매칭은 moduleType을 기준으로 합니다.
 */
export async function getSkinsForLayout(
  layoutId: string,
  themeId: string,
): Promise<Prisma.SkinGetPayload<Record<string, never>>[]> {
  // @MX:NOTE: [AUTO] Skin은 themeId로 필터링 (layoutName 필드 없음)
  // 향후 layoutName 필터링이 필요하면, 호출자가 결과를 필터링해야 함
  return prisma.skin.findMany({
    where: { themeId },
  });
}

/**
 * ThemeAssignment의 tokensOverride에 기본값 폴백을 적용.
 *
 * SPEC-MENU-001 REQ-MENU-062: tokensOverride가 null/undefined/빈 객체인 경우,
 * 기본 디자인 토큰 값으로 채운 새 객체를 반환. 원본 tokensOverride는 변경하지 않음.
 *
 * @param tokensOverride - DB에서 읽은 tokensOverride 값 (nullable)
 * @returns 폴백이 적용된 전체 토큰 객체
 *
 * @example
 * ```ts
 * const assignment = await getThemeAssignment('site', 1);
 * const tokens = applyTokenFallback(assignment?.tokensOverride);
 * // { colors: { primary: '#3B82F6', ... }, ... }
 * ```
 */
export function applyTokenFallback(tokensOverride: unknown): ThemeTokens {
  // tokensOverride가 null, undefined, 또는 빈 객체인 경우 기본값 전체 사용
  if (!tokensOverride || typeof tokensOverride !== 'object' || Object.keys(tokensOverride).length === 0) {
    return DEFAULT_THEME_TOKENS;
  }

  // tokensOverride가 부분적으로 채워진 경우, 빈 값을 기본값으로 채움
  // 깊은 병합 수행 (중첩 객체 재귀적으로 병합)
  const deepMerge = <T extends Record<string, unknown>>(base: T, override: Partial<T>): T => {
    const result = { ...base };
    for (const key in override) {
      const baseValue = result[key];
      const overrideValue = override[key];

      if (
        overrideValue !== null &&
        overrideValue !== undefined &&
        typeof overrideValue === 'object' &&
        !Array.isArray(overrideValue) &&
        baseValue !== null &&
        typeof baseValue === 'object' &&
        !Array.isArray(baseValue)
      ) {
        // 재귀적으로 중첩 객체 병합
        result[key] = deepMerge(
          baseValue as Record<string, unknown>,
          overrideValue as Record<string, unknown>,
        ) as T[Extract<keyof T, string>];
      } else if (overrideValue !== null && overrideValue !== undefined) {
        // 기본값을 오버라이드
        result[key] = overrideValue as T[Extract<keyof T, string>];
      }
      // baseValue는 유지 (overrideValue가 null/undefined인 경우)
    }
    return result;
  };

  return deepMerge(DEFAULT_THEME_TOKENS, tokensOverride as Partial<ThemeTokens>);
}
