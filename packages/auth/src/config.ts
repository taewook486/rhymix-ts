/**
 * Auth.js v5 configuration skeleton (SPEC-AUTH-001).
 *
 * Full provider configuration (Argon2id verification, multi-identifier
 * login, password upgrade-on-login) lands during /moai run SPEC-AUTH-001.
 */
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    // Credentials provider added during /moai run SPEC-AUTH-001
  ],
  callbacks: {
    async authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith('/admin')) {
        return Boolean(auth?.user);
      }
      return true;
    },
  },
};

export type AuthConfig = typeof authConfig;
