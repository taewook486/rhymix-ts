/**
 * permissions.ts — SPEC-BOARD-CRUD-001 (REQ-BOARD-103)
 *
 * Board 권한 매트릭스 — Board.permissions Json 컬럼을 평가하여 액션 허용 여부 판정.
 * 7개 액션: list / view / write_document / write_comment /
 *            vote_log_view / update_view / consultation_read
 *
 * 설계 결정:
 *   - admin 은 항상 통과 (관리자 escape hatch).
 *   - permissions[action] 이 명시되어 있으면 그 groupSrl 배열을 사용.
 *   - 기본값:
 *       list / view / write_document / write_comment → [1] (member only)
 *       vote_log_view / update_view / consultation_read → [] (admin-only, 빈 배열 = 전원 거부)
 *   - 빈 배열 [] 은 admin 외 전원 거부를 의미 (의도된 보안 잠금).
 *
 * @MX:ANCHOR [AUTO]: canPerformAction — board 권한 매트릭스 평가 진입점.
 * @MX:REASON: fan_in >= 3 (comment-create.ts, comment-update.ts, routes/view-page.tsx, 테스트).
 * @MX:SPEC: SPEC-BOARD-CRUD-001 REQ-BOARD-103
 */

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

export type BoardAction =
  | 'list'
  | 'view'
  | 'write_document'
  | 'write_comment'
  | 'vote_log_view'
  | 'update_view'
  | 'consultation_read';

/**
 * 권한 검사 컨텍스트.
 * - userGroupSrl: 0 = guest, 1 = 기본 member, 2+ = 사이트별 정의 그룹.
 * - isAdmin: effective admin 여부.
 */
export interface PermissionContext {
  userGroupSrl: number;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// 기본값 테이블
// ---------------------------------------------------------------------------

/**
 * 기본 권한 테이블 — permissions 컬럼에 해당 액션 키가 없을 때 사용.
 * [] 은 admin-only (빈 배열 = 누구도 허용하지 않음 → admin escape hatch 로만 통과).
 */
const DEFAULT_PERMISSIONS: Record<BoardAction, number[]> = {
  list: [1],
  view: [1],
  write_document: [1],
  write_comment: [1],
  vote_log_view: [],
  update_view: [],
  consultation_read: [],
};

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

/**
 * 게시판에서 액션을 수행할 수 있는지 판정한다.
 *
 * @param board - Board 의 일부 — permissions Json 필드만 본다.
 * @param action - 7개 BoardAction 중 하나.
 * @param context - 현재 호출자 컨텍스트.
 * @returns true 면 허용, false 면 거부.
 */
export function canPerformAction(
  board: { permissions?: Record<string, number[]> | null | undefined },
  action: BoardAction,
  context: PermissionContext,
): boolean {
  // admin escape hatch — 모든 액션 통과
  if (context.isAdmin) return true;

  // permissions 가 object 형태가 아니면 default 사용
  const perms =
    board.permissions !== null &&
    board.permissions !== undefined &&
    typeof board.permissions === 'object'
      ? (board.permissions as Record<string, number[] | undefined>)
      : undefined;

  // permissions[action] 이 명시되어 있으면 그것을, 아니면 기본값 적용
  const allowed = perms?.[action] ?? DEFAULT_PERMISSIONS[action];
  return allowed.includes(context.userGroupSrl);
}
