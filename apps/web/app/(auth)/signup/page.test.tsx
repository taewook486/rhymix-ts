/**
 * @vitest-environment jsdom
 */

/**
 * Specification tests for Signup Page — SPEC-AUTH-001 Slice F.
 *
 * SignupForm 컴포넌트의 렌더링 및 에러 상태를 검증한다.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { useActionStateMock, useStateMock } = vi.hoisted(() => ({
  useActionStateMock: vi.fn(),
  useStateMock: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof React>();
  return {
    ...actual,
    useActionState: useActionStateMock,
    useState: useStateMock,
    useRef: actual.useRef,
  };
});

vi.mock('@/lib/auth/actions', () => ({
  signupAction: vi.fn().mockResolvedValue({ ok: true }),
  initialAuthActionState: { ok: true },
}));

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode; className?: string }) => {
    const { href, children, ...rest } = props;
    return React.createElement('a', { href, ...rest }, children);
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SignupPage', () => {
  afterEach(() => {
    cleanup();
    useActionStateMock.mockReset();
    useStateMock.mockReset();
  });

  function setupNormalState() {
    useActionStateMock.mockReturnValue([{ ok: true }, vi.fn(), false]);
    // useState: submitted = false, setSubmitted = noop
    useStateMock.mockReturnValue([false, vi.fn()]);
  }

  it('userId, email, password, nickName 입력 필드를 렌더링', async () => {
    setupNormalState();
    const { default: SignupPage } = await import('./page');
    render(React.createElement(SignupPage));

    expect(screen.getByLabelText(/아이디/i)).toBeDefined();
    expect(screen.getByLabelText(/이메일/i)).toBeDefined();
    expect(screen.getByLabelText(/비밀번호/i)).toBeDefined();
    expect(screen.getByLabelText(/닉네임/i)).toBeDefined();
  });

  it('회원가입 버튼을 렌더링', async () => {
    setupNormalState();
    const { default: SignupPage } = await import('./page');
    render(React.createElement(SignupPage));

    expect(screen.getByRole('button', { name: /회원가입/i })).toBeDefined();
  });

  it('로그인 링크를 포함', async () => {
    setupNormalState();
    const { default: SignupPage } = await import('./page');
    render(React.createElement(SignupPage));

    const loginLink = screen.getByRole('link', { name: /로그인/i });
    expect(loginLink).toBeDefined();
    expect(loginLink.getAttribute('href')).toBe('/login');
  });

  it('에러 상태일 때 에러 메시지 표시', async () => {
    useActionStateMock.mockReturnValue([
      { ok: false, formError: '이미 사용 중인 아이디 또는 이메일입니다.' },
      vi.fn(),
      false,
    ]);
    useStateMock.mockReturnValue([false, vi.fn()]);

    const { default: SignupPage } = await import('./page');
    render(React.createElement(SignupPage));

    expect(
      screen.getByText('이미 사용 중인 아이디 또는 이메일입니다.'),
    ).toBeDefined();
  });

  it('성공 제출 후 이메일 확인 메시지 표시', async () => {
    useActionStateMock.mockReturnValue([{ ok: true }, vi.fn(), false]);
    // submitted = true
    useStateMock.mockReturnValue([true, vi.fn()]);

    const { default: SignupPage } = await import('./page');
    render(React.createElement(SignupPage));

    expect(screen.getByText(/이메일을 확인/i)).toBeDefined();
  });
});
