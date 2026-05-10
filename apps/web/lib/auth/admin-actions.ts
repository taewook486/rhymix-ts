'use server';

/**
 * Admin Server Actions — SPEC-AUTH-001 Slice D2.
 *
 * Server Action 레이어의 책임:
 *   1. auth() 세션에서 actorId 추출
 *   2. effective admin 권한 검증 (REQ-AUTH-034)
 *   3. 도메인 함수 (`@rhymix-ts/auth`) 로 위임
 *   4. useActionState 호환 응답 형태 반환
 *
 * 본 액션들은 admin UI 페이지가 도입될 때 form action 으로 사용된다.
 * D2 범위는 백엔드 (서버 액션 + 도메인) 만이며, UI 페이지는 후속 슬라이스.
 *
 * @MX:ANCHOR: admin Server Action 단일 진입점 — 모든 admin form 호출은 본 함수를 통과한다.
 * @MX:REASON: 권한 검증과 actorId 추출, 도메인 함수 위임이 한 곳에 모여야 우회 경로가 생기지 않는다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-020, REQ-AUTH-021, REQ-AUTH-034
 */
import { changeUserStatus, softDeleteUser } from '@rhymix-ts/auth';
import { prisma } from '@rhymix-ts/db';

import { auth } from './config';
import { isAdminSession } from './admin-middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminActionCode =
  | 'INSUFFICIENT_PRIVILEGES'
  | 'SELF_ACTION_DENIED'
  | 'TARGET_NOT_FOUND'
  | 'TARGET_ALREADY_DELETED'
  | 'INVALID_STATUS_TRANSITION'
  | 'LAST_ADMIN_PROTECTED'
  | 'VALIDATION_FAILED';

export type AdminActionState =
  | { ok: true }
  | {
      ok: false;
      code: AdminActionCode;
      formError?: string;
    };

export const initialAdminActionState: AdminActionState = { ok: true };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function adminErrorMessage(code: AdminActionCode): string {
  switch (code) {
    case 'INSUFFICIENT_PRIVILEGES':
      return '관리자 권한이 필요합니다.';
    case 'SELF_ACTION_DENIED':
      return '자기 자신에 대해 수행할 수 없는 작업입니다.';
    case 'TARGET_NOT_FOUND':
      return '대상 회원을 찾을 수 없습니다.';
    case 'TARGET_ALREADY_DELETED':
      return '이미 삭제된 회원입니다.';
    case 'INVALID_STATUS_TRANSITION':
      return '허용되지 않은 상태 변경입니다.';
    case 'LAST_ADMIN_PROTECTED':
      return '마지막 관리자는 강등할 수 없습니다.';
    case 'VALIDATION_FAILED':
      return '입력값을 확인해주세요.';
  }
}

function fail(code: AdminActionCode): AdminActionState {
  return { ok: false, code, formError: adminErrorMessage(code) };
}

const ALLOWED_STATUSES = new Set(['APPROVED', 'SUSPENDED', 'DENIED', 'UNAUTHED']);

function parseTargetUserId(formData: FormData): number | null {
  const raw = String(formData.get('targetUserId') ?? '').trim();
  if (raw === '') return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

// ---------------------------------------------------------------------------
// setMemberStatusAction
// ---------------------------------------------------------------------------

export async function setMemberStatusAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await auth();
  if (!isAdminSession(session)) {
    return fail('INSUFFICIENT_PRIVILEGES');
  }
  const actorId = session.user.id;

  const targetUserId = parseTargetUserId(formData);
  const newStatus = String(formData.get('newStatus') ?? '').trim();
  if (targetUserId === null || !ALLOWED_STATUSES.has(newStatus)) {
    return fail('VALIDATION_FAILED');
  }

  const result = await changeUserStatus(
    {
      targetUserId,
      newStatus: newStatus as 'APPROVED' | 'SUSPENDED' | 'DENIED' | 'UNAUTHED',
      actorId,
    },
    { prisma },
  );
  if (!result.ok) {
    return fail(result.code);
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteMemberAction
// ---------------------------------------------------------------------------

export async function deleteMemberAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await auth();
  if (!isAdminSession(session)) {
    return fail('INSUFFICIENT_PRIVILEGES');
  }
  const actorId = session.user.id;

  const targetUserId = parseTargetUserId(formData);
  if (targetUserId === null) {
    return fail('VALIDATION_FAILED');
  }

  const result = await softDeleteUser(
    { targetUserId, actorId },
    { prisma },
  );
  if (!result.ok) {
    return fail(result.code);
  }
  return { ok: true };
}
