// @vitest-environment jsdom
/**
 * 아이디/닉네임 차단 관리 페이지 테스트 — SPEC-MEMBER-ADMIN-001 Slice B.
 *
 * TDD RED phase: deniedList.list/add/remove 를 그대로 사용하는 CRUD 화면 검증.
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-004~008
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

const mockDeniedListList = vi.fn();

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn().mockResolvedValue({
    admin: {
      user: {
        deniedList: {
          list: (...args: unknown[]) => mockDeniedListList(...args),
        },
      },
    },
  }),
}));

describe('AdminDeniedListPage (Slice B)', () => {
  it('REQ-MADM-004: 종류별로 DeniedIdentifier 목록을 표시한다', async () => {
    mockDeniedListList.mockResolvedValue([
      { id: 1, kind: 'USER_ID', pattern: 'baduser', reason: null, createdAt: new Date('2026-01-01') },
      { id: 2, kind: 'NICK_NAME', pattern: '금지어', reason: null, createdAt: new Date('2026-01-02') },
    ]);

    const { default: AdminDeniedListPage } = await import('./page');
    const result = await AdminDeniedListPage({ searchParams: Promise.resolve({}) });

    const { getByText } = render(result as React.ReactElement);

    expect(getByText('baduser')).toBeTruthy();
    expect(getByText('금지어')).toBeTruthy();
  });

  it('빈 목록이면 안내 문구를 표시한다', async () => {
    mockDeniedListList.mockResolvedValue([]);

    const { default: AdminDeniedListPage } = await import('./page');
    const result = await AdminDeniedListPage({ searchParams: Promise.resolve({}) });

    const { getByText } = render(result as React.ReactElement);

    expect(getByText('등록된 차단 항목이 없습니다.')).toBeTruthy();
  });

  it('type 파라미터를 deniedList.list 에 그대로 전달한다', async () => {
    mockDeniedListList.mockResolvedValue([]);

    const { default: AdminDeniedListPage } = await import('./page');
    await AdminDeniedListPage({ searchParams: Promise.resolve({ type: 'NICK_NAME' }) });

    expect(mockDeniedListList).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'NICK_NAME' }),
    );
  });
});
