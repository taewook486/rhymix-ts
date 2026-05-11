/**
 * @vitest-environment jsdom
 */

/**
 * Specification tests for Password Reset Request Page — SPEC-AUTH-001 Slice F.
 *
 * 비밀번호 재설정 요청 폼. 항상 성공 메시지를 표시한다 (REQ-AUTH-051: no disclosure).
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
  return { ...actual, useActionState: useActionStateMock, useState: useStateMock };
});

vi.mock('@/lib/auth/actions', () => ({
  requestPasswordResetAction: vi.fn().mockResolvedValue({ ok: true }),
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

describe('PasswordResetPage', () => {
  afterEach(() => {
    cleanup();
    useActionStateMock.mockReset();
    useStateMock.mockReset();
  });

  function setupNormalState() {
    useActionStateMock.mockReturnValue([{ ok: true }, vi.fn(), false]);
    useStateMock.mockReturnValue([false, vi.fn()]);
  }

  it('identifier 입력 필드를 렌더링', async () => {
    setupNormalState();
    const { default: PasswordResetPage } = await import('./page');
    render(React.createElement(PasswordResetPage));

    expect(screen.getByLabelText(/아이디|이메일/i)).toBeDefined();
  });

  it('전송 버튼을 렌더링', async () => {
    setupNormalState();
    const { default: PasswordResetPage } = await import('./page');
    render(React.createElement(PasswordResetPage));

    expect(
      screen.getByRole('button', { name: /재설정|전송|보내기/i }),
    ).toBeDefined();
  });

  it('로그인 링크를 포함', async () => {
    setupNormalState();
    const { default: PasswordResetPage } = await import('./page');
    render(React.createElement(PasswordResetPage));

    const loginLink = screen.getByRole('link', { name: /로그인/i });
    expect(loginLink).toBeDefined();
    expect(loginLink.getAttribute('href')).toBe('/login');
  });

  it('제출 후 항상 성공 메시지 표시 (REQ-AUTH-051)', async () => {
    useActionStateMock.mockReturnValue([{ ok: true }, vi.fn(), false]);
    // submitted = true
    useStateMock.mockReturnValue([true, vi.fn()]);

    const { default: PasswordResetPage } = await import('./page');
    render(React.createElement(PasswordResetPage));

    expect(screen.getByText('이메일이 전송되었습니다')).toBeDefined();
  });
});
