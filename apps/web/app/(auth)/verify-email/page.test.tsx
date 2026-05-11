/**
 * @vitest-environment jsdom
 */

/**
 * Specification tests for Verify Email Page — SPEC-AUTH-001 Slice F.
 *
 * verify-email 은 Server Component 이다. searchParams 에서 token 을 읽어
 * 직접 verifyEmail 도메인 함수를 호출한다.
 * Server Component 는 async 함수이므로 직접 호출하여 JSX 리턴값을 렌더링한다.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { verifyEmailMock } = vi.hoisted(() => ({
  verifyEmailMock: vi.fn(),
}));

vi.mock('@rhymix-ts/auth', () => ({
  verifyEmail: verifyEmailMock,
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: { __mock: true },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VerifyEmailPage', () => {
  afterEach(() => {
    cleanup();
    verifyEmailMock.mockReset();
  });

  it('토큰 없이 접근하면 에러 메시지 표시', async () => {
    const { default: VerifyEmailPage } = await import('./page');
    const element = await VerifyEmailPage({
      searchParams: Promise.resolve({}),
    });
    render(element as React.ReactElement);

    expect(screen.getByText(/잘못된 접근/i)).toBeDefined();
  });

  it('유효한 토큰 → 인증 성공 메시지 표시', async () => {
    verifyEmailMock.mockResolvedValue({ ok: true });

    const { default: VerifyEmailPage } = await import('./page');
    const element = await VerifyEmailPage({
      searchParams: Promise.resolve({ token: 'valid-token' }),
    });
    render(element as React.ReactElement);

    expect(screen.getByText(/인증.*완료/i)).toBeDefined();
  });

  it('만료된 토큰 → 에러 메시지 표시', async () => {
    verifyEmailMock.mockResolvedValue({ ok: false, code: 'TOKEN_EXPIRED' });

    const { default: VerifyEmailPage } = await import('./page');
    const element = await VerifyEmailPage({
      searchParams: Promise.resolve({ token: 'expired-token' }),
    });
    render(element as React.ReactElement);

    expect(screen.getByText(/만료/i)).toBeDefined();
  });

  it('잘못된 토큰 → 에러 메시지 표시', async () => {
    verifyEmailMock.mockResolvedValue({ ok: false, code: 'TOKEN_INVALID' });

    const { default: VerifyEmailPage } = await import('./page');
    const element = await VerifyEmailPage({
      searchParams: Promise.resolve({ token: 'invalid-token' }),
    });
    render(element as React.ReactElement);

    expect(screen.getByText(/유효하지 않/i)).toBeDefined();
  });
});
