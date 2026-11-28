/**
 * 약관 관리 Server Action 테스트.
 *
 * 이 테스트가 존재하는 이유: upsertTermAction / deleteTermAction 이 console.log('[Mock] …')
 * 만 하고 성공(`{ success: true }`)을 돌려주고 있었다. 관리자는 저장된 줄 알지만
 * 아무것도 저장되지 않았다. tRPC admin.terms 의 create/update/delete 로 연결되어야 한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn().mockResolvedValue({
    admin: {
      terms: {
        create: (...a: unknown[]) => mockCreate(...a),
        update: (...a: unknown[]) => mockUpdate(...a),
        delete: (...a: unknown[]) => mockDelete(...a),
      },
    },
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

async function loadActions() {
  return import('./actions');
}

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

const base = { type: 'terms', title: '이용약관', content: '본문', required: 'on', active: 'on' };

describe('upsertTermAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: 1 });
    mockUpdate.mockResolvedValue({ id: 1 });
  });

  it('id 가 없으면 admin.terms.create 로 저장한다', async () => {
    const { upsertTermAction } = await loadActions();

    const state = await upsertTermAction(null, fd(base));

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      type: 'terms',
      title: '이용약관',
      content: '본문',
      required: true,
      active: true,
    });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(state).toEqual({ success: true });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/members/terms');
  });

  it('id 가 있으면 admin.terms.update 로 저장한다', async () => {
    const { upsertTermAction } = await loadActions();

    const state = await upsertTermAction(null, fd({ ...base, id: '7', active: '' }));

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 7,
      type: 'terms',
      title: '이용약관',
      content: '본문',
      required: true,
      active: false,
    });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(state).toEqual({ success: true });
  });

  it('검증에 실패하면 저장소를 호출하지 않는다', async () => {
    const { upsertTermAction } = await loadActions();

    const state = await upsertTermAction(null, fd({ ...base, title: '' }));

    expect(state.fieldErrors?.title).toBeDefined();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('저장소가 거부하면 성공이라고 하지 않고 사유를 돌려준다', async () => {
    mockCreate.mockRejectedValue(new TRPCError({ code: 'CONFLICT', message: '같은 유형의 약관이 이미 있습니다.' }));
    const { upsertTermAction } = await loadActions();

    const state = await upsertTermAction(null, fd(base));

    expect(state).toEqual({ error: '같은 유형의 약관이 이미 있습니다.' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('예상하지 못한 오류도 성공으로 보이지 않는다', async () => {
    mockUpdate.mockRejectedValue(new Error('db down'));
    const { upsertTermAction } = await loadActions();

    const state = await upsertTermAction(null, fd({ ...base, id: '7' }));

    expect(state.success).toBeUndefined();
    expect(state.error).toBe('약관 저장 중 오류가 발생했습니다.');
  });
});

describe('deleteTermAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockResolvedValue({ success: true });
  });

  it('admin.terms.delete 로 삭제한다', async () => {
    const { deleteTermAction } = await loadActions();

    const state = await deleteTermAction(null, fd({ id: '5' }));

    expect(mockDelete).toHaveBeenCalledWith({ id: 5 });
    expect(state).toEqual({ success: true });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/members/terms');
  });

  it('유효하지 않은 id 는 저장소를 호출하지 않는다', async () => {
    const { deleteTermAction } = await loadActions();

    const state = await deleteTermAction(null, fd({ id: 'abc' }));

    expect(state.error).toBe('유효하지 않은 약관 ID입니다.');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('저장소가 거부하면 사유를 돌려준다', async () => {
    mockDelete.mockRejectedValue(new TRPCError({ code: 'NOT_FOUND', message: '약관을 찾을 수 없습니다.' }));
    const { deleteTermAction } = await loadActions();

    const state = await deleteTermAction(null, fd({ id: '5' }));

    expect(state).toEqual({ error: '약관을 찾을 수 없습니다.' });
  });
});
