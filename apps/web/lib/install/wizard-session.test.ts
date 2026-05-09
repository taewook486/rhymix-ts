/**
 * Specification tests for the install wizard iron-session wrapper.
 * Covers REQ-INSTALL-003 (CSRF surface), REQ-INSTALL-005 (encrypted cookie),
 * REQ-INSTALL-011 (state persistence between steps).
 *
 * iron-session의 실제 봉인/복호화 동작은 라이브러리에 위임하므로, 여기서는
 * 우리가 노출하는 어댑터 표면(쿠키 옵션, 기본 세션, 클리어 동작)만 검증합니다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookiesMock = vi.fn();
vi.mock('next/headers', () => ({
  cookies: () => cookiesMock(),
}));

const getIronSessionMock = vi.fn();
vi.mock('iron-session', () => ({
  getIronSession: (...args: unknown[]) => getIronSessionMock(...args),
}));

describe('wizard-session', () => {
  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    getIronSessionMock.mockReset();
    process.env.NEXTAUTH_SECRET = 'a'.repeat(64);
    (process.env as Record<string, string>).NODE_ENV = 'test';
  });

  it('the system shall expose stable cookie name and constraints', async () => {
    const mod = await import('./wizard-session');
    expect(mod.WIZARD_COOKIE_NAME).toBe('rhymix-ts-install');
    expect(mod.WIZARD_COOKIE_OPTIONS.path).toBe('/install');
    expect(mod.WIZARD_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(mod.WIZARD_COOKIE_OPTIONS.sameSite).toBe('strict');
    expect(mod.WIZARD_COOKIE_OPTIONS.maxAge).toBe(60 * 60);
  });

  it('the system shall return an empty default session when the cookie is missing', async () => {
    cookiesMock.mockResolvedValue({});
    getIronSessionMock.mockResolvedValue({});
    const mod = await import('./wizard-session');
    const session = await mod.getWizardSession();
    expect(session.licenseAccepted).toBe(false);
    expect(session.envChecksPass).toBe(false);
    expect(session.dbConfigValidated).toBe(false);
    expect(session.step).toBe('license');
    expect(session.language).toBe('en');
  });

  it('the system shall preserve previously written wizard fields across calls', async () => {
    cookiesMock.mockResolvedValue({});
    const stored = {
      licenseAccepted: true,
      envChecksPass: true,
      dbConfigValidated: false,
      step: 'db',
      language: 'ko',
    };
    getIronSessionMock.mockResolvedValue(stored);
    const mod = await import('./wizard-session');
    const session = await mod.getWizardSession();
    expect(session).toMatchObject(stored);
  });

  it('the system shall clear the wizard session when requested', async () => {
    cookiesMock.mockResolvedValue({});
    const destroy = vi.fn();
    getIronSessionMock.mockResolvedValue({ destroy });
    const mod = await import('./wizard-session');
    await mod.clearWizardSession();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('the system shall set secure cookies in production', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    vi.resetModules();
    const mod = await import('./wizard-session');
    expect(mod.WIZARD_COOKIE_OPTIONS.secure).toBe(true);
  });

  it('the system shall require NEXTAUTH_SECRET to be at least 32 chars', async () => {
    process.env.NEXTAUTH_SECRET = 'short';
    vi.resetModules();
    cookiesMock.mockResolvedValue({});
    getIronSessionMock.mockResolvedValue({});
    const mod = await import('./wizard-session');
    await expect(mod.getWizardSession()).rejects.toThrow(/NEXTAUTH_SECRET/);
  });
});
