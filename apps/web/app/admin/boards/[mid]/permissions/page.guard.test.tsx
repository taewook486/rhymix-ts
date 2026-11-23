/**
 * permissions 페이지 인라인 Server Action 가드 — D-7.
 *
 * 인라인 액션은 페이지 렌더와 별개로 직접 POST 될 수 있다. 페이지 렌더 시점의 관리자 검사만으로는
 * 부족하므로, 액션 본문이 관리자 가드(IP 제어·사이트 잠금·2FA 포함)를 다시 통과해야 한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type React from 'react';

const {
  mockAuth,
  mockGetInstance,
  mockBoardFindUnique,
  mockBoardUpdate,
  mockMemberGroupFindMany,
  mockRedirect,
  mockAssert,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetInstance: vi.fn(),
  mockBoardFindUnique: vi.fn(),
  mockBoardUpdate: vi.fn(),
  mockMemberGroupFindMany: vi.fn(),
  mockRedirect: vi.fn(),
  mockAssert: vi.fn(),
}));

vi.mock('@/lib/auth/config', () => ({ auth: mockAuth }));
vi.mock('@/lib/auth/admin-guard', () => ({ assertAdminServerAction: mockAssert }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    board: { findUnique: mockBoardFindUnique, update: mockBoardUpdate },
    memberGroup: { findMany: mockMemberGroupFindMany },
  },
}));
vi.mock('@rhymix-ts/core/modules', () => ({ getModuleInstanceByMid: mockGetInstance }));
vi.mock('next/navigation', () => ({ notFound: vi.fn(), redirect: mockRedirect }));
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map([['x-site-id', '1']]) as unknown as Headers),
}));
vi.mock('@/app/admin/_components/BackButton', () => ({ BackButton: () => null }));

/** React 엘리먼트 트리에서 <form> 의 action 함수를 찾는다. */
function findFormAction(node: unknown): ((fd: FormData) => Promise<void>) | null {
  if (node === null || typeof node !== 'object') return null;
  const el = node as React.ReactElement<{ action?: unknown; children?: unknown }>;
  if (el.type === 'form' && typeof el.props?.action === 'function') {
    return el.props.action as (fd: FormData) => Promise<void>;
  }
  const children = el.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findFormAction(child);
    if (found) return found;
  }
  return null;
}

async function loadAction() {
  const Page = (await import('./page')).default;
  const tree = await Page({ params: Promise.resolve({ mid: 'free' }) });
  const action = findFormAction(tree);
  if (!action) throw new Error('form action not found');
  return action;
}

describe('permissions 인라인 액션 가드 (D-7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 1, isAdmin: true } });
    mockGetInstance.mockResolvedValue({ id: 3, name: '자유', mid: 'free' });
    mockBoardFindUnique.mockResolvedValue({ id: 9, permissions: {} });
    mockMemberGroupFindMany.mockResolvedValue([]);
    mockAssert.mockResolvedValue({ user: { id: 1 } });
  });

  it('가드 통과 시 board.update 로 권한을 저장한다 (기존 동작 유지)', async () => {
    const action = await loadAction();
    const fd = new FormData();
    fd.set('view-0', 'on');
    await action(fd);
    expect(mockAssert).toHaveBeenCalledOnce();
    expect(mockBoardUpdate).toHaveBeenCalledOnce();
  });

  it('IP 거부·2FA 미완료·비관리자 등으로 가드가 거부하면 board.update 를 호출하지 않는다', async () => {
    const action = await loadAction();
    mockAssert.mockRejectedValue(Object.assign(new Error('허용되지 않은 IP입니다.'), { code: 'FORBIDDEN' }));
    await expect(action(new FormData())).rejects.toThrow('허용되지 않은 IP입니다.');
    expect(mockBoardUpdate).not.toHaveBeenCalled();
  });
});
