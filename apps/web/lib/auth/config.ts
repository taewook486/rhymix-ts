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

import { consumeAutoLoginMarker, login, socialAuth } from '@rhymix-ts/auth';
import { prisma } from '@rhymix-ts/db';

import { createJwtCallback, createSessionCallback, createSignInCallback } from './callbacks';
import { resolveDefaultSiteId } from './site';

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
  const ip = xff.split(',')[0]?.trim() || headers?.get('x-real-ip') || '0.0.0.0';
  const userAgent = headers?.get('user-agent') ?? '';
  return { ip, userAgent };
}

// SPEC-SOCIAL-LOGIN-001 REQ-SOCIAL-005: Credentials provider는 소셜 로그인 설정과
// 무관하게 항상 활성화되므로 별도 상수로 분리한다 — authorize.test.ts가 NextAuth()
// 전체를 거치지 않고 authorize() 콜백만 직접 단위 테스트하기 위해 이 상수를 import한다.
export const credentialsProvider = Credentials({
  name: 'credentials',
  credentials: {
    identifier: { label: 'Identifier', type: 'text' },
    password: { label: 'Password', type: 'password' },
    autologinUserId: { label: 'AutoLoginUserId', type: 'text' },
    autologinNonce: { label: 'AutoLoginNonce', type: 'text' },
    // ISSUE #1 FIX: captchaToken 필드 추가 (Turnstile 위젯에서 전송)
    captchaToken: { label: 'CaptchaToken', type: 'text' },
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
      typeof credentials?.autologinUserId === 'string' ? credentials.autologinUserId : '';
    const autologinNonce =
      typeof credentials?.autologinNonce === 'string' ? credentials.autologinNonce : '';

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
    const identifier = typeof credentials?.identifier === 'string' ? credentials.identifier : '';
    const password = typeof credentials?.password === 'string' ? credentials.password : '';
    if (!identifier || !password) {
      return null;
    }
    const { ip, userAgent } = extractClientHints(req as Request);

    // ISSUE #1 FIX: captchaToken 추출
    const captchaToken =
      typeof credentials?.captchaToken === 'string' ? credentials.captchaToken : undefined;

    // ISSUE #1 FIX: SiteSettings에서 CAPTCHA 설정 동적으로 로드
    // SPEC-MEMBER-ADMIN-001 REQ-MADM-027: 자동 재해싱 토글도 함께 로드한다.
    const siteId = await resolveDefaultSiteId(prisma);
    const [captchaLoginEnabled, captchaSecretKey, captchaThreshold, autoRehashSetting] =
      await Promise.all([
        prisma.siteSetting.findUnique({
          where: { siteId_key: { siteId, key: 'security.captcha.login.enabled' } },
        }),
        prisma.siteSetting.findUnique({
          where: { siteId_key: { siteId, key: 'security.captcha.turnstile.secretKey' } },
        }),
        prisma.siteSetting.findUnique({
          where: { siteId_key: { siteId, key: 'security.login.captchaThreshold' } },
        }),
        prisma.siteSetting.findUnique({
          where: { siteId_key: { siteId, key: 'security.password.autoRehashEnabled' } },
        }),
      ]);

    const captchaEnabled = Boolean(captchaLoginEnabled?.value) && Boolean(captchaSecretKey?.value);

    const result = await login(
      { identifier, password, ip, userAgent, captchaToken },
      {
        prisma,
        config: {
          passwordPolicy: 'normal',
          // ISSUE #1 FIX: CAPTCHA 설정 주입
          captchaEnabled,
          captchaSecretKey: captchaSecretKey?.value as string,
          captchaThreshold: (captchaThreshold?.value as number) ?? 5,
          // REQ-MADM-027: 미지정 시 기존 동작(켜짐) 유지.
          autoRehashEnabled: (autoRehashSetting?.value as boolean | undefined) ?? true,
        },
      },
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
});

/**
 * proxy.ts 전용 정적 설정 — 세션 판독(auth())과 /admin 라우트 보호에만 쓰인다.
 * Kakao/Google Provider는 포함하지 않는다: 실제 OAuth 핸드셰이크는 handlers를
 * 통해서만 /api/auth/* 에서 일어나고, proxy.ts는 handlers를 export하지 않는다.
 * 정적 객체로 유지해 사이트 전체 요청 경로(proxy.ts)에 소셜 자격증명 조회용
 * DB 부하를 추가로 지우지 않는다.
 */
export const baseAuthConfig: NextAuthConfig = {
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
  providers: [credentialsProvider],
  callbacks: {
    /**
     * SPEC-SOCIAL-LOGIN-001: OAuth sign-in callback for account linking.
     * Body factored out to ./callbacks (createSignInCallback) for unit testability,
     * matching the jwt/session callback pattern (Slice D1).
     */
    signIn: createSignInCallback({ prisma }) as unknown as NonNullable<
      NextAuthConfig['callbacks']
    >['signIn'],
    /**
     * /admin 경로 보호. 본 콜백은 middleware.ts 에서도 사용 가능하지만, Slice C 는
     * Auth.js 기본 미들웨어 통합만 제공하고 세분화된 RBAC 는 Slice D 에서 다룬다.
     */
    async authorized({
      auth,
      request,
    }: {
      auth: { user?: unknown } | null;
      request: { nextUrl: URL };
    }) {
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

/**
 * SPEC-SOCIAL-LOGIN-001 REQ-SOCIAL-005: /api/auth/* 요청마다 socialAuth()로 관리자
 * 설정(SiteSetting)에서 최신 카카오/구글 Client ID/Secret을 읽어와 providers를
 * 구성한다 — 재배포 없이 자격증명을 바꿀 수 있다 (이전에는 process.env에 고정).
 * next-auth v5 의 async config-factory 패턴(`NextAuth(async () => config)`)을
 * 사용해 매 요청마다 이 함수가 재평가된다.
 */
async function buildAuthConfig(): Promise<NextAuthConfig> {
  const social = await socialAuth({ prisma });

  const socialProviders: NextAuthConfig['providers'] = [];
  if (social.kakao) {
    socialProviders.push(
      Kakao({
        clientId: social.kakao.clientId ?? '',
        clientSecret: social.kakao.clientSecret ?? '',
      }),
    );
  }
  if (social.google) {
    socialProviders.push(
      Google({
        clientId: social.google.clientId ?? '',
        clientSecret: social.google.clientSecret ?? '',
      }),
    );
  }

  return { ...baseAuthConfig, providers: [...socialProviders, credentialsProvider] };
}

// next-auth v5 beta31 + TS 5.9: default import resolves as namespace; cast needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const { handlers, auth, signIn, signOut } = (NextAuth as any)(buildAuthConfig);
