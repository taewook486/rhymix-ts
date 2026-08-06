/**
 * actions.test.ts
 *
 * TDD 단위 테스트 — theme/layout/skin 할당 및 token 저장 Server Actions.
 * SPEC-THEME-POLISH-001 Section 2.2 (REQ-THEME-POLISH-010~019), Section 2.3 (REQ-THEME-POLISH-020~029).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@rhymix-ts/db';
import {
  assignTheme,
  assignLayout,
  assignSkin,
  saveTokens,
} from './actions';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';

// Mock dependencies
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/auth/admin-middleware', () => ({
  isAdminSession: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    themeAssignment: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
    moduleInstance: {
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    domain: {
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    adminLog: {
      create: vi.fn(),
    },
  },
}));

// Mock themeTokensSchema
vi.mock('@rhymix-ts/core', () => ({
  themeTokensSchema: {
    safeParse: vi.fn(),
  },
}));

import { themeTokensSchema } from '@rhymix-ts/core';

describe('actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default admin session mock
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 1,
        isAdmin: true,
      },
    });
    vi.mocked(isAdminSession).mockReturnValue(true);
    // Default valid tokens mock
    vi.mocked(themeTokensSchema.safeParse).mockReturnValue({
      success: true,
      data: {},
    } as any);
  });

  describe('assignTheme', () => {
    it('site scope에 theme 할당 성공', async () => {
      vi.mocked(prisma.themeAssignment.upsert).mockResolvedValue({
        id: 'ta1',
        themeId: 'theme1',
      } as any);

      const result = await assignTheme({
        scope: 'site',
        refId: 1,
        themeId: 'theme1',
        siteId: 1,
      });

      expect(result.success).toBe(true);
      expect(prisma.themeAssignment.upsert).toHaveBeenCalledWith({
        where: {
          scope_refType_refId: {
            scope: 'SITE',
            refType: 'site',
            refId: '1',
          },
        },
        create: {
          themeId: 'theme1',
          scope: 'SITE',
          refType: 'site',
          refId: '1',
        },
        update: {
          themeId: 'theme1',
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('domain scope에 theme 할당 성공', async () => {
      vi.mocked(prisma.themeAssignment.upsert).mockResolvedValue({
        id: 'ta2',
        themeId: 'theme2',
      } as any);

      const result = await assignTheme({
        scope: 'domain',
        refId: 5,
        themeId: 'theme2',
        siteId: 1,
      });

      expect(result.success).toBe(true);
      expect(prisma.themeAssignment.upsert).toHaveBeenCalledWith({
        where: {
          scope_refType_refId: {
            scope: 'DOMAIN',
            refType: 'domain',
            refId: '5',
          },
        },
        create: {
          themeId: 'theme2',
          scope: 'DOMAIN',
          refType: 'domain',
          refId: '5',
        },
        update: {
          themeId: 'theme2',
        },
      });
    });

    it('비권한 사용자는 redirect /login', async () => {
      vi.mocked(isAdminSession).mockReturnValue(false);

      await assignTheme({
        scope: 'site',
        refId: 1,
        themeId: 'theme1',
        siteId: 1,
      });

      expect(redirect).toHaveBeenCalledWith('/login');
    });

    it('Zod validation 실패 시 에러 반환', async () => {
      const result = await assignTheme({
        scope: 'invalid' as any, // Invalid scope
        refId: 1,
        themeId: 'theme1',
        siteId: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('assignLayout', () => {
    it('module_instance scope에 layout 할당 성공', async () => {
      vi.mocked(prisma.moduleInstance.update).mockResolvedValue({
        id: 10,
        layoutId: 'layout1',
      } as any);

      const result = await assignLayout({
        scope: 'module_instance',
        refId: 10,
        layoutId: 'layout1',
        siteId: 1,
      });

      expect(result.success).toBe(true);
      expect(prisma.moduleInstance.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { layoutId: 'layout1' },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/admin/site/design');
    });

    it('domain scope에 layout 할당 성공', async () => {
      vi.mocked(prisma.domain.update).mockResolvedValue({
        id: 5,
        defaultLayoutId: 'layout2',
      } as any);

      const result = await assignLayout({
        scope: 'domain',
        refId: 5,
        layoutId: 'layout2',
        siteId: 1,
      });

      expect(result.success).toBe(true);
      expect(prisma.domain.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { defaultLayoutId: 'layout2' },
      });
    });

    it('site scope에 layout 할당 성공 (ThemeAssignment)', async () => {
      vi.mocked(prisma.themeAssignment.upsert).mockResolvedValue({
        id: 'ta1',
        layoutName: 'layout1',
      } as any);

      const result = await assignLayout({
        scope: 'site',
        refId: 1,
        layoutId: 'layout1',
        siteId: 1,
      });

      expect(result.success).toBe(true);
      expect(prisma.themeAssignment.upsert).toHaveBeenCalledWith({
        where: {
          scope_refType_refId: {
            scope: 'SITE',
            refType: 'site',
            refId: '1',
          },
        },
        create: {
          scope: 'SITE',
          refType: 'site',
          refId: '1',
          layoutName: 'layout1',
          themeId: '', // @MX:NOTE: [AUTO] layout만 변경하는 경우 themeId는 빈 문자열
        },
        update: {
          layoutName: 'layout1',
        },
      });
    });

    it('비권한 사용자는 redirect /login', async () => {
      vi.mocked(isAdminSession).mockReturnValue(false);

      await assignLayout({
        scope: 'site',
        refId: 1,
        layoutId: 'layout1',
        siteId: 1,
      });

      expect(redirect).toHaveBeenCalledWith('/login');
    });

    it('Zod validation 실패 시 에러 반환', async () => {
      const result = await assignLayout({
        scope: 'invalid' as any,
        refId: 1,
        layoutId: 'layout1',
        siteId: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('assignSkin', () => {
    it('스킨 할당 성공', async () => {
      vi.mocked(prisma.moduleInstance.update).mockResolvedValue({
        id: 10,
        skin: 'blue',
      } as any);

      const result = await assignSkin({
        moduleInstanceId: 10,
        skinName: 'blue',
      });

      expect(result.success).toBe(true);
      expect(prisma.moduleInstance.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { skin: 'blue' },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/admin/site/design');
    });

    it('비권한 사용자는 redirect /login', async () => {
      vi.mocked(isAdminSession).mockReturnValue(false);

      await assignSkin({
        moduleInstanceId: 10,
        skinName: 'blue',
      });

      expect(redirect).toHaveBeenCalledWith('/login');
    });

    it('Zod validation 실패 시 에러 반환', async () => {
      const result = await assignSkin({
        moduleInstanceId: 0, // Invalid ID
        skinName: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('saveTokens', () => {
    it('site scope에 token 저장 성공', async () => {
      const validTokens = {
        colors: {
          primary: '#3B82F6',
          background: '#FFFFFF',
        },
      };

      vi.mocked(prisma.themeAssignment.upsert).mockResolvedValue({
        id: 'ta1',
        tokensOverride: validTokens,
      } as any);

      const result = await saveTokens({
        scope: 'site',
        refId: 1,
        tokens: validTokens,
        siteId: 1,
      });

      expect(result.success).toBe(true);
      expect(prisma.themeAssignment.upsert).toHaveBeenCalledWith({
        where: {
          scope_refType_refId: {
            scope: 'SITE',
            refType: 'site',
            refId: '1',
          },
        },
        create: {
          scope: 'SITE',
          refType: 'site',
          refId: '1',
          tokensOverride: validTokens,
          themeId: '',
        },
        update: {
          tokensOverride: validTokens,
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('domain scope에 token 저장 성공', async () => {
      const validTokens = {
        colors: {
          primary: '#10B981',
        },
      };

      vi.mocked(prisma.themeAssignment.upsert).mockResolvedValue({
        id: 'ta2',
        tokensOverride: validTokens,
      } as any);

      const result = await saveTokens({
        scope: 'domain',
        refId: 5,
        tokens: validTokens,
        siteId: 1,
      });

      expect(result.success).toBe(true);
      expect(prisma.themeAssignment.upsert).toHaveBeenCalledWith({
        where: {
          scope_refType_refId: {
            scope: 'DOMAIN',
            refType: 'domain',
            refId: '5',
          },
        },
        create: {
          scope: 'DOMAIN',
          refType: 'domain',
          refId: '5',
          tokensOverride: validTokens,
          themeId: '',
        },
        update: {
          tokensOverride: validTokens,
        },
      });
    });

    it('Zod validation 실패 시 에러 반환 (invalid tokens)', async () => {
      const invalidTokens = {
        colors: {
          primary: 'not-a-valid-hex-color',
        },
      };

      // Mock safeParse to return failure
      vi.mocked(themeTokensSchema.safeParse).mockReturnValue({
        success: false,
        error: {
          errors: [{ message: 'Invalid hex color' }],
        },
      } as any);

      const result = await saveTokens({
        scope: 'site',
        refId: 1,
        tokens: invalidTokens,
        siteId: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid tokens');
    });

    it('비권한 사용자는 redirect /login', async () => {
      vi.mocked(isAdminSession).mockReturnValue(false);

      const result = await saveTokens({
        scope: 'site',
        refId: 1,
        tokens: { colors: { primary: '#3B82F6' } },
        siteId: 1,
      });

      expect(redirect).toHaveBeenCalledWith('/login');
    });

    it('빈 tokens로 저장 (reset to default)', async () => {
      vi.mocked(prisma.themeAssignment.upsert).mockResolvedValue({
        id: 'ta1',
        tokensOverride: null,
      } as any);

      const result = await saveTokens({
        scope: 'site',
        refId: 1,
        tokens: {},
        siteId: 1,
      });

      expect(result.success).toBe(true);
      expect(prisma.themeAssignment.upsert).toHaveBeenCalledWith({
        where: {
          scope_refType_refId: {
            scope: 'SITE',
            refType: 'site',
            refId: '1',
          },
        },
        create: {
          scope: 'SITE',
          refType: 'site',
          refId: '1',
          tokensOverride: {},
          themeId: '',
        },
        update: {
          tokensOverride: {},
        },
      });
    });
  });
});
