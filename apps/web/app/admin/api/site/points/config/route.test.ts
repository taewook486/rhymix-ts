/**
 * route.test.ts — POST /admin/api/site/points/config 관리자 가드 회귀 테스트.
 *
 * 결함(재현): 가드 없이 setSitePointConfig 를 호출해, 일반 회원도 사이트 포인트 설정을 바꿀 수 있었다.
 * 기대: 관리자 가드가 거부하면 403 을 돌려주고 설정을 저장하지 않는다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGuard, mockSetConfig } = vi.hoisted(() => ({
  mockGuard: vi.fn(),
  mockSetConfig: vi.fn(),
}));

vi.mock('@/lib/auth/admin-guard', () => ({
  adminServerActionCheck: (...args: unknown[]) => mockGuard(...args),
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: {},
}));

vi.mock('@rhymix-ts/point', () => ({
  setSitePointConfig: (...args: unknown[]) => mockSetConfig(...args),
}));

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/admin/api/site/points/config', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /admin/api/site/points/config — 관리자 가드', () => {
  beforeEach(() => {
    mockGuard.mockReset();
    mockSetConfig.mockReset();
    mockSetConfig.mockResolvedValue({ signupBonus: 0 });
  });

  it('AUTH-CONFIG-1: 가드 거부 시 403 을 돌려주고 설정을 저장하지 않는다', async () => {
    mockGuard.mockResolvedValue({ ok: false, message: '관리자 권한이 필요합니다.' });
    const { POST } = await import('./route');

    const res = await POST(makeRequest({ signupBonus: 99999 }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ message: '관리자 권한이 필요합니다.' });
    expect(mockSetConfig).not.toHaveBeenCalled();
  });

  it('AUTH-CONFIG-2: 가드 통과 시 기존 동작 유지 — 설정 저장 후 200', async () => {
    mockGuard.mockResolvedValue({ ok: true, session: { user: { id: '1' } } });
    const { POST } = await import('./route');

    const body = { signupBonus: 500, clampToZero: true };
    const res = await POST(makeRequest(body));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, config: { signupBonus: 0 } });
    expect(mockSetConfig).toHaveBeenCalledTimes(1);
    expect(mockSetConfig.mock.calls[0]?.[1]).toEqual(body);
  });
});
