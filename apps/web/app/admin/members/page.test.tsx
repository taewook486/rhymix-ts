// @vitest-environment jsdom
/**
 * 회원 관리 페이지 기본 렌더 테스트 — SPEC-ADMIN-001 Slice E-5.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

const mockUserList = vi.fn().mockResolvedValue({
  users: [
    {
      id: 1,
      userId: 'testuser',
      nickName: '테스트유저',
      emailAddress: 'test@example.com',
      status: 'APPROVED',
      isAdmin: false,
      lastLoginAt: null,
      createdAt: new Date(),
    },
  ],
  total: 1,
});
const mockGetDefault = vi.fn().mockResolvedValue({ showProfilePhotoInList: true });

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn().mockResolvedValue({
    admin: {
      user: {
        list: (...args: unknown[]) => mockUserList(...args),
      },
      settings: {
        getDefault: (...args: unknown[]) => mockGetDefault(...args),
      },
    },
  }),
}));

describe('AdminMembersPage (Slice E-5)', () => {
  it('E-5-UI: 회원 목록을 렌더한다', async () => {
    const { default: AdminMembersPage } = await import('./page');
    const result = await AdminMembersPage({
      searchParams: Promise.resolve({}),
    });

    const { getByText } = render(result as React.ReactElement);

    expect(getByText('회원 관리')).toBeTruthy();
    expect(getByText('testuser')).toBeTruthy();
    expect(getByText('테스트유저')).toBeTruthy();
  });

  it('AC-D4 (REQ-MADM-019): showProfilePhotoInList=true → 프로필 컬럼이 표시된다', async () => {
    mockGetDefault.mockResolvedValue({ showProfilePhotoInList: true });
    const { default: AdminMembersPage } = await import('./page');
    const result = await AdminMembersPage({ searchParams: Promise.resolve({}) });

    const { container } = render(result as React.ReactElement);

    expect(container.querySelector('[data-testid="member-avatar"]')).not.toBeNull();
  });

  it('AC-D4 (REQ-MADM-019): showProfilePhotoInList=false → 프로필 컬럼이 표시되지 않는다', async () => {
    mockGetDefault.mockResolvedValue({ showProfilePhotoInList: false });
    const { default: AdminMembersPage } = await import('./page');
    const result = await AdminMembersPage({ searchParams: Promise.resolve({}) });

    const { container } = render(result as React.ReactElement);

    expect(container.querySelector('[data-testid="member-avatar"]')).toBeNull();
  });
});
