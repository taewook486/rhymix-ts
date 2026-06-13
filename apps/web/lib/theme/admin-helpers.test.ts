/**
 * admin-helpers.test.ts
 *
 * TDD 단위 테스트 — admin UI에서 사용하는 theme/layout/skin 조회 헬퍼.
 * SPEC-THEME-POLISH-001 Slice A.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@rhymix-ts/db';
import {
  getThemesForSite,
  getThemeAssignment,
  getLayoutsForTheme,
  getSkinsForLayout,
} from './admin-helpers';

// Prisma mock 설정
vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    theme: {
      findMany: vi.fn(),
    },
    themeAssignment: {
      findFirst: vi.fn(),
    },
    layout: {
      findMany: vi.fn(),
    },
    skin: {
      findMany: vi.fn(),
    },
  },
}));

describe('admin-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getThemesForSite', () => {
    it('사이트의 모든 테마 목록을 조회 (layouts 포함)', async () => {
      const mockThemes = [
        {
          id: 'theme1',
          name: 'default',
          displayName: 'Default Theme',
          version: '1.0.0',
          status: 'INSTALLED',
          layouts: [
            { id: 'layout1', name: 'default', title: 'Default Layout' },
          ],
        },
      ];

      vi.mocked(prisma.theme.findMany).mockResolvedValue(mockThemes as any);

      const result = await getThemesForSite(1);

      expect(prisma.theme.findMany).toHaveBeenCalledWith({
        where: { status: 'INSTALLED' },
        include: { layouts: true },
      });
      expect(result).toEqual(mockThemes);
    });

    it('빈 결과 반환 (테마 없음)', async () => {
      vi.mocked(prisma.theme.findMany).mockResolvedValue([]);

      const result = await getThemesForSite(999);

      expect(result).toEqual([]);
    });
  });

  describe('getThemeAssignment', () => {
    it('site scope의 ThemeAssignment 조회', async () => {
      const mockAssignment = {
        id: 'ta1',
        themeId: 'theme1',
        scope: 'SITE',
        refType: 'site',
        refId: '1',
        layoutName: 'default',
        skinName: null,
      };

      vi.mocked(prisma.themeAssignment.findFirst).mockResolvedValue(
        mockAssignment as any,
      );

      const result = await getThemeAssignment('site', 1);

      expect(prisma.themeAssignment.findFirst).toHaveBeenCalledWith({
        where: {
          scope: 'SITE',
          refType: 'site',
          refId: '1',
        },
      });
      expect(result).toEqual(mockAssignment);
    });

    it('domain scope의 ThemeAssignment 조회', async () => {
      const mockAssignment = {
        id: 'ta2',
        themeId: 'theme2',
        scope: 'DOMAIN',
        refType: 'domain',
        refId: '2',
      };

      vi.mocked(prisma.themeAssignment.findFirst).mockResolvedValue(
        mockAssignment as any,
      );

      const result = await getThemeAssignment('domain', 2);

      expect(prisma.themeAssignment.findFirst).toHaveBeenCalledWith({
        where: {
          scope: 'DOMAIN',
          refType: 'domain',
          refId: '2',
        },
      });
      expect(result).toEqual(mockAssignment);
    });

    it('할당이 없으면 null 반환', async () => {
      vi.mocked(prisma.themeAssignment.findFirst).mockResolvedValue(null);

      const result = await getThemeAssignment('site', 999);

      expect(result).toBeNull();
    });
  });

  describe('getLayoutsForTheme', () => {
    it('테마의 모든 레이아웃 목록 조회', async () => {
      const mockLayouts = [
        {
          id: 'layout1',
          name: 'default',
          title: 'Default Layout',
          layoutType: 'DESKTOP',
        },
        {
          id: 'layout2',
          name: 'mobile',
          title: 'Mobile Layout',
          layoutType: 'MOBILE',
        },
      ];

      vi.mocked(prisma.layout.findMany).mockResolvedValue(mockLayouts as any);

      const result = await getLayoutsForTheme('theme1');

      expect(prisma.layout.findMany).toHaveBeenCalledWith({
        where: { themeId: 'theme1' },
      });
      expect(result).toEqual(mockLayouts);
    });

    it('빈 결과 반환 (레이아웃 없음)', async () => {
      vi.mocked(prisma.layout.findMany).mockResolvedValue([]);

      const result = await getLayoutsForTheme('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getSkinsForLayout', () => {
    it('레이아웃의 스킨 목록 조회 (themeId 기반)', async () => {
      const mockSkins = [
        {
          id: 'skin1',
          name: 'default',
          title: 'Default Skin',
        },
        {
          id: 'skin2',
          name: 'blue',
          title: 'Blue Skin',
        },
      ];

      vi.mocked(prisma.skin.findMany).mockResolvedValue(mockSkins as any);

      const result = await getSkinsForLayout('layout1', 'theme1');

      expect(prisma.skin.findMany).toHaveBeenCalledWith({
        where: {
          themeId: 'theme1',
          // @MX:NOTE: [AUTO] 스킨은 layoutName이 아니라 moduleType으로 필터링
          // 실제 Prisma schema에서 Skin 모델은 moduleType을 가짐
          // layoutName은 ThemeAssignment에 저장됨
          // 따라서 여기서는 themeId로만 필터링하고, 호출자가 필터링 필요
        },
      });
      expect(result).toEqual(mockSkins);
    });

    it('빈 결과 반환 (스킨 없음)', async () => {
      vi.mocked(prisma.skin.findMany).mockResolvedValue([]);

      const result = await getSkinsForLayout('layout1', 'theme1');

      expect(result).toEqual([]);
    });
  });
});
