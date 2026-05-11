/**
 * @vitest-environment jsdom
 */

/**
 * Specification tests for Password Reset Confirm Page — SPEC-AUTH-001 Slice F.
 *
 * URL 의 token 파라미터를 읽어 비밀번호 재설정을 확인하는 폼.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { useSearchParamsMock, useActionStateMock } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
  useActionStateMock: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof React>();
  return { ...actual, useActionState: useActionStateMock };
});

vi.mock('next/navigation', () => ({
  useSearchParams: useSearchParamsMock,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock('@/lib/auth/actions', () => ({
  confirmPasswordResetAction: vi.fn(),
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

describe('PasswordResetConfirmPage', () => {
  afterEach(() => {
    cleanup();
    useActionStateMock.mockReset();
    useSearchParamsMock.mockReset();
  });

  it('토큰 없이 접근하면 에러 메시지 표시', async () => {
    useActionStateMock.mockReturnValue([{ ok: true }, vi.fn(), false]);
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === 'token' ? null : null),
    });

    const { default: ConfirmPage } = await import('./page');
    render(React.createElement(ConfirmPage));

    expect(screen.getByText(/유효하지 않/i)).toBeDefined();
  });

  it('토큰 있을 때 새 비밀번호 입력 필드를 렌더링', async () => {
    useActionStateMock.mockReturnValue([{ ok: true }, vi.fn(), false]);
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === 'token' ? 'valid-token' : null),
    });

    const { default: ConfirmPage } = await import('./page');
    render(React.createElement(ConfirmPage));

    expect(screen.getByLabelText(/비밀번호/i)).toBeDefined();
  });

  it('제출 버튼을 렌더링', async () => {
    useActionStateMock.mockReturnValue([{ ok: true }, vi.fn(), false]);
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === 'token' ? 'valid-token' : null),
    });

    const { default: ConfirmPage } = await import('./page');
    render(React.createElement(ConfirmPage));

    expect(
      screen.getByRole('button', { name: /재설정|변경|확인/i }),
    ).toBeDefined();
  });

  it('에러 상태일 때 에러 메시지 표시', async () => {
    useActionStateMock.mockReturnValue([
      { ok: false, formError: '비밀번호가 너무 약합니다.' },
      vi.fn(),
      false,
    ]);
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === 'token' ? 'valid-token' : null),
    });

    const { default: ConfirmPage } = await import('./page');
    render(React.createElement(ConfirmPage));

    expect(
      screen.getByText('비밀번호가 너무 약합니다.'),
    ).toBeDefined();
  });
});
