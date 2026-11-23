/**
 * feed 페이지 인라인 Server Action 가드 — D-7. (permissions/page.guard.test.tsx 와 같은 방식)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type React from 'react';

const { mockAuth, mockGetInstance, mockBoardFindUnique, mockBoardUpdate, mockRedirect, mockAssert, mockRevalidateTag } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockGetInstance: vi.fn(),
    mockBoardFindUnique: vi.fn(),
    mockBoardUpdate: vi.fn(),
    mockRedirect: vi.fn(),
    mockAssert: vi.fn(),
    mockRevalidateTag: vi.fn(),
  }));

vi.mock('@/lib/auth/config', () => ({ auth: mockAuth }));
vi.mock('@/lib/auth/admin-guard', () => ({ assertAdminServerAction: mockAssert }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    board: { findUnique: mockBoardFindUnique, update: mockBoardUpdate },
    $transaction: (cb: (tx: { board: { update: typeof mockBoardUpdate } }) => unknown) =>
      cb({ board: { update: mockBoardUpdate } }),
  },
}));
vi.mock('@rhymix-ts/core/modules', () => ({ getModuleInstanceByMid: mockGetInstance }));
vi.mock('next/cache', () => ({ revalidateTag: mockRevalidateTag }));
vi.mock('next/navigation', () => ({ notFound: vi.fn(), redirect: mockRedirect }));
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map([['x-site-id', '1']]) as unknown as Headers),
}));
vi.mock('@rhymix-ts/board/feed', async () => {
  const { z } = await import('zod');
  const boardFeedConfigSchema = z.object({
    enabled: z.boolean().default(false),
    itemCount: z.number().int().default(20),
    fullContent: z.boolean().default(false),
    excerptLength: z.number().int().default(200),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    copyright: z.string().optional(),
  });
  return { boardFeedConfigSchema };
});

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

function validForm() {
  const fd = new FormData();
  fd.set('enabled', 'on');
  fd.set('itemCount', '20');
  fd.set('excerptLength', '200');
  return fd;
}

describe('feed 인라인 액션 가드 (D-7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 1, isAdmin: true } });
    mockGetInstance.mockResolvedValue({ id: 3, name: '자유', mid: 'free' });
    mockBoardFindUnique.mockResolvedValue({ id: 9, feedConfig: {} });
    mockAssert.mockResolvedValue({ user: { id: 1 } });
  });

  it('가드 통과 시 board.update 로 피드 설정을 저장한다 (기존 동작 유지)', async () => {
    const action = await loadAction();
    await action(validForm());
    expect(mockAssert).toHaveBeenCalledOnce();
    expect(mockBoardUpdate).toHaveBeenCalledOnce();
  });

  it('가드가 거부하면 board.update·revalidateTag 를 호출하지 않는다', async () => {
    const action = await loadAction();
    mockAssert.mockRejectedValue(Object.assign(new Error('2FA 인증이 필요합니다.'), { code: 'FORBIDDEN' }));
    await expect(action(validForm())).rejects.toThrow('2FA 인증이 필요합니다.');
    expect(mockBoardUpdate).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
