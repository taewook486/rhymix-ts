/**
 * Tests for Auth.js v5 jwt/session callbacks — SPEC-AUTH-001 Slice D1.
 *
 * Slice D1 의 핵심: jwt callback 이 매 요청마다 SessionRevocation 을 조회해
 * 토큰 발급 시각이 최신 revocation 시각보다 이전이면 토큰을 거부한다.
 *
 * 본 테스트는 callback 함수의 입출력을 직접 검증한다 (NextAuth 인스턴스 자체는
 * Next.js 서버 환경 의존성 때문에 단위 테스트가 어렵다 — 그래서 callback 들은
 * `./callbacks` 모듈에 의존성 주입 가능한 factory 형태로 분리되어 있다).
 *
 * Coverage:
 *   - jwt callback 의 토큰 augmentation (iat 주입)
 *   - jwt callback 의 token rejection (revocation 발생 시 null 반환)
 *   - session callback 의 short-circuit
 *   - 후방 호환: 구버전 토큰 (iat 부재) 처리
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createJwtCallback,
  createSessionCallback,
} from './callbacks';

const isSessionRevokedMock = vi.fn(
  async (
    _userId: number,
    _tokenIssuedAt: Date,
    _ctx: { prisma: unknown },
  ): Promise<boolean> => false,
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakePrisma = { __mock: true } as any;

beforeEach(() => {
  isSessionRevokedMock.mockReset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface JwtCb {
  (args: { token: Record<string, unknown>; user?: { id: string } }): Promise<
    Record<string, unknown> | null
  >;
}
interface SessionCb {
  (args: {
    session: { user?: { id?: string } } | null;
    token: Record<string, unknown> | null;
  }): Promise<unknown>;
}

function makeJwtCb(): JwtCb {
  return createJwtCallback({
    prisma: fakePrisma,
    isSessionRevoked: isSessionRevokedMock,
  }) as unknown as JwtCb;
}
function makeSessionCb(): SessionCb {
  return createSessionCallback() as unknown as SessionCb;
}

const jwtCb = makeJwtCb();
const sessionCb = makeSessionCb();

// ---------------------------------------------------------------------------
// jwt callback
// ---------------------------------------------------------------------------

describe('authConfig.callbacks.jwt — Slice D1 revocation gate', () => {
  it('1) initial sign-in: augments token with iat (or compatible field) for later comparison', async () => {
    const before = Math.floor(Date.now() / 1000);
    const result = (await jwtCb({
      token: {},
      user: { id: '42' },
    })) as Record<string, unknown> | null;
    const after = Math.floor(Date.now() / 1000);

    expect(result).not.toBeNull();
    expect(result!.sub).toBe('42');
    // iat 필드가 token 에 주입되어야 한다 (next-auth 가 자체 주입하지 않을 경우 fallback).
    expect(typeof result!.iat).toBe('number');
    expect(result!.iat).toBeGreaterThanOrEqual(before);
    expect(result!.iat).toBeLessThanOrEqual(after + 1);
  });

  it('2) subsequent request with revoked session → returns null (token rejected)', async () => {
    isSessionRevokedMock.mockResolvedValue(true);

    const result = await jwtCb({
      token: { sub: '42', iat: Math.floor(Date.now() / 1000) - 3600 },
    });

    expect(result).toBeNull();
    expect(isSessionRevokedMock).toHaveBeenCalledTimes(1);
    const [userIdArg, tokenIatArg] = isSessionRevokedMock.mock.calls[0]!;
    expect(userIdArg).toBe(42);
    expect(tokenIatArg).toBeInstanceOf(Date);
  });

  it('3) subsequent request without revocation → returns the same token', async () => {
    isSessionRevokedMock.mockResolvedValue(false);

    const inputToken = { sub: '42', iat: Math.floor(Date.now() / 1000) };
    const result = (await jwtCb({ token: { ...inputToken } })) as Record<
      string,
      unknown
    > | null;

    expect(result).not.toBeNull();
    expect(result!.sub).toBe('42');
    expect(result!.iat).toBe(inputToken.iat);
  });

  it('4) backward compatibility: token without iat → treated as iat=0 (any past revocation invalidates it)', async () => {
    // 정책: iat 미존재 토큰은 D1 배포 이전 발급분이므로 보수적으로 무효화 가능 상태로 취급.
    // 단, 어떤 revocation 도 없다면 통과해야 한다 (false 가 들어왔을 때).
    isSessionRevokedMock.mockResolvedValue(false);
    const result = await jwtCb({ token: { sub: '42' } });
    expect(result).not.toBeNull();
    expect(isSessionRevokedMock).toHaveBeenCalledTimes(1);
    const [, tokenIatArg] = isSessionRevokedMock.mock.calls[0]!;
    // iat=0 (epoch) — 어떤 revocation 이라도 발생했다면 invalidate 됨.
    expect(tokenIatArg).toEqual(new Date(0));
  });

  it('5) malformed sub (non-numeric) → returns null defensively', async () => {
    const result = await jwtCb({
      token: { sub: 'not-a-number', iat: 1234 },
    });
    expect(result).toBeNull();
    // isSessionRevoked 가 호출되어선 안 된다 (잘못된 입력은 단락).
    expect(isSessionRevokedMock).not.toHaveBeenCalled();
  });

  it('6) no sub at all (anonymous request) → passes through without revocation check', async () => {
    const result = (await jwtCb({ token: {} })) as Record<
      string,
      unknown
    > | null;
    expect(result).not.toBeNull();
    expect(isSessionRevokedMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// session callback
// ---------------------------------------------------------------------------

describe('authConfig.callbacks.session — Slice D1', () => {
  it('7) token=null (jwt callback returned null) → session is also null/empty', async () => {
    // next-auth 가 jwt callback 의 null 반환을 받으면 token 자체가 falsy 한 상태로
    // session callback 에 들어온다. 그 경우 session.user 는 비어있어야 한다.
    const session = { user: {} };
    const result = (await sessionCb({ session, token: null })) as {
      user?: { id?: string };
    };
    expect(result.user?.id).toBeUndefined();
  });

  it('8) valid token with sub → session.user.id is populated', async () => {
    const session = { user: {} };
    const result = (await sessionCb({
      session,
      token: { sub: '42', iat: Math.floor(Date.now() / 1000) },
    })) as { user?: { id?: string } };
    expect(result.user?.id).toBe('42');
  });
});
