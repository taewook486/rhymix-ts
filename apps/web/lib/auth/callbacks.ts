/**
 * Auth.js v5 jwt/session callback factories — SPEC-AUTH-001 Slice D1.
 *
 * 본 모듈은 NextAuth 인스턴스에서 분리된 순수 callback factory 를 제공한다.
 * `config.ts` 가 본 factory 를 호출해 주입하며, 단위 테스트는 본 모듈을 직접
 * import 해서 NextAuth/Next.js 서버 의존성 없이 callback 동작을 검증한다.
 *
 * 핵심 동작 (Slice D1):
 *   - jwt callback 은 매 요청마다 `isSessionRevoked(userId, tokenIat, ctx)` 를 호출
 *   - revocation 검사가 양성이면 `null` 반환 → next-auth 가 토큰을 거부하고 세션을
 *     발급하지 않음 → 다음 요청부터 사실상 로그아웃
 *
 * Open Question 1 (token.iat 가용성) — RESOLVED:
 *   next-auth v5 의 jwt callback 에 들어오는 `token` 객체에 `iat` 가 자동 주입되는지
 *   소스/문서 상으로 명확히 보장되지 않는다. 따라서 본 factory 는 다음 fallback 을
 *   채택한다:
 *     1. token.iat 이 number 로 존재하면 그것을 신뢰 (next-auth 가 주입했다고 가정)
 *     2. 그렇지 않으면 sign-in 시점 (user 인자 존재) 에 직접 `Math.floor(Date.now()/1000)` 주입
 *     3. token.iat 이 끝까지 없는 후방 호환 토큰은 epoch (Date(0)) 로 취급해 어떠한
 *        revocation 도 그것을 무효화하도록 한다
 *   이 정책은 token.iat 자동 주입 여부와 무관하게 안전한 enforcement 를 제공한다.
 *
 * @MX:ANCHOR: jwt/session callback 의 단일 정의 지점 — Slice D2 admin RBAC 도 본 함수에 isAdmin/groups 클레임을 확장한다.
 * @MX:REASON: revocation 검사 + token augmentation 이 한 곳에 모여야 우회로가 생기지 않는다 (REQ-AUTH-020 fast-path).
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-020
 */

import type { PrismaClient } from '@rhymix-ts/db';

import { isSessionRevoked as defaultIsSessionRevoked } from '@rhymix-ts/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CallbackDeps {
  prisma: PrismaClient;
  /**
   * Test 에서 in-memory 구현으로 대체 가능. 미지정 시 packages/auth 의
   * production 구현을 사용한다.
   */
  isSessionRevoked?: (
    userId: number,
    tokenIssuedAt: Date,
    ctx: { prisma: PrismaClient },
  ) => Promise<boolean>;
}

interface JwtCallbackArgs {
  token: Record<string, unknown>;
  user?: { id?: string } | null;
}

interface SessionCallbackArgs {
  session: { user?: { id?: string } } | null;
  token: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// jwt callback factory
// ---------------------------------------------------------------------------

export function createJwtCallback(deps: CallbackDeps) {
  const isRevoked = deps.isSessionRevoked ?? defaultIsSessionRevoked;

  return async function jwt(
    args: JwtCallbackArgs,
  ): Promise<Record<string, unknown> | null> {
    const { token, user } = args;

    // 초기 sign-in: user 객체가 들어온다. token 에 sub 와 iat 를 주입한다.
    if (user && user.id) {
      token.sub = user.id;
      // next-auth 가 자체적으로 iat 를 주입하지 않는 환경에 대비한 fallback.
      // 이미 number 로 들어왔다면 보존, 아니면 현재 시각으로 설정.
      if (typeof token.iat !== 'number') {
        token.iat = Math.floor(Date.now() / 1000);
      }
      return token;
    }

    // 후속 요청: revocation 검사를 수행한다.
    const sub = token.sub;
    if (typeof sub !== 'string') {
      // sub 미존재 (anonymous request 또는 비-인증 흐름) — 검사 없이 통과.
      return token;
    }

    const userId = Number.parseInt(sub, 10);
    if (!Number.isFinite(userId) || userId <= 0) {
      // sub 가 숫자가 아닌 경우 (malformed): 방어적으로 토큰 거부.
      return null;
    }

    // tokenIat 결정 — number 면 그것을, 아니면 epoch 으로 fallback (후방 호환).
    const iatRaw = token.iat;
    const tokenIat =
      typeof iatRaw === 'number' ? new Date(iatRaw * 1000) : new Date(0);

    const revoked = await isRevoked(userId, tokenIat, { prisma: deps.prisma });
    if (revoked) {
      return null;
    }
    return token;
  };
}

// ---------------------------------------------------------------------------
// session callback factory
// ---------------------------------------------------------------------------

export function createSessionCallback() {
  return async function session(
    args: SessionCallbackArgs,
  ): Promise<{ user?: { id?: string } } | null> {
    const { session, token } = args;
    if (!session) {
      return session;
    }
    if (!token || typeof token.sub !== 'string') {
      // jwt callback 이 null 을 반환하면 token 도 falsy 한 형태로 들어온다 — short-circuit.
      // session.user.id 를 비워둔다 (사실상 로그아웃 상태).
      return session;
    }
    if (session.user) {
      session.user.id = token.sub;
    }
    return session;
  };
}
