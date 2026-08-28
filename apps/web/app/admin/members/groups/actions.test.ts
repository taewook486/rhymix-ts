/**
 * 회원 그룹 Server Action 테스트 — 삭제 실패가 화면까지 전달되는지 검증한다.
 *
 * 이 테스트가 존재하는 이유: 목록 페이지가 deleteGroupAction 의 반환값을
 * 버리고 있었다. "마지막 그룹은 삭제할 수 없습니다" 같은 거부가 아무 흔적도
 * 남기지 않아 관리자에게는 버튼이 고장난 것으로 보였다.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-042
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

const mockGroupDelete = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn().mockResolvedValue({
    admin: { group: { delete: (...args: unknown[]) => mockGroupDelete(...args) } },
  }),
}));

vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

async function loadActions() {
  return import('./actions');
}

function formDataWith(id: unknown): FormData {
  const fd = new FormData();
  if (id !== undefined) fd.set('id', String(id));
  return fd;
}

describe('deleteGroupFormAction — 삭제 실패 노출', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGroupDelete.mockResolvedValue(undefined);
  });

  it('삭제에 성공하면 오류 없이 반환하고 목록을 revalidate 한다', async () => {
    const { deleteGroupFormAction } = await loadActions();

    const state = await deleteGroupFormAction(null, formDataWith(3));

    expect(mockGroupDelete).toHaveBeenCalledWith({ id: 3 });
    expect(state.error).toBeUndefined();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/members/groups');
  });

  it('tRPC 가 거부하면 그 메시지를 폼 상태로 돌려준다', async () => {
    const { deleteGroupFormAction } = await loadActions();
    mockGroupDelete.mockRejectedValue(
      new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete the last remaining group' }),
    );

    const state = await deleteGroupFormAction(null, formDataWith(1));

    expect(state.error).toBe('Cannot delete the last remaining group');
  });

  it('알 수 없는 예외도 일반 메시지로 돌려준다 — 조용히 성공으로 처리하지 않는다', async () => {
    const { deleteGroupFormAction } = await loadActions();
    mockGroupDelete.mockRejectedValue(new Error('boom'));

    const state = await deleteGroupFormAction(null, formDataWith(1));

    expect(state.error).toBe('그룹 삭제 중 오류가 발생했습니다.');
  });

  it('id 가 없거나 숫자가 아니면 tRPC 를 부르지 않고 거부한다', async () => {
    const { deleteGroupFormAction } = await loadActions();

    const missing = await deleteGroupFormAction(null, formDataWith(undefined));
    const bad = await deleteGroupFormAction(null, formDataWith('abc'));
    const zero = await deleteGroupFormAction(null, formDataWith(0));

    expect(missing.error).toBe('잘못된 그룹 ID 입니다.');
    expect(bad.error).toBe('잘못된 그룹 ID 입니다.');
    expect(zero.error).toBe('잘못된 그룹 ID 입니다.');
    expect(mockGroupDelete).not.toHaveBeenCalled();
  });
});
