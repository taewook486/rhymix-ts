/**
 * Auth.js v5 NextAuth configuration — SPEC-AUTH-001 Slice C.
 *
 * 본 파일은 next-auth v5 (beta) 의 단일 진입점이며 Credentials Provider 의
 * `authorize()` 콜백에서 packages/auth 의 `login()` 을 호출한다. 즉, Auth.js 는
 * 세션 발급/쿠키 처리/리다이렉트만 담당하고, 실제 자격증명 검증/감사 로깅/
 * password rehash 는 `packages/auth` 가 단일 진입점으로 처리한다 (REQ-AUTH-013/14/15).
 *
 * Slice C 의 세션 전략 (deviation):
 *   - 본 슬라이스에서는 `session.strategy = 'jwt'` 를 사용한다.
 *   - SPEC L546 / REQ-AUTH-020 은 즉시 무효화를 위해 database 세션을 요구하지만,
 *     PrismaAdapter 는 `Account` / `Session` / `VerificationToken` Prisma 모델을
 *     필요로 하며 이는 현재 schema.prisma 에 존재하지 않는다 (Slice A 가 정의한
 *     스키마에는 Auth.js 어댑터용 모델이 없다). 스키마 확장은 escalation 대상이라
 *     본 슬라이스에서는 도입하지 않는다 — REQ-AUTH-020 (admin status change → session
 *     revocation) 자체가 Slice D 의 책임이므로 그 시점에 함께 추가한다.
 *   - JWT 전략에서도 `signOut()` + 쿠키 만료 변경으로 즉시 무효화 효과를 얻을 수 있으나,
 *     관리자가 외부에서 강제 무효화하려면 database 세션이 필요하다는 SPEC 의 결정이 정확.
 *
 * @MX:NOTE: PrismaAdapter 도입은 Slice D 에서 — Account/Session/VerificationToken 모델 추가와 함께.
 */

import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { login } from '@rhymix-ts/auth';
import { prisma } from '@rhymix-ts/db';

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
    Credentials({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Identifier', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
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
     * /admin 경로 보호. 본 콜백은 middleware.ts 에서도 사용 가능하지만, Slice C 는
     * Auth.js 기본 미들웨어 통합만 제공하고 세분화된 RBAC 는 Slice D 에서 다룬다.
     */
    async authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith('/admin')) {
        return Boolean(auth?.user);
      }
      return true;
    },
    /**
     * JWT 토큰에 추가 클레임을 실어 보낸다 (현재는 id 만 반영).
     * Slice D 에서 isAdmin / groups 클레임 추가 예정.
     */
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
