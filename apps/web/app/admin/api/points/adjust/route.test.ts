/**
 * route.test.ts — POST /admin/api/points/adjust 관리자 가드 회귀 테스트.
 *
 * 결함(재현): 가드 없이 PointService 를 호출해, 일반 회원도 임의 회원에게 포인트를 줄 수 있었다.
 * 기대: 관리자 가드가 거부하면 403 을 돌려주고 포인트 서비스를 호출하지 않는다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGuard, mockAdd, mockSubtract } = vi.hoisted(() => ({
  mockGuard: vi.fn(),
  mockAdd: vi.fn(),
  mockSubtract: vi.fn(),
}));

vi.mock('@/lib/auth/admin-guard', () => ({
  adminServerActionCheck: (...args: unknown[]) => mockGuard(...args),
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: {},
}));

vi.mock('@rhymix-ts/point', () => ({
  PointService: class {
    add(...args: unknown[]) {
      return mockAdd(...args);
    }
    subtract(...args: unknown[]) {
      return mockSubtract(...args);
    }
  },
}));

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/admin/api/points/adjust', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /admin/api/points/adjust — 관리자 가드', () => {
  beforeEach(() => {
    mockGuard.mockReset();
    mockAdd.mockReset();
    mockSubtract.mockReset();
    mockAdd.mockResolvedValue(undefined);
    mockSubtract.mockResolvedValue(undefined);
  });

  it('AUTH-ADJUST-1: 가드 거부 시 403 을 돌려주고 포인트를 지급하지 않는다', async () => {
    mockGuard.mockResolvedValue({ ok: false, message: '관리자 권한이 필요합니다.' });
    const { POST } = await import('./route');

    const res = await POST(makeRequest({ memberId: 7, amount: 1000, reason: 'test' }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ message: '관리자 권한이 필요합니다.' });
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockSubtract).not.toHaveBeenCalled();
  });

  it('AUTH-ADJUST-2: 가드 거부 시 차감 요청도 저장하지 않는다', async () => {
    mockGuard.mockResolvedValue({ ok: false, message: '관리자 권한이 필요합니다.' });
    const { POST } = await import('./route');

    const res = await POST(makeRequest({ memberId: 7, amount: -500, reason: 'test' }));

    expect(res.status).toBe(403);
    expect(mockSubtract).not.toHaveBeenCalled();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('AUTH-ADJUST-3: 가드 통과 시 기존 동작 유지 — 양수는 add 호출, 200', async () => {
    mockGuard.mockResolvedValue({ ok: true, session: { user: { id: '1' } } });
    const { POST } = await import('./route');

    const res = await POST(makeRequest({ memberId: 7, amount: 1000, reason: 'test' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith({
      memberId: 7,
      amount: 1000,
      reason: 'test',
      sourceType: 'MANUAL',
    });
  });

  it('AUTH-ADJUST-4: 가드 통과 + 잘못된 입력은 기존대로 400', async () => {
    mockGuard.mockResolvedValue({ ok: true, session: { user: { id: '1' } } });
    const { POST } = await import('./route');

    const res = await POST(makeRequest({ memberId: 7, amount: 1000 }));

    expect(res.status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
  });
});
