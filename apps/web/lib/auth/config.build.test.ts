/**
 * buildAuthConfig() 테스트 — SPEC-SOCIAL-LOGIN-001 REQ-SOCIAL-005.
 *
 * 매 /api/auth/* 요청마다 socialAuth()가 돌려주는 관리자 설정(SiteSetting)
 * 기반 카카오/구글 자격증명이 providers 배열에 실제로 반영되는지 검증한다.
 * (재배포 없이 자격증명을 바꿀 수 있어야 한다는 요구사항의 핵심 로직)
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSocialAuth } = vi.hoisted(() => ({
  mockSocialAuth: vi.fn(),
}));

vi.mock('@rhymix-ts/auth', () => ({
  login: vi.fn(),
  consumeAutoLoginMarker: vi.fn(),
  socialAuth: mockSocialAuth,
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: { __mock: true },
}));

// buildAuthConfig는 export되지 않으므로, NextAuth(factory)의 factory 인자를 가로채
// 직접 호출해 검증한다. next-auth 자체는 부수효과를 피하기 위해 흉내낸다.
type AuthConfigFactory = () => Promise<{
  providers: Array<{ id: string; clientId?: string; clientSecret?: string }>;
}>;

const capturedFactories: AuthConfigFactory[] = [];
vi.mock('next-auth', () => ({
  default: (config: unknown) => {
    capturedFactories.push(config as AuthConfigFactory);
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));

// 실제 provider 팩토리 내부 shape에 의존하지 않도록 pass-through mock — authorize.test.ts와 동일 패턴.
vi.mock('next-auth/providers/credentials', () => ({
  default: (config: unknown) => ({ ...(config as object), id: 'credentials' }),
}));
vi.mock('next-auth/providers/kakao', () => ({
  default: (config: unknown) => ({ ...(config as object), id: 'kakao' }),
}));
vi.mock('next-auth/providers/google', () => ({
  default: (config: unknown) => ({ ...(config as object), id: 'google' }),
}));

vi.mock('./callbacks', () => ({
  createJwtCallback: () => vi.fn(),
  createSessionCallback: () => vi.fn(),
  createSignInCallback: () => vi.fn(),
}));

describe('buildAuthConfig — SPEC-SOCIAL-LOGIN-001 REQ-SOCIAL-005', () => {
  let factory: AuthConfigFactory;

  beforeEach(async () => {
    mockSocialAuth.mockReset();
    if (!factory) {
      // config.ts의 top-level `NextAuth(buildAuthConfig)` 호출은 모듈이 처음 로드될
      // 때 단 한 번만 실행된다 — 이후 import는 캐시된 모듈을 반환하므로 factory
      // 참조를 한 번만 캡처해 재사용한다.
      await import('./config');
      factory = capturedFactories[0]!;
    }
  });

  it('includes only the credentials provider when no social login is enabled', async () => {
    mockSocialAuth.mockResolvedValue({ kakao: null, google: null });

    const resolved = await factory();

    expect(resolved.providers.map((p) => p.id)).toEqual(['credentials']);
  });

  it('adds a Kakao provider with the admin-configured credentials when enabled', async () => {
    mockSocialAuth.mockResolvedValue({
      kakao: { clientId: 'kakao-live-id', clientSecret: 'kakao-live-secret', enabled: true },
      google: null,
    });

    const resolved = await factory();

    expect(resolved.providers.map((p) => p.id)).toEqual(['kakao', 'credentials']);
    const kakao = resolved.providers.find((p) => p.id === 'kakao');
    expect(kakao?.clientId).toBe('kakao-live-id');
    expect(kakao?.clientSecret).toBe('kakao-live-secret');
  });

  it('adds both Kakao and Google providers when both are enabled', async () => {
    mockSocialAuth.mockResolvedValue({
      kakao: { clientId: 'k-id', clientSecret: 'k-secret', enabled: true },
      google: { clientId: 'g-id', clientSecret: 'g-secret', enabled: true },
    });

    const resolved = await factory();

    expect(resolved.providers.map((p) => p.id)).toEqual(['kakao', 'google', 'credentials']);
  });

  it('reflects a credential change on the next call without re-importing the module (no redeploy needed)', async () => {
    mockSocialAuth.mockResolvedValue({
      kakao: { clientId: 'old-id', clientSecret: 'old-secret', enabled: true },
      google: null,
    });
    const before = await factory();
    expect(before.providers.find((p) => p.id === 'kakao')?.clientId).toBe('old-id');

    // 관리자가 admin.settings.updateSocial로 자격증명을 바꿨다고 가정 — 재배포 없이
    // 다음 요청(factory 재호출)부터 바로 반영되어야 한다.
    mockSocialAuth.mockResolvedValue({
      kakao: { clientId: 'new-id', clientSecret: 'new-secret', enabled: true },
      google: null,
    });
    const after = await factory();
    expect(after.providers.find((p) => p.id === 'kakao')?.clientId).toBe('new-id');
  });
});
