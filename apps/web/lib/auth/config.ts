/**
 * Auth.js v5 NextAuth configuration — SPEC-AUTH-001 Slice C → Slice D1.
 *
 * 본 파일은 next-auth v5 (beta) 의 단일 진입점이며 Credentials Provider 의
 * `authorize()` 콜백에서 packages/auth 의 `login()` 을 호출한다. 즉, Auth.js 는
 * 세션 발급/쿠키 처리/리다이렉트만 담당하고, 실제 자격증명 검증/감사 로깅/
 * password rehash 는 `packages/auth` 가 단일 진입점으로 처리한다 (REQ-AUTH-013/14/15).
 *
 * 세션 전략 (Slice D1 update):
 *   - `session.strategy = 'jwt'` 를 유지한다 (Slice C 결정 + Slice D plan v2.0.0
 *     Path D 채택). PrismaAdapter 도입은 폐기되었다 (User.id Int 와 Auth.js Adapter
 *     string 타입 호환성 불가 — slice-d-plan.md Pre-Flight Q1 참조).
 *   - 즉시 무효화 (REQ-AUTH-020) 는 Slice D1 의 SessionRevocation denylist 와 jwt
 *     callback 의 token.iat 비교로 달성한다. admin status 변경 시 트리거 (D2) 도
 *     본 메커니즘 위에 올라간다.
 *
 * @MX:NOTE: jwt/session callback 본체는 ./callbacks 로 분리되어 단위 테스트 가능 (Slice D1).
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-020
 */

import NextAuth from 'next-auth';
// next-auth v5 beta31 + TS 5.9: NextAuthConfig not re-exported correctly; use compatible stub
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextAuthConfig = Record<string, any>;
import Credentials from 'next-auth/providers/credentials';
import Kakao from 'next-auth/providers/kakao';
import Google from 'next-auth/providers/google';

import { consumeAutoLoginMarker, login } from '@rhymix-ts/auth';
import { prisma } from '@rhymix-ts/db';

import { createJwtCallback, createSessionCallback } from './callbacks';

/**
 * Best-effort IP/User-Agent 추출 — Auth.js Credentials authorize() 의 두 번째
 * 인자는 Web Request 호환 객체이다. Next.js 16 + Auth.js v5 환경에서 헤더 케이스는
 * 모두 lowercase 이며 `x-forwarded-for` 가 우선, 부재 시 `x-real-ip` 를 사용한다.
 */
function extractClientHints(req: Request | undefined): {
  ip: string;
  userAgent: string;
} {
  const headers = req?.headers;
  const xff = headers?.get('x-forwarded-for') ?? '';
  const ip =
    xff.split(',')[0]?.trim() ||
    headers?.get('x-real-ip') ||
    '0.0.0.0';
  const userAgent = headers?.get('user-agent') ?? '';
  return { ip, userAgent };
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: {
    // Slice C deviation — see file-level JSDoc.
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 14, // 14 days (matches SPEC sketch)
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    // SPEC-SOCIAL-LOGIN-001 REQ-SOCIAL-001/002: Kakao/Google OAuth providers
    //
    // Client ID/Secret are loaded from environment variables OR admin-configurable
    // SiteSettings (REQ-SOCIAL-005). The socialAuth helper in packages/auth
    // resolves the actual values at runtime, falling back to env vars.
    //
    // @MX:NOTE: [AUTO] OAuth providers are configured via socialAuth helper.
    //   This allows admin panel to override env vars without code deployment.
    // @MX:SPEC: SPEC-SOCIAL-LOGIN-001 REQ-SOCIAL-005

    ...(async () => {
      const { socialAuth } = await import('@rhymix-ts/auth');
      const config = await socialAuth({ prisma });

      return [
        Kakao({
          clientId: config.kakao?.clientId ?? process.env.KAKAO_CLIENT_ID ?? '',
          clientSecret: config.kakao?.clientSecret ?? process.env.KAKAO_CLIENT_SECRET ?? '',
          allowDangerousAccountAccountLinking: true, // REQ-SOCIAL-004: account linking
        }),
        Google({
          clientId: config.google?.clientId ?? process.env.GOOGLE_CLIENT_ID ?? '',
          clientSecret: config.google?.clientSecret ?? process.env.GOOGLE_CLIENT_SECRET ?? '',
          allowDangerousAccountAccountLinking: true, // REQ-SOCIAL-004: account linking
        }),
      ];
    })(),

    Credentials({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Identifier', type: 'text' },
        password: { label: 'Password', type: 'password' },
        autologinUserId: { label: 'AutoLoginUserId', type: 'text' },
        autologinNonce: { label: 'AutoLoginNonce', type: 'text' },
      },
      // @MX:ANCHOR: NextAuth Credentials Provider 의 유일한 인증 진입점.
      //   autologin (Branch A, Slice H) / password (Branch B, Slice C) 두 경로가
      //   모두 본 함수를 통과해야 세션이 발급된다.
      // @MX:REASON: autologin 우회 또는 password 우회는 곧 세션 도용 — REQ-AUTH-013,
      //   REQ-AUTH-019 enforcement chain 의 최종 게이트.
      // @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-013, REQ-AUTH-019
      async authorize(credentials, req) {
        // -------------------------------------------------------------------
        // Branch A — autologin trust marker (Slice H, REQ-AUTH-019)
        //
        // Route Handler `/api/auth/autologin-refresh` 가 verifyAutoLogin 통과 후
        // signIn() 으로 본 분기를 호출한다. verifyAutoLogin 을 여기서 재호출하면
        // 같은 securityKey 가 previousKey 와 매치되어 TOKEN_THEFT 가 발동되므로,
        // one-shot in-memory marker 로만 신뢰를 전달한다.
        // -------------------------------------------------------------------
        const autologinUserIdRaw =
          typeof credentials?.autologinUserId === 'string'
            ? credentials.autologinUserId
            : '';
        const autologinNonce =
          typeof credentials?.autologinNonce === 'string'
            ? credentials.autologinNonce
            : '';

        if (autologinUserIdRaw && autologinNonce) {
          const userId = Number.parseInt(autologinUserIdRaw, 10);
          if (!Number.isFinite(userId) || userId <= 0) {
            return null;
          }
          const consumed = consumeAutoLoginMarker(userId, autologinNonce);
          if (!consumed) {
            return null;
          }
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (!user || user.status !== 'APPROVED') {
            return null;
          }
          return {
            id: String(user.id),
            name: user.nickName ?? user.emailAddress,
            email: user.emailAddress,
          };
        }

        // -------------------------------------------------------------------
        // Branch B — identifier + password (Slice C, 기존 동작 유지)
        // -------------------------------------------------------------------
        const identifier =
          typeof credentials?.identifier === 'string'
            ? credentials.identifier
            : '';
        const password =
          typeof credentials?.password === 'string' ? credentials.password : '';
        if (!identifier || !password) {
          return null;
        }
        const { ip, userAgent } = extractClientHints(req as Request);
        const result = await login(
          { identifier, password, ip, userAgent },
          { prisma, config: { passwordPolicy: 'normal' } },
        );
        if (!result.ok) {
          return null;
        }
        // Auth.js User 형태로 매핑 — passwordHash 등 비밀 필드는 노출 금지 (REQ-AUTH-005).
        return {
          id: String(result.user.id),
          name: result.user.nickName,
          email: result.user.emailAddress,
        };
      },
    }),
  ],
  callbacks: {
    /**
     * SPEC-SOCIAL-LOGIN-001: OAuth sign-in callback for account linking (REQ-SOCIAL-003/004).
     *
     * This callback is invoked during OAuth sign-in flow (Kakao/Google) AFTER the
     * user has authenticated with the provider but BEFORE a session is issued.
     *
     * Flow:
     * 1. Check if SocialAccount exists for (provider, providerAccountId) → return existing user
     * 2. If no SocialAccount, check if User exists with the same email → account linking (REQ-SOCIAL-004)
     * 3. If no existing user either, create new User + SocialAccount → new social signup (REQ-SOCIAL-003)
     *
     * @MX:ANCHOR: OAuth sign-in 계정 연결/생성의 유일한 진입점.
     * @MX:REASON: OAuth provider 인증 후 세션 발급 전에 계정 생성/연결을 결정해야 한다.
     * @MX:SPEC: SPEC-SOCIAL-LOGIN-001 REQ-SOCIAL-003, REQ-SOCIAL-004, REQ-SOCIAL-006
     */
    async signIn({ account, user, profile }: { account: Record<string, unknown> | null; user: { id?: string } | null; profile?: Record<string, unknown> | null }) {
      // Skip OAuth handling if no account info (credentials login)
      if (!account || !user?.id) {
        return true;
      }

      const provider = account.provider as string; // 'kakao' | 'google'
      const providerAccountId = account.providerAccountId as string;

      // Only handle Kakao/Google providers
      if (provider !== 'kakao' && provider !== 'google') {
        return true;
      }

      const email = (user.email as string) || (profile?.email as string) || '';
      const nickname = (user.name as string) || (profile?.name as string) || '';

      // REQ-SOCIAL-003/004: Check for existing SocialAccount or User with same email
      const userId = Number.parseInt(String(user.id), 10);

      try {
        // 1. Check if SocialAccount already exists → return existing user
        const existingSocialAccount = await prisma.socialAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider,
              providerAccountId,
            },
          },
        });

        if (existingSocialAccount) {
          // Account already linked → proceed with sign-in
          return true;
        }

        // 2. Check if User exists with same email → account linking (REQ-SOCIAL-004)
        const existingUserByEmail = email
          ? await prisma.user.findUnique({
              where: { emailAddress: email },
            })
          : null;

        if (existingUserByEmail) {
          // Create SocialAccount link to existing user (auto-link policy)
          // TODO: REQ-SOCIAL-004 requires explicit confirmation UI, but for MVP we auto-link
          // and inform via post-login toast/banner
          await prisma.socialAccount.create({
            data: {
              userId: existingUserByEmail.id,
              provider,
              providerAccountId,
            },
          });

          // Update user.id to point to the existing user
          user.id = String(existingUserByEmail.id);
          return true;
        }

        // 3. New social signup (REQ-SOCIAL-003) → create User + SocialAccount
        // Handle nickname collision (REQ-SOCIAL-003)
        let finalNickname = nickname || `user_${provider}_${providerAccountId.slice(0, 8)}`;

        // Check for nickname collision and append suffix if needed
        const existingNickname = await prisma.user.findUnique({
          where: { nickName: finalNickname },
        });

        if (existingNickname) {
          // Simple collision handling: append random suffix
          // TODO: REQ-SOCIAL-003 requires nickname picker UI; for MVP we auto-generate
          const randomSuffix = Math.floor(Math.random() * 1000);
          finalNickname = `${finalNickname}_${randomSuffix}`;
        }

        // Create new user
        const newUser = await prisma.user.create({
          data: {
            userId: `${provider}_${providerAccountId}`, // TEMP: userId 컬럼은 deprecated 예정
            emailAddress: email || `${provider}_${providerAccountId}@temp.local`, // TEMP: email 없는 경우 임시값
            passwordHash: '', // OAuth 사용자는 비밀번호 없음 (SOCIAL_USER 패밀리아?)
            nickName: finalNickname,
            status: 'APPROVED', // REQ-SOCIAL-003: 이메일 인증 없이 즉시 승인
            // OAuth 기본정보로 자동 채우기 (profile.image, etc.)
            userName: finalNickname,
          },
        });

        // Create SocialAccount link
        await prisma.socialAccount.create({
          data: {
            userId: newUser.id,
            provider,
            providerAccountId,
          },
        });

        // Update user.id to point to the new user
        user.id = String(newUser.id);
        return true;
      } catch (error) {
        // Log error but don't block sign-in (fallback to provider default behavior)
        console.error('OAuth account linking error:', error);
        return true;
      }
    },
    /**
     * /admin 경로 보호. 본 콜백은 middleware.ts 에서도 사용 가능하지만, Slice C 는
     * Auth.js 기본 미들웨어 통합만 제공하고 세분화된 RBAC 는 Slice D 에서 다룬다.
     */
    async authorized({ auth, request }: { auth: { user?: unknown } | null; request: { nextUrl: URL } }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith('/admin')) {
        return Boolean(auth?.user);
      }
      return true;
    },
    /**
     * JWT 콜백 — Slice D1 부터 SessionRevocation denylist 검사를 수행한다.
     * 자세한 정책은 ./callbacks.ts 참조.
     *
     * NextAuthConfig 의 callback 타입은 next-auth 내부 타입(JWT, AdapterUser 등)
     * 에 강하게 결합되어 있으나 본 callback factory 는 그 일부 필드만 사용하므로
     * `as unknown as ...` 캐스트로 의도적으로 넓게 매칭시킨다.
     */
    jwt: createJwtCallback({ prisma }) as unknown as NonNullable<
      NextAuthConfig['callbacks']
    >['jwt'],
    session: createSessionCallback() as unknown as NonNullable<
      NextAuthConfig['callbacks']
    >['session'],
  },
};

// next-auth v5 beta31 + TS 5.9: default import resolves as namespace; cast needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const { handlers, auth, signIn, signOut } = (NextAuth as any)(authConfig);
