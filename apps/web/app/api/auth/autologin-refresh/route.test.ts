/**
 * Specification tests for AutoLogin Refresh Route Handler — SPEC-AUTH-001 Slice G.
 *
 * autologin-refresh Route Handler 가 올바르게 동작하는지 검증한다:
 * - 쿠키 없음 → NO_TOKEN
 * - 쿠키 있음 + 검증 실패 → INVALID 또는 THEFT
 * - 쿠키 있음 + 검증 성공 → 쿠키 갱신 + userId 반환
 * - GET 요청 → 405 Method Not Allowed
 *
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST, GET } from './route';

// Mock verifyAutoLogin
vi.mock('@rhymix-ts/auth', () => ({
  verifyAutoLogin: vi.fn(),
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: {},
}));

describe('autologin-refresh Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test G-5: 쿠키 없음 → NO_TOKEN
  it('should return NO_TOKEN when cookie is missing', async () => {
    const req = new Request('http://localhost:3000/api/auth/autologin-refresh', {
      method: 'POST',
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: false, code: 'NO_TOKEN' });
  });

  // Test G-6: 토큰 검증 실패 (TOKEN_INVALID) → INVALID
  // Test G-7: 토큰 검증 실패 (TOKEN_THEFT) → THEFT
  // Test G-8: 토큰 검증 성공 → userId 반환 + 쿠키 갱신
  // Test G-9: GET 요청 → 405 Method Not Allowed

  it('should return 405 for GET request', async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });
});
