// @vitest-environment jsdom
/**
 * UserAuthSection 컴포넌트 테스트 — SPEC-INSTALL-002 Group 1 (헤더 세션 동기화)
 * GlobalHeader 검색 인터랙션 테스트 — SPEC-SEARCH-001
 *
 * REQ-INSTALL2-001: 인증된 요청 → 닉네임 + 로그아웃 표시
 * REQ-INSTALL2-002: 미인증 요청 → "로그인" 링크 표시
 * REQ-INSTALL2-003: 로그아웃 → 세션 종료
 * REQ-INSTALL2-004: 공개/관리자 헤더 일관성
 * REQ-INSTALL2-005: 미인증 시 세션 정보 누출 방지
 * REQ-SEARCH-001: 헤더 검색 인터랙션
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

const signOutMock = vi.fn();

vi.mock('@/lib/auth/config', () => ({
  signOut: signOutMock,
}));

// mock next/navigation for form action
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  redirect: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('UserAuthSection - SPEC-INSTALL-002 Group 1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  /**
   * AC-INSTALL2-002 (REQ-INSTALL2-002, 005)
   * 미인증 상태에서는 "로그인" 링크만 표시하고 세션 정보를 누출하지 않음
   */
  it('미인증 요청 시 "로그인" 링크를 표시하고 세션 정보를 누출하지 않는다', async () => {
    // Arrange
    const { UserAuthSection } = await import('./UserAuthSection');

    // Act
    render(
      React.createElement(UserAuthSection, {
        userId: null,
        userName: null,
        userEmail: null,
        userIdString: null,
      })
    );

    // Assert
    const loginLink = screen.getByRole('link', { name: '로그인' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');

    // 세션 파생 정보(닉네임, 이메일, 사용자 ID)가 노출되지 않아야 함
    expect(screen.queryByText(/admin@/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/관리자/i)).not.toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  /**
   * AC-INSTALL2-001 (REQ-INSTALL2-001, 004)
   * 인증된 요청 시 닉네임과 로그아웃 수단을 표시하고 "로그인" 링크은 표시하지 않음
   */
  it('인증된 요청 시 닉네임과 로그아웃 버튼을 표시하고 "로그인" 링크을 표시하지 않는다', async () => {
    // Arrange
    const { UserAuthSection } = await import('./UserAuthSection');

    // Act
    render(
      React.createElement(UserAuthSection, {
        userId: 1,
        userName: '관리자 1',
        userEmail: 'admin@example.com',
        userIdString: '1',
      })
    );

    // Assert
    // "로그인" 링크가 없어야 함
    expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument();

    // 닉네임이 표시되어야 함 (이름이 있는 경우 이름 사용)
    const nickname = screen.getByText('관리자 1');
    expect(nickname).toBeInTheDocument();

    // 로그아웃 버튼이 있어야 함
    const logoutButton = screen.getByRole('button', { name: '로그아웃' });
    expect(logoutButton).toBeInTheDocument();
  });

  /**
   * REQ-INSTALL2-001: 닉네임 폴백 - 이름이 없으면 이메일 표시
   */
  it('인증된 사용자의 이름이 없으면 이메일을 닉네임으로 표시한다', async () => {
    // Arrange
    const { UserAuthSection } = await import('./UserAuthSection');

    // Act
    render(
      React.createElement(UserAuthSection, {
        userId: 2,
        userName: null,
        userEmail: 'user@example.com',
        userIdString: '2',
      })
    );

    // Assert
    const email = screen.getByText('user@example.com');
    expect(email).toBeInTheDocument();
  });

  /**
   * REQ-INSTALL2-001: 닉네임 폴백 - 이름과 이메일이 모두 없으면 ID 표시
   */
  it('인증된 사용자의 이름과 이메일이 모두 없으면 ID를 닉네임으로 표시한다', async () => {
    // Arrange
    const { UserAuthSection } = await import('./UserAuthSection');

    // Act
    render(
      React.createElement(UserAuthSection, {
        userId: 3,
        userName: null,
        userEmail: null,
        userIdString: '3',
      })
    );

    // Assert
    const userId = screen.getByText('3');
    expect(userId).toBeInTheDocument();
  });

  /**
   * AC-INSTALL2-004 (REQ-INSTALL2-003)
   * 로그아웃 버튼 클릭 시 signOut이 호출되고 세션이 종료된다
   * (Note: 실제 signOut 호출은 /auth/signout 경로에서 처리됨)
   */
  it('로그아웃 버튼이 제출되면 /auth/signout 경로로 POST 요청을 보낸다', async () => {
    // Arrange
    const { UserAuthSection } = await import('./UserAuthSection');

    render(
      React.createElement(UserAuthSection, {
        userId: 1,
        userName: '관리자 1',
        userEmail: 'admin@example.com',
        userIdString: '1',
      })
    );

    // Act
    const logoutButton = screen.getByRole('button', { name: '로그아웃' });
    const form = logoutButton.closest('form');

    // Assert
    expect(form).toHaveAttribute('action', '/auth/signout');
    expect(form).toHaveAttribute('method', 'post');
  });

  /**
   * REQ-INSTALL2-004: 공개/관리자 헤더 일관성 확인
   * (이 테스트는 통합 테스트에서 Playwright로 검증)
   */
  it('인증 상태에서 공개 헤더와 관리자 헤더가 동일한 인증 상태를 표시한다 (통합 테스트용 플래그)', async () => {
    // Arrange
    const { UserAuthSection } = await import('./UserAuthSection');

    // Act
    render(
      React.createElement(UserAuthSection, {
        userId: 1,
        userName: '관리자 1',
        userEmail: 'admin@example.com',
        userIdString: '1',
      })
    );

    // Assert
    // 인증 상태가 표시되어야 함 (닉네임 + 로그아웃)
    expect(screen.getByText('관리자 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();

    // "로그인" 링크가 없어야 함
    expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SPEC-SEARCH-001: 헤더 검색 인터랙션 테스트
// ---------------------------------------------------------------------------

describe('GlobalHeader search interaction — SPEC-SEARCH-001', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('S-HEADER-1: search icon is present in header', async () => {
    // Mock dependencies
    const { prisma: mockPrisma } = await import('@/lib/db/prisma');
    vi.mocked(mockPrisma.domain.findUnique).mockResolvedValue({
      id: 1,
      defaultMenuId: 1,
    });

    vi.mocked(mockPrisma.menuItem.findMany).mockResolvedValue([
      { id: 1, title: 'Home', url: '/' },
    ]);

    const { default: GlobalHeader } = await import('./GlobalHeader');
    render(GlobalHeader());

    // Search icon should be in the document
    const searchIcon = document.querySelector('button[aria-label="검색"]');
    expect(searchIcon).toBeTruthy();
  });

  it('S-HEADER-2: clicking search icon expands input field', async () => {
    const user = userEvent.setup();

    const { prisma: mockPrisma } = await import('@/lib/db/prisma');
    vi.mocked(mockPrisma.domain.findUnique).mockResolvedValue({
      id: 1,
      defaultMenuId: 1,
    });

    vi.mocked(mockPrisma.menuItem.findMany).mockResolvedValue([]);

    const { default: GlobalHeader } = await import('./GlobalHeader');
    render(GlobalHeader());

    const searchIcon = document.querySelector('button[aria-label="검색"]') as HTMLButtonElement;
    expect(searchIcon).toBeTruthy();

    // Initially, input should not be visible
    const input = document.querySelector('input[type="text"]');
    expect(input).toBeNull();

    // Click search icon
    await user.click(searchIcon);

    // Now input should be visible
    const expandedInput = document.querySelector('input[type="text"]');
    expect(expandedInput).toBeTruthy();
  });

  it('S-HEADER-3: typing keyword and pressing Enter navigates to /search?q=keyword (AC-SEARCH-001)', async () => {
    const user = userEvent.setup();

    const { prisma: mockPrisma } = await import('@/lib/db/prisma');
    vi.mocked(mockPrisma.domain.findUnique).mockResolvedValue({
      id: 1,
      defaultMenuId: 1,
    });

    vi.mocked(mockPrisma.menuItem.findMany).mockResolvedValue([]);

    const { default: GlobalHeader } = await import('./GlobalHeader');
    render(GlobalHeader());

    // Click search icon to expand input
    const searchIcon = document.querySelector('button[aria-label="검색"]') as HTMLButtonElement;
    await user.click(searchIcon);

    // Type keyword
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    await user.type(input, '타입스크립트');

    // Mock window.location.href assignment
    let capturedHref = '';
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    const originalLocation = window.location;
    (window as any).location = new Proxy(originalLocation, {
      set: (target, prop, value) => {
        if (prop === 'href') {
          capturedHref = value;
        }
        return true;
      },
    });

    // Press Enter
    await user.keyboard('{Enter}');

    // Should navigate to /search with encoded query
    expect(capturedHref).toBe('/search?q=%ED%83%80%EC%9E%91%EC%8A%A4%ED%81%AC%EB%A6%BD%ED%8A%A4');
  });

  it('S-HEADER-4: clicking submit button navigates to /search?q=keyword (AC-SEARCH-001)', async () => {
    const user = userEvent.setup();

    const { prisma: mockPrisma } = await import('@/lib/db/prisma');
    vi.mocked(mockPrisma.domain.findUnique).mockResolvedValue({
      id: 1,
      defaultMenuId: 1,
    });

    vi.mocked(mockPrisma.menuItem.findMany).mockResolvedValue([]);

    const { default: GlobalHeader } = await import('./GlobalHeader');
    render(GlobalHeader());

    // Click search icon to expand
    const searchIcon = document.querySelector('button[aria-label="검색"]') as HTMLButtonElement;
    await user.click(searchIcon);

    // Type keyword
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    await user.type(input, 'test');

    // Mock window.location.href
    let capturedHref = '';
    (window as any).location = new Proxy(window.location, {
      set: (target, prop, value) => {
        if (prop === 'href') {
          capturedHref = value;
        }
        return true;
      },
    });

    // Click submit button
    const submitButton = Array.from(document.querySelectorAll('button')).find(
      (btn) => btn.textContent === '검색',
    ) as HTMLButtonElement;
    expect(submitButton).toBeTruthy();

    await user.click(submitButton);

    // Should navigate to /search with encoded query
    expect(capturedHref).toBe('/search?q=test');
  });

  it('S-HEADER-5: empty query does not navigate', async () => {
    const user = userEvent.setup();

    const { prisma: mockPrisma } = await import('@/lib/db/prisma');
    vi.mocked(mockPrisma.domain.findUnique).mockResolvedValue({
      id: 1,
      defaultMenuId: 1,
    });

    vi.mocked(mockPrisma.menuItem.findMany).mockResolvedValue([]);

    const { default: GlobalHeader } = await import('./GlobalHeader');
    render(GlobalHeader());

    // Click search icon
    const searchIcon = document.querySelector('button[aria-label="검색"]') as HTMLButtonElement;
    await user.click(searchIcon);

    // Mock window.location.href
    let capturedHref = '';
    (window as any).location = new Proxy(window.location, {
      set: (target, prop, value) => {
        if (prop === 'href') {
          capturedHref = value;
        }
        return true;
      },
    });

    // Don't type anything, just press Enter
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      await user.type(input, '{Enter}');
    }

    // Should not navigate (empty href)
    expect(capturedHref).toBe('');
  });
});
