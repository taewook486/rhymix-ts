/**
 * Specification tests for admin Server Actions — SPEC-AUTH-001 Slice D2.
 *
 * Server Action 레이어의 책임:
 *   - auth() 세션에서 actorId 추출
 *   - 비-admin 호출 차단 (INSUFFICIENT_PRIVILEGES)
 *   - 도메인 함수(@rhymix-ts/auth)로 위임
 *   - useActionState 호환 응답 형태 반환
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  changeUserStatusMock,
  softDeleteUserMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  changeUserStatusMock: vi.fn(),
  softDeleteUserMock: vi.fn(),
}));

vi.mock('@rhymix-ts/auth', () => ({
  changeUserStatus: changeUserStatusMock,
  softDeleteUser: softDeleteUserMock,
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: { __mock: true },
}));

vi.mock('@/lib/auth/config', () => ({
  auth: authMock,
}));

import {
  setMemberStatusAction,
  deleteMemberAction,
  initialAdminActionState,
} from './admin-actions';

beforeEach(() => {
  authMock.mockReset();
  changeUserStatusMock.mockReset();
  softDeleteUserMock.mockReset();
});

function buildForm(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

// ---------------------------------------------------------------------------
// setMemberStatusAction
// ---------------------------------------------------------------------------

describe('setMemberStatusAction', () => {
  it('1) 비-admin 호출자 → INSUFFICIENT_PRIVILEGES, 도메인 함수 호출되지 않음', async () => {
    authMock.mockResolvedValue({
      user: { id: 5, isAdmin: false, groups: [] },
    });
    const result = await setMemberStatusAction(
      initialAdminActionState,
      buildForm({ targetUserId: '42', newStatus: 'SUSPENDED' }),
    );
    expect(result).toMatchObject({
      ok: false,
      code: 'INSUFFICIENT_PRIVILEGES',
    });
    expect(changeUserStatusMock).not.toHaveBeenCalled();
  });

  it('2) admin 호출자 + 정상 입력 → ok:true, 도메인 함수에 actorId 전달', async () => {
    authMock.mockResolvedValue({
      user: { id: 1, isAdmin: true, groups: [] },
    });
    changeUserStatusMock.mockResolvedValue({
      ok: true,
      targetUserId: 42,
      previousStatus: 'APPROVED',
      newStatus: 'SUSPENDED',
    });
    const result = await setMemberStatusAction(
      initialAdminActionState,
      buildForm({ targetUserId: '42', newStatus: 'SUSPENDED' }),
    );
    expect(result).toMatchObject({ ok: true });
    expect(changeUserStatusMock).toHaveBeenCalledTimes(1);
    const arg = changeUserStatusMock.mock.calls[0]![0] as {
      targetUserId: number;
      newStatus: string;
      actorId: number;
    };
    expect(arg.targetUserId).toBe(42);
    expect(arg.newStatus).toBe('SUSPENDED');
    expect(arg.actorId).toBe(1);
  });

  it('3) 도메인 함수가 실패 코드 반환 → 그대로 노출 (formError 동반)', async () => {
    authMock.mockResolvedValue({
      user: { id: 1, isAdmin: true, groups: [] },
    });
    changeUserStatusMock.mockResolvedValue({
      ok: false,
      code: 'TARGET_NOT_FOUND',
    });
    const result = await setMemberStatusAction(
      initialAdminActionState,
      buildForm({ targetUserId: '999', newStatus: 'SUSPENDED' }),
    );
    expect(result).toMatchObject({ ok: false, code: 'TARGET_NOT_FOUND' });
    if (!result.ok) {
      expect(typeof result.formError).toBe('string');
      expect(result.formError!.length).toBeGreaterThan(0);
    }
  });

  it('4) group 경유 admin (REQ-AUTH-034) → 호출 허용', async () => {
    authMock.mockResolvedValue({
      user: { id: 1, isAdmin: false, groups: [{ isAdmin: true }] },
    });
    changeUserStatusMock.mockResolvedValue({
      ok: true,
      targetUserId: 42,
      previousStatus: 'APPROVED',
      newStatus: 'SUSPENDED',
    });
    const result = await setMemberStatusAction(
      initialAdminActionState,
      buildForm({ targetUserId: '42', newStatus: 'SUSPENDED' }),
    );
    expect(result).toMatchObject({ ok: true });
    expect(changeUserStatusMock).toHaveBeenCalled();
  });

  it('5) 세션 없음 (auth 반환 null) → INSUFFICIENT_PRIVILEGES', async () => {
    authMock.mockResolvedValue(null);
    const result = await setMemberStatusAction(
      initialAdminActionState,
      buildForm({ targetUserId: '42', newStatus: 'SUSPENDED' }),
    );
    expect(result).toMatchObject({
      ok: false,
      code: 'INSUFFICIENT_PRIVILEGES',
    });
    expect(changeUserStatusMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteMemberAction
// ---------------------------------------------------------------------------

describe('deleteMemberAction', () => {
  it('6) admin 호출자 + 정상 입력 → softDeleteUser에 위임, ok:true 반환', async () => {
    authMock.mockResolvedValue({
      user: { id: 1, isAdmin: true, groups: [] },
    });
    softDeleteUserMock.mockResolvedValue({
      ok: true,
      targetUserId: 42,
      deletedAt: new Date(),
    });
    const result = await deleteMemberAction(
      initialAdminActionState,
      buildForm({ targetUserId: '42' }),
    );
    expect(result).toMatchObject({ ok: true });
    expect(softDeleteUserMock).toHaveBeenCalledTimes(1);
    const arg = softDeleteUserMock.mock.calls[0]![0] as {
      targetUserId: number;
      actorId: number;
    };
    expect(arg.targetUserId).toBe(42);
    expect(arg.actorId).toBe(1);
  });

  it('7) admin이 자기 자신 삭제 시도 → SELF_ACTION_DENIED 그대로 노출', async () => {
    authMock.mockResolvedValue({
      user: { id: 7, isAdmin: true, groups: [] },
    });
    softDeleteUserMock.mockResolvedValue({
      ok: false,
      code: 'SELF_ACTION_DENIED',
    });
    const result = await deleteMemberAction(
      initialAdminActionState,
      buildForm({ targetUserId: '7' }),
    );
    expect(result).toMatchObject({
      ok: false,
      code: 'SELF_ACTION_DENIED',
    });
  });

  it('8) 비-admin 호출자 → INSUFFICIENT_PRIVILEGES, softDeleteUser 호출되지 않음', async () => {
    authMock.mockResolvedValue({
      user: { id: 5, isAdmin: false, groups: [] },
    });
    const result = await deleteMemberAction(
      initialAdminActionState,
      buildForm({ targetUserId: '42' }),
    );
    expect(result).toMatchObject({
      ok: false,
      code: 'INSUFFICIENT_PRIVILEGES',
    });
    expect(softDeleteUserMock).not.toHaveBeenCalled();
  });
});
