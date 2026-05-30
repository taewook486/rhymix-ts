// SPEC-LAYOUT-001 Slice A — loader.ts TDD 테스트
// REQ-LAYOUT-006: loadLayoutById / loadLayoutByName 계약

import { describe, it, expect, vi } from 'vitest';
import { loadLayoutById, loadLayoutByName } from './loader';
import type { LayoutConfig } from './types';

// 가상 Layout DB 행 (Prisma Layout 모델과 동일한 구조)
const mockLayoutRow = {
  id: 'clayout001',
  themeId: 'ctheme001',
  name: 'default',
  title: 'Default Layout',
  layoutPath: 'themes/default/layouts/default',
  layoutType: 'DESKTOP' as const,
  siteSrl: null,
  extraVars: { layoutType: 'MAIN_PAGE', footerText: 'Powered by Rhymix-TS' },
};

/** 목 PrismaClient 생성 헬퍼 */
function createMockPrisma(layoutRow: typeof mockLayoutRow | null = mockLayoutRow) {
  return {
    layout: {
      findUnique: vi.fn().mockResolvedValue(layoutRow),
    },
  };
}

describe('loadLayoutById', () => {
  // LB-1: 존재하는 ID → LayoutConfig 반환
  it('존재하는 ID로 조회하면 LayoutConfig를 반환한다', async () => {
    const mockPrisma = createMockPrisma();

    const result = await loadLayoutById('clayout001', mockPrisma as never);

    expect(result).not.toBeNull();
    expect(result?.id).toBe('clayout001');
    expect(result?.name).toBe('default');
    expect(result?.layoutType).toBe('DESKTOP');
    expect(result?.themeId).toBe('ctheme001');
  });

  // LB-2: 존재하지 않는 ID → null 반환 (throw 없음)
  it('존재하지 않는 ID로 조회하면 null을 반환하고 throw하지 않는다', async () => {
    const mockPrisma = createMockPrisma(null);

    const result = await loadLayoutById('nonexistent', mockPrisma as never);

    expect(result).toBeNull();
  });

  // LB-3: Prisma가 올바른 인수로 호출되는지 확인
  it('Prisma findUnique를 올바른 where 조건으로 호출한다', async () => {
    const mockPrisma = createMockPrisma();

    await loadLayoutById('clayout001', mockPrisma as never);

    expect(mockPrisma.layout.findUnique).toHaveBeenCalledWith({
      where: { id: 'clayout001' },
    });
  });

  // LB-4: MOBILE layoutType이 있는 경우도 올바른 LayoutConfig로 매핑 (필터는 resolver에서)
  it('layoutType 필드가 LayoutConfig에 올바르게 매핑된다', async () => {
    const mockPrisma = createMockPrisma();

    const result = await loadLayoutById('clayout001', mockPrisma as never);

    expect(result).toMatchObject<Partial<LayoutConfig>>({
      id: 'clayout001',
      themeId: 'ctheme001',
      name: 'default',
      title: 'Default Layout',
      layoutPath: 'themes/default/layouts/default',
    });
  });
});

describe('loadLayoutByName', () => {
  // LBN-1: 존재하는 themeId + name → LayoutConfig 반환
  it('존재하는 themeId와 name으로 조회하면 LayoutConfig를 반환한다', async () => {
    const mockPrisma = {
      layout: {
        findFirst: vi.fn().mockResolvedValue(mockLayoutRow),
      },
    };

    const result = await loadLayoutByName('ctheme001', 'default', mockPrisma as never);

    expect(result).not.toBeNull();
    expect(result?.themeId).toBe('ctheme001');
    expect(result?.name).toBe('default');
  });

  // LBN-2: 존재하지 않는 themeId + name → null 반환
  it('존재하지 않는 themeId와 name으로 조회하면 null을 반환한다', async () => {
    const mockPrisma = {
      layout: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await loadLayoutByName('nonexistent', 'default', mockPrisma as never);

    expect(result).toBeNull();
  });

  // LBN-3: Prisma가 올바른 where 조건으로 호출되는지 확인
  it('Prisma findFirst를 올바른 where 조건으로 호출한다', async () => {
    const mockPrisma = {
      layout: {
        findFirst: vi.fn().mockResolvedValue(mockLayoutRow),
      },
    };

    await loadLayoutByName('ctheme001', 'default', mockPrisma as never);

    expect(mockPrisma.layout.findFirst).toHaveBeenCalledWith({
      where: {
        themeId: 'ctheme001',
        name: 'default',
        layoutType: 'DESKTOP',
      },
    });
  });

  // LBN-4: extraVars null인 경우도 올바르게 처리
  it('extraVars가 null인 레이아웃도 올바르게 반환한다', async () => {
    const rowWithNullExtraVars = { ...mockLayoutRow, extraVars: null };
    const mockPrisma = {
      layout: {
        findFirst: vi.fn().mockResolvedValue(rowWithNullExtraVars),
      },
    };

    const result = await loadLayoutByName('ctheme001', 'default', mockPrisma as never);

    expect(result).not.toBeNull();
    expect(result?.extraVars).toBeNull();
  });
});
