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

// Mock tRPC provider - provide captcha/social config mock data
const { socialConfigMock } = vi.hoisted(() => ({
  socialConfigMock: vi.fn(() => ({
    data: { kakao: { enabled: false }, google: { enabled: false } },
    isLoading: false,
  })),
}));

vi.mock('@/providers/TRPCProvider', () => ({
  trpc: {
    public: {
      captcha: {
        getConfig: {
          useQuery: () => ({
            data: {
              signupEnabled: false,
              loginEnabled: false,
              siteKey: 'test-site-key',
            },
          }),
        },
      },
      social: {
        getConfig: {
          useQuery: socialConfigMock,
        },
      },
    },
  },
}));

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode; className?: string }) => {
    const { href, children, ...rest } = props;
    return React.createElement('a', { href, ...rest }, children);
  },
}));

// Setup App Router mocks before importing the page
import { setupAppRouterMocks } from '@rhymix-ts/test-utils';

setupAppRouterMocks();

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
    socialConfigMock.mockReturnValue({
      data: { kakao: { enabled: false }, google: { enabled: false } },
      isLoading: false,
    });
  });

  // SPEC-SOCIAL-LOGIN-001 AC-SOCIAL-004: 관리자 설정을 실제로 반영해야 한다
  // (재발 방지 — 이전엔 존재하지 않는 환경변수를 읽어 항상 버튼이 숨겨졌음)
  it('소셜 로그인이 둘 다 비활성화면 버튼을 표시하지 않는다', async () => {
    useActionStateMock.mockReturnValue([{ ok: true }, vi.fn(), false]);
    const { default: LoginPage } = await import('./page');
    render(React.createElement(LoginPage));

    expect(screen.queryByRole('button', { name: /카카오/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Google/i })).toBeNull();
  });

  it('관리자가 카카오 로그인을 활성화하면 카카오 버튼이 표시된다', async () => {
    socialConfigMock.mockReturnValue({
      data: { kakao: { enabled: true }, google: { enabled: false } },
      isLoading: false,
    });
    useActionStateMock.mockReturnValue([{ ok: true }, vi.fn(), false]);
    const { default: LoginPage } = await import('./page');
    render(React.createElement(LoginPage));

    expect(screen.getByRole('button', { name: /카카오/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Google/i })).toBeNull();
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
