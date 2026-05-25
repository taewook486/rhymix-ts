/**
 * Auth.js v5 configuration skeleton (SPEC-AUTH-001).
 *
 * Full provider configuration (Argon2id verification, multi-identifier
 * login, password upgrade-on-login) lands during /moai run SPEC-AUTH-001.
 */
// next-auth v5 beta31 + TS 5.9: NextAuthConfig not re-exported correctly; use compatible stub
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextAuthConfig = Record<string, any>;

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
    async authorized({ auth, request }: { auth: { user?: unknown } | null; request: { nextUrl: URL } }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith('/admin')) {
        return Boolean(auth?.user);
      }
      return true;
    },
  },
};

export type AuthConfig = typeof authConfig;
