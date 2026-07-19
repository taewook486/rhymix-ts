// @vitest-environment jsdom
/**
 * 회원 그룹 관리 페이지 테스트 — SPEC-MEMBER-ADMIN-001 Slice C.
 *
 * AC-C1: imageMark 값이 그룹 목록에 표시된다(존재 시 썸네일, 부재 시 "—").
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-009, REQ-MADM-010
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

const mockGroupList = vi.fn();

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn().mockResolvedValue({
    admin: {
      group: {
        list: (...args: unknown[]) => mockGroupList(...args),
      },
    },
  }),
}));

vi.mock('@/providers/TRPCProvider', () => ({
  trpc: {
    admin: {
      group: {
        reorder: {
          useMutation: () => ({ mutateAsync: vi.fn() }),
        },
      },
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe('AdminMemberGroupsPage (Slice C)', () => {
  it('AC-C1: imageMark 이 있으면 썸네일, 없으면 "—" 를 표시한다', async () => {
    mockGroupList.mockResolvedValue([
      {
        id: 1,
        title: '일반회원',
        description: null,
        isDefault: true,
        isAdmin: false,
        imageMark: '/uploads/mark.png',
        listOrder: 0,
        memberCount: 5,
      },
      {
        id: 2,
        title: 'VIP',
        description: null,
        isDefault: false,
        isAdmin: false,
        imageMark: null,
        listOrder: 1,
        memberCount: 2,
      },
    ]);

    const { default: AdminMemberGroupsPage } = await import('./page');
    const result = await AdminMemberGroupsPage();

    const { container, getAllByText } = render(result as React.ReactElement);

    // 썸네일 img가 imageMark 있는 그룹에만 렌더된다.
    const imgs = container.querySelectorAll('img[alt=""]');
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    // imageMark 없는 그룹은 "—" 로 표시된다 (테이블 + 순서변경 영역 등 다수 위치 가능).
    expect(getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });
});
