'use server';

/**
 * Theme / Layout / Skin 할당 및 Token 저장 Server Actions.
 *
 * SPEC-THEME-POLISH-001 Section 2.2 (REQ-THEME-POLISH-010~019),
 * Section 2.3 (REQ-THEME-POLISH-020~029).
 *
 * 관리자 권한 검사, Zod 검증, Prisma 업데이트, AdminLog 기록,
 * revalidatePath 호출을 수행한다.
 */

import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma, Prisma } from '@rhymix-ts/db';
import { getThemeAssignment, applyTokenFallback } from '@/lib/theme/admin-helpers';

// @MX:NOTE: [AUTO] themeTokensSchema는 packages/core에서 import
// token-form-builder와 동일하게 @rhymix-ts/core를 통해 import
import { themeTokensSchema, type ThemeTokens } from '@rhymix-ts/core';

// ============================================================================
// Zod Schemas for Input Validation
// ============================================================================

const AssignThemeSchema = z.object({
  scope: z.enum(['site', 'domain']),
  refId: z.number().int().positive(),
  themeId: z.string().min(1),
  siteId: z.number().int().positive(),
});

const AssignLayoutSchema = z.object({
  scope: z.enum(['module_instance', 'domain', 'site']),
  refId: z.number().int().positive(),
  layoutId: z.string().min(1),
  siteId: z.number().int().positive(),
});

const AssignSkinSchema = z.object({
  moduleInstanceId: z.number().int().positive(),
  skinName: z.string().min(1),
});

const SaveTokensSchema = z.object({
  scope: z.enum(['site', 'domain', 'module_instance']),
  refId: z.number().int().positive(),
  tokens: z.unknown(), // themeTokensSchema로 후속 검증
  siteId: z.number().int().positive(),
});

const LoadTokensSchema = z.object({
  scope: z.enum(['site', 'domain']), // module_instance scope는 아직 지원하지 않음
  refId: z.number().int().positive(),
});

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Token 로드 Server Action — SPEC-MENU-001 REQ-MENU-062.
 *
 * ThemeAssignment.tokensOverride를 조회하고, 비어 있거나 누락된 키에 대해
 * 기본값 폴백을 적용하여 반환. /admin/site/design 화면의 초기값으로 사용.
 *
 * @param input - 로드 파라미터 (scope, refId)
 * @returns 성공 여부, 에러 메시지, 폴백이 적용된 토큰
 *
 * @example
 * ```ts
 * const result = await loadTokens({
 *   scope: 'site',
 *   refId: 1,
 * });
 * // { success: true, tokens: { colors: { primary: '#3B82F6', ... }, ... } }
 * ```
 */
export async function loadTokens(
  input: z.infer<typeof LoadTokensSchema>,
): Promise<{ success: boolean; error?: string; tokens?: ThemeTokens }> {
  // Admin auth check — REQ-THEME-POLISH-015
  const session = await auth();
  if (!isAdminSession(session)) {
    redirect('/login');
  }

  // Zod validation
  const parseResult = LoadTokensSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: `Invalid input: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
    };
  }

  const { scope, refId } = parseResult.data;

  try {
    // ThemeAssignment 조회 — SPEC-MENU-001 REQ-MENU-062
    const assignment = await getThemeAssignment(scope, refId);

    // 폴백 적용: tokensOverride가 null/undefined/빈 객체이면 기본값 사용
    const tokens = applyTokenFallback(assignment?.tokensOverride);

    return { success: true, tokens };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    } as const;
  }
}

/**
 * Theme 할당 Server Action — REQ-THEME-POLISH-014.
 *
 * @param input - 할당 파라미터 (scope, refId, themeId, siteId)
 * @returns 성공 여부 및 에러 메시지
 *
 * @example
 * ```ts
 * const result = await assignTheme({
 *   scope: 'site',
 *   refId: 1,
 *   themeId: 'theme1',
 *   siteId: 1,
 * });
 * // { success: true }
 * ```
 */
export async function assignTheme(
  input: z.infer<typeof AssignThemeSchema>,
): Promise<{ success: boolean; error?: string }> {
  // Admin auth check — REQ-THEME-POLISH-015
  const session = await auth();
  if (!isAdminSession(session)) {
    redirect('/login');
  }

  // Zod validation — REQ-THEME-POLISH-012
  const parseResult = AssignThemeSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: `Invalid input: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
    };
  }

  const { scope, refId, themeId, siteId } = parseResult.data;

  try {
    // Upsert ThemeAssignment — SPEC-LAYOUT-001 REQ-LAYOUT-010
    // @MX:NOTE: [AUTO] scope는 대문자(SITE, DOMAIN)로 변환하여 DB에 저장
    // ThemeAssignment.unique(scope, refType, refId) 제약 조건 활용
    const scopeUpper = scope.toUpperCase() as 'SITE' | 'DOMAIN';
    await prisma.themeAssignment.upsert({
      where: {
        scope_refType_refId: {
          scope: scopeUpper,
          refType: scope,
          refId: refId.toString(),
        },
      },
      create: {
        themeId,
        scope: scopeUpper,
        refType: scope,
        refId: refId.toString(),
      },
      update: {
        themeId,
      },
    });

    // Revalidate — REQ-THEME-POLISH-012
    revalidatePath('/');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    } as const;
  }
}

/**
 * Layout 할당 Server Action — REQ-THEME-POLISH-012.
 *
 * @param input - 할당 파라미터 (scope, refId, layoutId, siteId)
 * @returns 성공 여부 및 에러 메시지
 *
 * @example
 * ```ts
 * // Module instance 범위
 * const result = await assignLayout({
 *   scope: 'module_instance',
 *   refId: 10,
 *   layoutId: 'layout1',
 *   siteId: 1,
 * });
 *
 * // Domain 범위
 * const result = await assignLayout({
 *   scope: 'domain',
 *   refId: 5,
 *   layoutId: 'layout2',
 *   siteId: 1,
 * });
 *
 * // Site 범위
 * const result = await assignLayout({
 *   scope: 'site',
 *   refId: 1,
 *   layoutId: 'layout3',
 *   siteId: 1,
 * });
 * ```
 */
export async function assignLayout(
  input: z.infer<typeof AssignLayoutSchema>,
): Promise<{ success: boolean; error?: string }> {
  // Admin auth check — REQ-THEME-POLISH-015
  const session = await auth();
  if (!isAdminSession(session)) {
    redirect('/login');
  }

  // Zod validation — REQ-THEME-POLISH-012
  const parseResult = AssignLayoutSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: `Invalid input: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
    };
  }

  const { scope, refId, layoutId, siteId } = parseResult.data;

  try {
    // Scope별 처리 — REQ-THEME-POLISH-012
    switch (scope) {
      case 'module_instance': {
        // ModuleInstance.layoutId 업데이트
        await prisma.moduleInstance.update({
          where: { id: refId },
          data: { layoutId },
        });
        break;
      }

      case 'domain': {
        // Domain.defaultLayoutId 업데이트
        await prisma.domain.update({
          where: { id: refId },
          data: { defaultLayoutId: layoutId },
        });
        break;
      }

      case 'site': {
        // ThemeAssignment.upsert (site scope)
        // @MX:NOTE: [AUTO] layout만 변경하는 경우 themeId는 빈 문자열로 설정
        // 실제 theme는 assignTheme로 별도 할당됨
        await prisma.themeAssignment.upsert({
          where: {
            scope_refType_refId: {
              scope: 'SITE',
              refType: 'site',
              refId: refId.toString(),
            },
          },
          create: {
            scope: 'SITE',
            refType: 'site',
            refId: refId.toString(),
            layoutName: layoutId,
            themeId: '', // Layout만 할당
          },
          update: {
            layoutName: layoutId,
          },
        });
        break;
      }

      default:
        // TypeScript exhaustiveness check
        const _exhaustive: never = scope;
        return _exhaustive;
    }

    // Revalidate — REQ-THEME-POLISH-012
    revalidatePath('/admin/site/design');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    } as const;
  }
}

/**
 * Skin 할당 Server Action — REQ-THEME-POLISH-013.
 *
 * @param input - 할당 파라미터 (moduleInstanceId, skinName)
 * @returns 성공 여부 및 에러 메시지
 *
 * @example
 * ```ts
 * const result = await assignSkin({
 *   moduleInstanceId: 10,
 *   skinName: 'blue',
 * });
 * // { success: true }
 * ```
 */
export async function assignSkin(
  input: z.infer<typeof AssignSkinSchema>,
): Promise<{ success: boolean; error?: string }> {
  // Admin auth check — REQ-THEME-POLISH-015
  const session = await auth();
  if (!isAdminSession(session)) {
    redirect('/login');
  }

  // Zod validation
  const parseResult = AssignSkinSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: `Invalid input: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
    };
  }

  const { moduleInstanceId, skinName } = parseResult.data;

  try {
    // ModuleInstance.skin 업데이트 — REQ-THEME-POLISH-013
    await prisma.moduleInstance.update({
      where: { id: moduleInstanceId },
      data: { skin: skinName },
    });

    // Revalidate — REQ-THEME-POLISH-012
    revalidatePath('/admin/site/design');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    } as const;
  }
}

/**
 * Token 저장 Server Action — REQ-THEME-POLISH-024.
 *
 * @param input - 저장 파라미터 (scope, refId, tokens, siteId)
 * @returns 성공 여부 및 에러 메시지
 *
 * @example
 * ```ts
 * const result = await saveTokens({
 *   scope: 'site',
 *   refId: 1,
 *   tokens: {
 *     colors: {
 *       primary: '#3B82F6',
 *       background: '#FFFFFF',
 *     },
 *   },
 *   siteId: 1,
 * });
 * // { success: true }
 * ```
 */
export async function saveTokens(
  input: z.infer<typeof SaveTokensSchema>,
): Promise<{ success: boolean; error?: string }> {
  // Admin auth check — REQ-THEME-POLISH-015
  const session = await auth();
  if (!isAdminSession(session)) {
    redirect('/login');
  }

  // Zod input validation
  const parseResult = SaveTokensSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: `Invalid input: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
    };
  }

  const { scope, refId, tokens, siteId } = parseResult.data;

  // Server-side token validation — REQ-THEME-POLISH-024
  // @MX:NOTE: [AUTO] themeTokensSchema로 tokens 구조 검증
  // client-side 우회 방지를 위해 server에서 재검증
  const tokenValidation = themeTokensSchema.safeParse(tokens);
  if (!tokenValidation.success) {
    return {
      success: false,
      error: `Invalid tokens: ${tokenValidation.error.errors.map((e) => e.message).join(', ')}`,
    };
  }

  try {
    // Upsert ThemeAssignment.tokensOverride — REQ-LAYOUT-014
    const scopeUpper = scope.toUpperCase() as 'SITE' | 'DOMAIN' | 'MODULE_INSTANCE';
    await prisma.themeAssignment.upsert({
      where: {
        scope_refType_refId: {
          scope: scopeUpper,
          refType: scope,
          refId: refId.toString(),
        },
      },
      create: {
        scope: scopeUpper,
        refType: scope,
        refId: refId.toString(),
        tokensOverride: tokens as Prisma.NullableJsonNullValueInput,
        themeId: '', // Token만 저장하는 경우 themeId는 빈 문자열
      },
      update: {
        tokensOverride: tokens as Prisma.NullableJsonNullValueInput,
      },
    });

    // Revalidate — REQ-THEME-POLISH-024
    // @MX:NOTE: [AUTO] hot-reload 메커니즘 (Section 5.5)
    // revalidatePath 호출 시 다음 요청부터 새 token이 반영됨
    revalidatePath('/');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    } as const;
  }
}
