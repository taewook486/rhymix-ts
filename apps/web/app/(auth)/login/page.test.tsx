/**
 * @vitest-environment jsdom
 */

/**
 * Specification tests for Login Page — SPEC-AUTH-001 Slice F.
 *
 * LoginForm 컴포넌트가 올바르게 렌더링되고, 에러 메시지를 표시하는지 검증한다.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { useActionStateMock } = vi.hoisted(() => ({
  useActionStateMock: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof React>();
  return { ...actual, useActionState: useActionStateMock };
});

vi.mock('@/lib/auth/actions', () => ({
  loginAction: vi.fn(),
  initialAuthActionState: { ok: true },
}));

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode; className?: string }) => {
    const { href, children, ...rest } = props;
    return React.createElement('a', { href, ...rest }, children);
  },
}));

// page.tsx가 useSearchParams를 사용하므로 jsdom 환경에서 null 방지
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  redirect: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LoginPage', () => {
  afterEach(() => {
    cleanup();
    useActionStateMock.mockReset();
  });

  it('identifier 와 password 입력 필드를 렌더링', async () => {
    useActionStateMock.mockReturnValue([{ ok: true }, vi.fn(), false]);
    const { default: LoginPage } = await import('./page');
    render(React.createElement(LoginPage));

    expect(screen.getByLabelText(/아이디/i)).toBeDefined();
    expect(screen.getByLabelText(/비밀번호/i)).toBeDefined();
  });

  it('로그인 버튼을 렌더링', async () => {
    useActionStateMock.mockReturnValue([{ ok: true }, vi.fn(), false]);
    const { default: LoginPage } = await import('./page');
    render(React.createElement(LoginPage));

    expect(screen.getByRole('button', { name: /로그인/i })).toBeDefined();
  });

  it('회원가입 링크를 포함', async () => {
    useActionStateMock.mockReturnValue([{ ok: true }, vi.fn(), false]);
    const { default: LoginPage } = await import('./page');
    render(React.createElement(LoginPage));

    const signupLink = screen.getByRole('link', { name: /회원가입/i });
    expect(signupLink).toBeDefined();
    expect(signupLink.getAttribute('href')).toBe('/signup');
  });

  it('비밀번호 찾기 링크를 포함', async () => {
    useActionStateMock.mockReturnValue([{ ok: true }, vi.fn(), false]);
    const { default: LoginPage } = await import('./page');
    render(React.createElement(LoginPage));

    const resetLink = screen.getByRole('link', { name: /비밀번호 찾기/i });
    expect(resetLink).toBeDefined();
    expect(resetLink.getAttribute('href')).toBe('/password-reset');
  });

  it('에러 상태일 때 에러 메시지 표시', async () => {
    useActionStateMock.mockReturnValue([
      { ok: false, formError: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      vi.fn(),
      false,
    ]);

    const { default: LoginPage } = await import('./page');
    render(React.createElement(LoginPage));

    expect(
      screen.getByText('아이디 또는 비밀번호가 올바르지 않습니다.'),
    ).toBeDefined();
  });
});
