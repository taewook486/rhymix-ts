/**
 * 페이지 편집 Server Action 가드 — D-7.
 *
 * isAdminSession 만 보던 액션이 IP 제어·사이트 잠금·2FA 거부도 반영하는지 검증한다.
 * (가드 판정 자체는 lib/auth/admin-guard.test.ts 에서 검증)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockAssert, mockSavePageContent, mockRedirect, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockAssert: vi.fn(),
  mockSavePageContent: vi.fn(),
  mockRedirect: vi.fn(),
  mockPrisma: {
    moduleInstance: { update: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth/config', () => ({ auth: mockAuth }));
vi.mock('@/lib/auth/admin-guard', () => ({ assertAdminServerAction: mockAssert }));
vi.mock('@rhymix-ts/db', () => ({ prisma: mockPrisma, Prisma: {} }));
vi.mock('@rhymix-ts/page', () => ({ savePageContent: mockSavePageContent }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('페이지 편집 액션 가드 (D-7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 세션 자체는 관리자 — 거부 사유는 IP/2FA 등 isAdminSession 밖의 가드다.
    mockAuth.mockResolvedValue({ user: { id: 1, isAdmin: true, groups: [] } });
    mockAssert.mockResolvedValue({ user: { id: 1 } });
  });

  it('가드 통과 시 본문을 저장한다 (기존 동작 유지)', async () => {
    const { savePageAction } = await import('./actions');
    await savePageAction(3, '<p>x</p>');
    expect(mockAssert).toHaveBeenCalled();
    expect(mockSavePageContent).toHaveBeenCalledOnce();
  });

  it('IP 거부·2FA 미완료 등 가드 거부 시 savePageContent 를 호출하지 않고 throw 한다', async () => {
    mockAssert.mockRejectedValue(Object.assign(new Error('허용되지 않은 IP입니다.'), { code: 'FORBIDDEN' }));
    const { savePageAction } = await import('./actions');
    await expect(savePageAction(3, '<p>x</p>')).rejects.toThrow('허용되지 않은 IP입니다.');
    expect(mockSavePageContent).not.toHaveBeenCalled();
  });

  it('삭제·설정 변경도 같은 가드를 받는다', async () => {
    mockAssert.mockRejectedValue(new Error('2FA 인증이 필요합니다.'));
    const { updatePageSettingsAction, deletePageAction } = await import('./actions');
    await expect(
      updatePageSettingsAction(3, { title: 't', browserTitle: 'b', layoutId: null, grant: {} }),
    ).rejects.toThrow('2FA 인증이 필요합니다.');
    await expect(deletePageAction(3)).rejects.toThrow('2FA 인증이 필요합니다.');
    expect(mockPrisma.moduleInstance.update).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
