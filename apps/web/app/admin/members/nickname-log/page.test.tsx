// @vitest-environment jsdom
/**
 * 닉네임 변경 기록 조회 페이지 테스트 — SPEC-MEMBER-ADMIN-001 Slice A.
 *
 * TDD RED phase: admin.user.nicknameLog.list 를 그대로 사용하는 읽기 전용
 * 페이지네이션 테이블 렌더 검증.
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-001, REQ-MADM-002, REQ-MADM-003
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

const mockNicknameLogList = vi.fn();

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn().mockResolvedValue({
    admin: {
      user: {
        nicknameLog: {
          list: (...args: unknown[]) => mockNicknameLogList(...args),
        },
      },
    },
  }),
}));

describe('AdminNicknameLogPage (Slice A)', () => {
  it('AC-A1: 회원 아이디/닉네임, 변경 전/후 닉네임, 변경 일시를 표시하고 관리자 변경 행을 구분한다', async () => {
    mockNicknameLogList.mockResolvedValue({
      total: 1,
      page: 1,
      pageSize: 50,
      items: [
        {
          id: 1,
          userId: 1,
          oldNickName: '이전닉네임',
          newNickName: '새닉네임',
          changedByAdminId: 99,
          changedAt: new Date('2026-07-18T00:00:00Z'),
          user: { id: 1, userId: 'testuser', nickName: '새닉네임' },
        },
      ],
    });

    const { default: AdminNicknameLogPage } = await import('./page');
    const result = await AdminNicknameLogPage({
      searchParams: Promise.resolve({}),
    });

    const { getByText, getAllByText } = render(result as React.ReactElement);

    expect(getByText('testuser')).toBeTruthy();
    expect(getByText('이전닉네임')).toBeTruthy();
    // 현재 닉네임(user.nickName)과 변경 후 닉네임(newNickName)이 동일한 값이므로 2곳에 렌더된다.
    expect(getAllByText('새닉네임').length).toBeGreaterThanOrEqual(1);
    expect(getByText('관리자 변경')).toBeTruthy();
  });

  it('AC-A1: 기록이 0건이면 "기록 없음"을 표시한다', async () => {
    mockNicknameLogList.mockResolvedValue({ total: 0, page: 1, pageSize: 50, items: [] });

    const { default: AdminNicknameLogPage } = await import('./page');
    const result = await AdminNicknameLogPage({
      searchParams: Promise.resolve({}),
    });

    const { getByText } = render(result as React.ReactElement);

    expect(getByText('기록이 없습니다.')).toBeTruthy();
  });

  it('AC-A2: page 파라미터를 nicknameLog.list 에 그대로 전달한다 (URL 새로고침 시 페이지 유지)', async () => {
    mockNicknameLogList.mockResolvedValue({ total: 0, page: 3, pageSize: 50, items: [] });

    const { default: AdminNicknameLogPage } = await import('./page');
    await AdminNicknameLogPage({
      searchParams: Promise.resolve({ page: '3' }),
    });

    expect(mockNicknameLogList).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, pageSize: 50 }),
    );
  });
});
