/**
 * permissions.ts — SPEC-CONTENT-001 Slice B (T-004)
 *
 * Board 권한 매트릭스 — Board.permissions Json 컬럼을 평가하여 액션 허용 여부 판정.
 * Slice B 지원 액션: list / view / write_document / write_comment.
 *
 * 설계 결정:
 *   - admin 은 항상 통과 (관리자 escape hatch).
 *   - permissions[action] 이 정의되어 있으면 그 groupSrl 배열을 사용.
 *   - 정의가 없으면 default = [1] (member only).
 *   - 빈 배열 [] 은 admin 외 전원 거부를 의미 (의도된 보안 잠금).
 *
 * @MX:NOTE [AUTO]: Slice B 권한 검사 — list/view/write_document/write_comment 4개 액션만 지원.
 *                  Slice C+ 에서 manage_document, delete_document, vote 등 추가 예정.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-040
 */

export type BoardAction =
  | 'list'
  | 'view'
  | 'write_document'
  | 'write_comment';

/**
 * 권한 검사 컨텍스트.
 * - userGroupSrl: 0 = guest, 1 = 기본 member, 2+ = 사이트별 정의 그룹.
 * - isAdmin: effective admin 여부 (User.isAdmin || group.isAdmin OR-게이트).
 */
export interface PermissionContext {
  userGroupSrl: number;
  isAdmin: boolean;
}

/**
 * 게시판에서 액션을 수행할 수 있는지 판정한다.
 *
 * @param board - Board 의 일부 — permissions Json 필드만 본다.
 * @param action - 'list' | 'view' | 'write_document' | 'write_comment'.
 * @param ctx - 현재 호출자 컨텍스트.
 * @returns true 면 허용, false 면 거부.
 */
export function canPerformAction(
  board: { permissions?: Record<string, number[] | undefined> | unknown | null },
  action: BoardAction,
  ctx: PermissionContext,
): boolean {
  // admin escape hatch — 모든 액션 통과
  if (ctx.isAdmin) return true;

  // permissions 가 object 형태가 아니면 default 사용
  const perms =
    board.permissions !== null &&
    typeof board.permissions === 'object'
      ? (board.permissions as Record<string, number[] | undefined>)
      : undefined;

  // permissions[action] 이 명시되어 있으면 그것을, 아니면 default [1] (member only)
  const allowed = perms?.[action] ?? [1];
  return allowed.includes(ctx.userGroupSrl);
}
