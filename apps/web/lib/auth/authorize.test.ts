/**
 * Specification tests for NextAuth Credentials authorize() — SPEC-AUTH-001 Slice H.
 *
 * authorize() 는 두 경로를 가진다:
 *   - Branch A (Slice H): autologinUserId + autologinNonce → consumeAutoLoginMarker
 *     로 trust marker 를 one-shot 소비한 후 user lookup 만 수행.
 *   - Branch B (기존): identifier + password → packages/auth login() 호출.
 *
 * 본 테스트는 Branch A 의 분기 동작과 Branch B 회귀를 검증한다.
 *
 * H-1: autologinUserId + 유효 nonce → user mapping 반환
 * H-2: autologinUserId 만 (nonce 누락) → null
 * H-3: 유효 nonce + user.status !== 'APPROVED' → null
 * H-3-회귀: identifier + password 경로 — login() 호출되어 결과 매핑
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

const {
  consumeAutoLoginMarkerMock,
  loginMock,
  prismaUserFindUniqueMock,
} = vi.hoisted(() => ({
  consumeAutoLoginMarkerMock: vi.fn(),
  loginMock: vi.fn(),
  prismaUserFindUniqueMock: vi.fn(),
}));

vi.mock('@rhymix-ts/auth', () => ({
  // Branch B
  login: loginMock,
  // Branch A
  consumeAutoLoginMarker: consumeAutoLoginMarkerMock,
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    user: { findUnique: prismaUserFindUniqueMock },
  },
}));

// Auth.js NextAuth 인스턴스 부수효과를 피하기 위해 next-auth 자체를 흉내낸다.
// authConfig 만 import 하면 NextAuth() 가 실행되므로, 그 결과는 무시한다.
vi.mock('next-auth', () => {
  return {
    default: (_config: unknown) => ({
      handlers: {},
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    }),
  };
});

vi.mock('next-auth/providers/credentials', () => ({
  default: (config: unknown) => config,
}));

// callbacks.ts 도 가벼운 stub.
vi.mock('./callbacks', () => ({
  createJwtCallback: () => vi.fn(),
  createSessionCallback: () => vi.fn(),
}));

// ---------------------------------------------------------------------------
// SUT import (must be after vi.mock)
// ---------------------------------------------------------------------------

import { authConfig } from './config';

// authConfig.providers[0] 가 Credentials() 의 config 그대로 반환되므로
// authorize 함수에 직접 접근 가능.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const provider = (authConfig.providers as any[])[0];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authorize: (
  credentials: Record<string, unknown> | undefined,
  req?: Request,
) => Promise<unknown> = provider.authorize;

function makeReq(): Request {
  return new Request('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'x-forwarded-for': '203.0.113.7',
      'user-agent': 'vitest-ua',
    },
  });
}

describe('authConfig.providers[0].authorize — Slice H', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // H-1: autologin Branch A — 유효 nonce → user mapping
  // -------------------------------------------------------------------------
  it('H-1: returns user mapping when autologinUserId + valid nonce + APPROVED user', async () => {
    consumeAutoLoginMarkerMock.mockReturnValue(true);
    prismaUserFindUniqueMock.mockResolvedValue({
      id: 42,
      emailAddress: 'alice@example.com',
      nickName: 'alice',
      status: 'APPROVED',
    });

    const result = await authorize(
      { autologinUserId: '42', autologinNonce: 'good-nonce' },
      makeReq(),
    );

    expect(result).toEqual({
      id: '42',
      name: 'alice',
      email: 'alice@example.com',
    });
    expect(consumeAutoLoginMarkerMock).toHaveBeenCalledWith(42, 'good-nonce');
    expect(prismaUserFindUniqueMock).toHaveBeenCalledWith({
      where: { id: 42 },
    });
    // 핵심: verifyAutoLogin/login 둘 다 호출되어선 안 된다.
    expect(loginMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // H-2: nonce 누락 → null (consume 시도조차 하지 않음)
  // -------------------------------------------------------------------------
  it('H-2: returns null when autologinUserId present but nonce missing', async () => {
    const result = await authorize(
      { autologinUserId: '42' },
      makeReq(),
    );
    expect(result).toBeNull();
    expect(consumeAutoLoginMarkerMock).not.toHaveBeenCalled();
    expect(loginMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // H-2b: consume 실패 → null (재사용 / 위조 시도)
  // -------------------------------------------------------------------------
  it('H-2b: returns null when marker consume returns false (replay/forgery)', async () => {
    consumeAutoLoginMarkerMock.mockReturnValue(false);

    const result = await authorize(
      { autologinUserId: '42', autologinNonce: 'stale-nonce' },
      makeReq(),
    );
    expect(result).toBeNull();
    expect(consumeAutoLoginMarkerMock).toHaveBeenCalledTimes(1);
    expect(prismaUserFindUniqueMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // H-3: 유효 nonce + status !== APPROVED → null
  // -------------------------------------------------------------------------
  it('H-3: returns null when user is not APPROVED', async () => {
    consumeAutoLoginMarkerMock.mockReturnValue(true);
    prismaUserFindUniqueMock.mockResolvedValue({
      id: 42,
      emailAddress: 'bob@example.com',
      nickName: 'bob',
      status: 'SUSPENDED',
    });

    const result = await authorize(
      { autologinUserId: '42', autologinNonce: 'good-nonce' },
      makeReq(),
    );
    expect(result).toBeNull();
  });

  it('H-3b: returns null when user not found', async () => {
    consumeAutoLoginMarkerMock.mockReturnValue(true);
    prismaUserFindUniqueMock.mockResolvedValue(null);

    const result = await authorize(
      { autologinUserId: '42', autologinNonce: 'good-nonce' },
      makeReq(),
    );
    expect(result).toBeNull();
  });

  it('H-3c: returns null when autologinUserId is not a positive integer', async () => {
    const result = await authorize(
      { autologinUserId: 'abc', autologinNonce: 'good' },
      makeReq(),
    );
    expect(result).toBeNull();
    expect(consumeAutoLoginMarkerMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // H-3 회귀: Branch B — identifier + password 경로 동작 유지
  // -------------------------------------------------------------------------
  it('H-3-regression: identifier + password path delegates to login() and maps result', async () => {
    loginMock.mockResolvedValue({
      ok: true,
      user: { id: 7, emailAddress: 'eve@example.com', nickName: 'eve' },
    });

    const result = await authorize(
      { identifier: 'eve@example.com', password: 'pw' },
      makeReq(),
    );

    expect(result).toEqual({
      id: '7',
      name: 'eve',
      email: 'eve@example.com',
    });
    expect(loginMock).toHaveBeenCalledTimes(1);
    // 핵심: autologin 분기는 호출되지 않아야 한다.
    expect(consumeAutoLoginMarkerMock).not.toHaveBeenCalled();
    expect(prismaUserFindUniqueMock).not.toHaveBeenCalled();
  });

  it('H-3-regression-b: identifier + password path returns null on login failure', async () => {
    loginMock.mockResolvedValue({ ok: false, code: 'INVALID_CREDENTIALS' });

    const result = await authorize(
      { identifier: 'eve@example.com', password: 'wrong' },
      makeReq(),
    );

    expect(result).toBeNull();
  });
});
