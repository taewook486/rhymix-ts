/**
 * packages/board/src/permissions.test.ts — SPEC-CONTENT-001 Slice B (T-004)
 *
 * Board 권한 매트릭스 검증.
 * Slice B 지원 액션: list / view / write_document / write_comment.
 *
 * B-301 ~ B-307: admin bypass, default member-only, guest 차단, explicit override 검증.
 */
import { describe, it, expect } from 'vitest';

describe('canPerformAction', () => {
  it('B-301: isAdmin=true 면 권한 매트릭스와 무관하게 모든 액션 허용', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = { permissions: {} };
    const ctx = { userGroupSrl: 0, isAdmin: true };

    expect(canPerformAction(board, 'list', ctx)).toBe(true);
    expect(canPerformAction(board, 'view', ctx)).toBe(true);
    expect(canPerformAction(board, 'write_document', ctx)).toBe(true);
    expect(canPerformAction(board, 'write_comment', ctx)).toBe(true);
  });

  it('B-302: permissions 가 없으면 기본값(member only, groupSrl=1) 적용 → guest=0 거부, member=1 허용', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = {};
    const guest = { userGroupSrl: 0, isAdmin: false };
    const member = { userGroupSrl: 1, isAdmin: false };

    expect(canPerformAction(board, 'write_document', guest)).toBe(false);
    expect(canPerformAction(board, 'write_document', member)).toBe(true);
  });

  it('B-303: permissions.list = [0,1] 이면 guest 도 list 허용', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = { permissions: { list: [0, 1] } };
    const guest = { userGroupSrl: 0, isAdmin: false };

    expect(canPerformAction(board, 'list', guest)).toBe(true);
  });

  it('B-304: permissions.write_document = [2] 이면 groupSrl=1 (일반 member) 거부, groupSrl=2 허용', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = { permissions: { write_document: [2] } };
    const member1 = { userGroupSrl: 1, isAdmin: false };
    const member2 = { userGroupSrl: 2, isAdmin: false };

    expect(canPerformAction(board, 'write_document', member1)).toBe(false);
    expect(canPerformAction(board, 'write_document', member2)).toBe(true);
  });

  it('B-305: permissions.view = [] (빈 배열) 이면 admin 외 모두 거부', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = { permissions: { view: [] } };
    const member = { userGroupSrl: 1, isAdmin: false };
    const guest = { userGroupSrl: 0, isAdmin: false };
    const admin = { userGroupSrl: 0, isAdmin: true };

    expect(canPerformAction(board, 'view', member)).toBe(false);
    expect(canPerformAction(board, 'view', guest)).toBe(false);
    expect(canPerformAction(board, 'view', admin)).toBe(true);
  });

  it('B-306: write_comment 도 동일한 기본값 정책 (member only)', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = {};
    const guest = { userGroupSrl: 0, isAdmin: false };
    const member = { userGroupSrl: 1, isAdmin: false };

    expect(canPerformAction(board, 'write_comment', guest)).toBe(false);
    expect(canPerformAction(board, 'write_comment', member)).toBe(true);
  });

  it('B-307: 알 수 없는 액션 key 가 permissions 에 있으면 기본값 fallback (member only)', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = { permissions: { unrelated_action: [0, 1] } };
    const guest = { userGroupSrl: 0, isAdmin: false };
    const member = { userGroupSrl: 1, isAdmin: false };

    // write_document 키가 없으므로 default = [1] 적용
    expect(canPerformAction(board, 'write_document', guest)).toBe(false);
    expect(canPerformAction(board, 'write_document', member)).toBe(true);
  });
});
