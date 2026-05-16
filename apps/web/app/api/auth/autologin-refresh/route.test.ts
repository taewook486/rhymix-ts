/**
 * Specification tests for AutoLogin Refresh Route Handler — SPEC-AUTH-001 Slice G.
 *
 * autologin-refresh Route Handler 가 올바르게 동작하는지 검증한다:
 * - 쿠키 없음 → NO_TOKEN
 * - 쿠키 있음 + 검증 실패 → INVALID 또는 THEFT (+ 쿠키 삭제)
 * - 쿠키 있음 + 검증 성공 → 쿠키 갱신 (newSecurityKey) + userId 반환
 * - GET 요청 → 405 Method Not Allowed
 *
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted: vi.mock 보다 먼저 실행되도록)
// ---------------------------------------------------------------------------

const {
  verifyAutoLoginMock,
  registerAutoLoginMarkerMock,
  signInMock,
  cookieStore,
  headersGetMock,
} = vi.hoisted(() => {
  // 인메모리 쿠키 저장소 — 테스트마다 reset.
  const store = new Map<string, string>();
  const setCalls: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }> = [];
  const deleteCalls: string[] = [];

  const cookies = {
    get: (name: string) => {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (
      name: string,
      value: string,
      options?: Record<string, unknown>,
    ) => {
      store.set(name, value);
      setCalls.push({ name, value, options });
    },
    delete: (name: string) => {
      store.delete(name);
      deleteCalls.push(name);
    },
    _setCalls: setCalls,
    _deleteCalls: deleteCalls,
    _reset() {
      store.clear();
      setCalls.length = 0;
      deleteCalls.length = 0;
    },
  };

  return {
    verifyAutoLoginMock: vi.fn(),
    registerAutoLoginMarkerMock: vi.fn(() => 'fixed-nonce-xyz'),
    signInMock: vi.fn().mockResolvedValue(undefined),
    cookieStore: cookies,
    headersGetMock: vi.fn((name: string) => {
      if (name === 'x-forwarded-for') return '203.0.113.5';
      if (name === 'user-agent') return 'vitest-ua';
      return null;
    }),
  };
});

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieStore),
  headers: () => Promise.resolve({ get: headersGetMock }),
}));

vi.mock('@rhymix-ts/auth', () => ({
  verifyAutoLogin: verifyAutoLoginMock,
  registerAutoLoginMarker: registerAutoLoginMarkerMock,
}));

vi.mock('@/lib/auth/config', () => ({
  signIn: signInMock,
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: { __mock: true },
}));

// ---------------------------------------------------------------------------
// SUT import — 반드시 vi.mock 후에 import.
// ---------------------------------------------------------------------------

import { POST, GET } from './route';

describe('autologin-refresh Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore._reset();
    headersGetMock.mockImplementation((name: string) => {
      if (name === 'x-forwarded-for') return '203.0.113.5';
      if (name === 'user-agent') return 'vitest-ua';
      return null;
    });
    registerAutoLoginMarkerMock.mockReturnValue('fixed-nonce-xyz');
    signInMock.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // G-5: 쿠키 없음 → NO_TOKEN
  // -------------------------------------------------------------------------
  it('G-5: should return NO_TOKEN when cookie is missing', async () => {
    const req = new Request('http://localhost:3000/api/auth/autologin-refresh', {
      method: 'POST',
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: false, code: 'NO_TOKEN' });
    expect(verifyAutoLoginMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // G-6: 토큰 검증 실패 (TOKEN_INVALID) → INVALID + 쿠키 삭제
  // -------------------------------------------------------------------------
  it('G-6: should return INVALID and delete cookie when TOKEN_INVALID', async () => {
    cookieStore.set('rx_autologin', 'invalid-key', { httpOnly: true });
    cookieStore._reset(); // clear set call log from setup
    cookieStore.set('rx_autologin', 'invalid-key'); // re-seed without logging fixture
    cookieStore._setCalls.length = 0;

    verifyAutoLoginMock.mockResolvedValue({ ok: false, code: 'TOKEN_INVALID' });

    const req = new Request('http://localhost:3000/api/auth/autologin-refresh', {
      method: 'POST',
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: false, code: 'INVALID' });
    expect(verifyAutoLoginMock).toHaveBeenCalledTimes(1);
    expect(cookieStore._deleteCalls).toContain('rx_autologin');
  });

  // -------------------------------------------------------------------------
  // G-7: 토큰 검증 실패 (TOKEN_THEFT) → THEFT + 쿠키 삭제
  // -------------------------------------------------------------------------
  it('G-7: should return THEFT and delete cookie when TOKEN_THEFT', async () => {
    cookieStore.set('rx_autologin', 'stolen-key');
    cookieStore._setCalls.length = 0;

    verifyAutoLoginMock.mockResolvedValue({ ok: false, code: 'TOKEN_THEFT' });

    const req = new Request('http://localhost:3000/api/auth/autologin-refresh', {
      method: 'POST',
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: false, code: 'THEFT' });
    expect(cookieStore._deleteCalls).toContain('rx_autologin');
  });

  // -------------------------------------------------------------------------
  // G-8: 토큰 검증 성공 → userId + newSecurityKey 로 쿠키 갱신
  // -------------------------------------------------------------------------
  it('G-8: should rotate cookie with newSecurityKey on success', async () => {
    cookieStore.set('rx_autologin', 'old-key');
    cookieStore._setCalls.length = 0;

    verifyAutoLoginMock.mockResolvedValue({
      ok: true,
      userId: 42,
      autoLoginId: 1,
      newSecurityKey: 'new-key-xyz',
    });

    const req = new Request('http://localhost:3000/api/auth/autologin-refresh', {
      method: 'POST',
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: true, userId: 42 });

    // verifyAutoLogin 이 IP/UA/securityKey 와 함께 호출되어야 한다.
    expect(verifyAutoLoginMock).toHaveBeenCalledWith(
      expect.objectContaining({
        securityKey: 'old-key',
        ip: '203.0.113.5',
        userAgent: 'vitest-ua',
      }),
      expect.any(Object),
    );

    // 쿠키가 새 키로 갱신되어야 한다 (REQ-AUTH-019 key rotation).
    expect(cookieStore._setCalls.length).toBeGreaterThanOrEqual(1);
    const lastSet = cookieStore._setCalls[cookieStore._setCalls.length - 1]!;
    expect(lastSet.name).toBe('rx_autologin');
    expect(lastSet.value).toBe('new-key-xyz');
    expect(lastSet.options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  });

  // -------------------------------------------------------------------------
  // G-9: GET 요청 → 405 Method Not Allowed
  // -------------------------------------------------------------------------
  it('G-9: should return 405 for GET request', async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });

  // -------------------------------------------------------------------------
  // H-4: 검증 성공 시 registerAutoLoginMarker + signIn 호출 (Slice H)
  // -------------------------------------------------------------------------
  it('H-4: should register marker and call signIn after successful verifyAutoLogin', async () => {
    cookieStore.set('rx_autologin', 'old-key');
    cookieStore._setCalls.length = 0;

    verifyAutoLoginMock.mockResolvedValue({
      ok: true,
      userId: 42,
      autoLoginId: 1,
      newSecurityKey: 'new-key-xyz',
    });

    const req = new Request('http://localhost:3000/api/auth/autologin-refresh', {
      method: 'POST',
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: true, userId: 42 });

    // registerAutoLoginMarker 는 userId 와 함께 호출되어야 한다.
    expect(registerAutoLoginMarkerMock).toHaveBeenCalledWith(42);

    // signIn 은 'credentials' 와 autologinUserId/autologinNonce 와 함께 호출되어야 한다.
    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(signInMock).toHaveBeenCalledWith(
      'credentials',
      expect.objectContaining({
        autologinUserId: '42',
        autologinNonce: 'fixed-nonce-xyz',
        redirect: false,
      }),
    );
  });

  // -------------------------------------------------------------------------
  // H-5: 검증 실패 시 signIn / registerAutoLoginMarker 호출되지 않음 (G 회귀)
  // -------------------------------------------------------------------------
  it('H-5: should NOT call signIn or registerMarker when verifyAutoLogin fails', async () => {
    cookieStore.set('rx_autologin', 'stolen-key');
    cookieStore._setCalls.length = 0;

    verifyAutoLoginMock.mockResolvedValue({ ok: false, code: 'TOKEN_THEFT' });

    const req = new Request('http://localhost:3000/api/auth/autologin-refresh', {
      method: 'POST',
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: false, code: 'THEFT' });
    expect(registerAutoLoginMarkerMock).not.toHaveBeenCalled();
    expect(signInMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // H-5b: NO_TOKEN 케이스도 signIn 호출하지 않음
  // -------------------------------------------------------------------------
  it('H-5b: should NOT call signIn when cookie missing (NO_TOKEN)', async () => {
    const req = new Request('http://localhost:3000/api/auth/autologin-refresh', {
      method: 'POST',
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: false, code: 'NO_TOKEN' });
    expect(signInMock).not.toHaveBeenCalled();
    expect(registerAutoLoginMarkerMock).not.toHaveBeenCalled();
  });
});
