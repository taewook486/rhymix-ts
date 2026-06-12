/**
 * packages/board/src/permissions.test.ts — SPEC-BOARD-CRUD-001 (REQ-BOARD-103)
 *
 * Board 권한 매트릭스 검증 — 7개 액션 전체 커버.
 * 액션: list / view / write_document / write_comment /
 *       vote_log_view / update_view / consultation_read
 *
 * B-401 ~ B-413: admin bypass, default 정책, admin-only 기본값, 명시적 override 검증.
 */
import { describe, it, expect } from 'vitest';

describe('canPerformAction (board — 7-grant)', () => {
  // B-401: admin 은 모든 7개 액션을 무조건 통과
  it('B-401: isAdmin=true 면 7개 액션 모두 허용', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = { permissions: null };
    const ctx = { userGroupSrl: 0, isAdmin: true };

    expect(canPerformAction(board, 'list', ctx)).toBe(true);
    expect(canPerformAction(board, 'view', ctx)).toBe(true);
    expect(canPerformAction(board, 'write_document', ctx)).toBe(true);
    expect(canPerformAction(board, 'write_comment', ctx)).toBe(true);
    expect(canPerformAction(board, 'vote_log_view', ctx)).toBe(true);
    expect(canPerformAction(board, 'update_view', ctx)).toBe(true);
    expect(canPerformAction(board, 'consultation_read', ctx)).toBe(true);
  });

  // B-402: list/view/write_document/write_comment 기본값은 [1] (member only)
  it('B-402: permissions 없을 때 list/view/write_document/write_comment 는 member(1) 허용, guest(0) 거부', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = {};
    const guest = { userGroupSrl: 0, isAdmin: false };
    const member = { userGroupSrl: 1, isAdmin: false };

    expect(canPerformAction(board, 'list', guest)).toBe(false);
    expect(canPerformAction(board, 'list', member)).toBe(true);
    expect(canPerformAction(board, 'view', guest)).toBe(false);
    expect(canPerformAction(board, 'view', member)).toBe(true);
    expect(canPerformAction(board, 'write_document', guest)).toBe(false);
    expect(canPerformAction(board, 'write_document', member)).toBe(true);
    expect(canPerformAction(board, 'write_comment', guest)).toBe(false);
    expect(canPerformAction(board, 'write_comment', member)).toBe(true);
  });

  // B-403: vote_log_view/update_view/consultation_read 기본값은 [] (admin-only)
  it('B-403: permissions 없을 때 vote_log_view/update_view/consultation_read 는 admin 외 모두 거부', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = {};
    const member = { userGroupSrl: 1, isAdmin: false };
    const guest = { userGroupSrl: 0, isAdmin: false };
    const admin = { userGroupSrl: 1, isAdmin: true };

    expect(canPerformAction(board, 'vote_log_view', member)).toBe(false);
    expect(canPerformAction(board, 'vote_log_view', guest)).toBe(false);
    expect(canPerformAction(board, 'vote_log_view', admin)).toBe(true);

    expect(canPerformAction(board, 'update_view', member)).toBe(false);
    expect(canPerformAction(board, 'update_view', guest)).toBe(false);
    expect(canPerformAction(board, 'update_view', admin)).toBe(true);

    expect(canPerformAction(board, 'consultation_read', member)).toBe(false);
    expect(canPerformAction(board, 'consultation_read', guest)).toBe(false);
    expect(canPerformAction(board, 'consultation_read', admin)).toBe(true);
  });

  // B-404: 명시적 permissions 가 기본값을 override 함
  it('B-404: permissions.list = [0,1] 이면 guest 도 list 허용', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = { permissions: { list: [0, 1] } };
    const guest = { userGroupSrl: 0, isAdmin: false };

    expect(canPerformAction(board, 'list', guest)).toBe(true);
  });

  // B-405: 빈 배열 [] 은 admin 외 전원 거부
  it('B-405: permissions[action] = [] 이면 admin 외 모두 거부 (admin-only lock)', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = { permissions: { list: [], view: [] } };
    const member = { userGroupSrl: 1, isAdmin: false };
    const admin = { userGroupSrl: 0, isAdmin: true };

    expect(canPerformAction(board, 'list', member)).toBe(false);
    expect(canPerformAction(board, 'view', member)).toBe(false);
    expect(canPerformAction(board, 'list', admin)).toBe(true);
    expect(canPerformAction(board, 'view', admin)).toBe(true);
  });

  // B-406: admin-only 기본 액션에 명시적 그룹 추가 시 허용
  it('B-406: vote_log_view 에 명시적 groupSrl 추가 시 해당 그룹 허용', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = { permissions: { vote_log_view: [1, 2] } };
    const member1 = { userGroupSrl: 1, isAdmin: false };
    const member2 = { userGroupSrl: 2, isAdmin: false };
    const guest = { userGroupSrl: 0, isAdmin: false };

    expect(canPerformAction(board, 'vote_log_view', member1)).toBe(true);
    expect(canPerformAction(board, 'vote_log_view', member2)).toBe(true);
    expect(canPerformAction(board, 'vote_log_view', guest)).toBe(false);
  });

  // B-407: permissions 가 null 이면 기본값 적용
  it('B-407: permissions=null 이면 기본값 적용 (list/view=member-only, vote_log_view=admin-only)', async () => {
    const { canPerformAction } = await import('./permissions.js');
    const board = { permissions: null };
    const member = { userGroupSrl: 1, isAdmin: false };
    const guest = { userGroupSrl: 0, isAdmin: false };

    expect(canPerformAction(board, 'list', member)).toBe(true);
    expect(canPerformAction(board, 'list', guest)).toBe(false);
    expect(canPerformAction(board, 'vote_log_view', member)).toBe(false);
  });

  // B-408~B-415: 추가 권한 (vote_log_view, update_view, consultation_read) 상세 검증
  describe('extended grants (vote_log_view, update_view, consultation_read)', () => {
    // B-408: vote_log_view - admin only access with default permissions
    it('B-408: vote_log_view — admin만 접근 가능 (기본 권한)', async () => {
      const { canPerformAction } = await import('./permissions.js');
      const board = {};
      const admin = { userGroupSrl: 1, isAdmin: true };
      const member = { userGroupSrl: 1, isAdmin: false };

      expect(canPerformAction(board, 'vote_log_view', admin)).toBe(true);
      expect(canPerformAction(board, 'vote_log_view', member)).toBe(false);
    });

    // B-409: update_view - guest cannot view with default permissions
    it('B-409: update_view — guest는 접근 불가 (기본 권한)', async () => {
      const { canPerformAction } = await import('./permissions.js');
      const board = {};
      const guest = { userGroupSrl: 0, isAdmin: false };
      const admin = { userGroupSrl: 0, isAdmin: true };

      expect(canPerformAction(board, 'update_view', guest)).toBe(false);
      expect(canPerformAction(board, 'update_view', admin)).toBe(true);
    });

    // B-410: consultation_read - member cannot read with default permissions
    it('B-410: consultation_read — member는 읽기 불가 (기본 권한)', async () => {
      const { canPerformAction } = await import('./permissions.js');
      const board = {};
      const member = { userGroupSrl: 1, isAdmin: false };
      const admin = { userGroupSrl: 1, isAdmin: true };

      expect(canPerformAction(board, 'consultation_read', member)).toBe(false);
      expect(canPerformAction(board, 'consultation_read', admin)).toBe(true);
    });

    // B-411: vote_log_view - explicitly allowed group can view
    it('B-411: vote_log_view — 명시적 허용 그룹은 접근 가능', async () => {
      const { canPerformAction } = await import('./permissions.js');
      const board = { permissions: { vote_log_view: [2] } };
      const allowedMember = { userGroupSrl: 2, isAdmin: false };
      const deniedMember = { userGroupSrl: 1, isAdmin: false };

      expect(canPerformAction(board, 'vote_log_view', allowedMember)).toBe(true);
      expect(canPerformAction(board, 'vote_log_view', deniedMember)).toBe(false);
    });

    // B-412: update_view - explicitly allowed group can view
    it('B-412: update_view — 명시적 허용 그룹은 접근 가능', async () => {
      const { canPerformAction } = await import('./permissions.js');
      const board = { permissions: { update_view: [3] } };
      const allowedMember = { userGroupSrl: 3, isAdmin: false };
      const deniedMember = { userGroupSrl: 1, isAdmin: false };

      expect(canPerformAction(board, 'update_view', allowedMember)).toBe(true);
      expect(canPerformAction(board, 'update_view', deniedMember)).toBe(false);
    });

    // B-413: consultation_read - explicitly allowed group can read
    it('B-413: consultation_read — 명시적 허용 그룹은 읽기 가능', async () => {
      const { canPerformAction } = await import('./permissions.js');
      const board = { permissions: { consultation_read: [4] } };
      const allowedMember = { userGroupSrl: 4, isAdmin: false };
      const deniedMember = { userGroupSrl: 1, isAdmin: false };

      expect(canPerformAction(board, 'consultation_read', allowedMember)).toBe(true);
      expect(canPerformAction(board, 'consultation_read', deniedMember)).toBe(false);
    });

    // B-414: multiple groups can be explicitly allowed for extended grants
    it('B-414: vote_log_view — 여러 그룹 동시 허용 가능', async () => {
      const { canPerformAction } = await import('./permissions.js');
      const board = { permissions: { vote_log_view: [2, 3, 5] } };
      const member2 = { userGroupSrl: 2, isAdmin: false };
      const member3 = { userGroupSrl: 3, isAdmin: false };
      const member5 = { userGroupSrl: 5, isAdmin: false };
      const member1 = { userGroupSrl: 1, isAdmin: false };

      expect(canPerformAction(board, 'vote_log_view', member2)).toBe(true);
      expect(canPerformAction(board, 'vote_log_view', member3)).toBe(true);
      expect(canPerformAction(board, 'vote_log_view', member5)).toBe(true);
      expect(canPerformAction(board, 'vote_log_view', member1)).toBe(false);
    });

    // B-415: empty array explicitly denies all non-admin users
    it('B-415: consultation_read=[] 이면 admin 외 모두 거부 (명시적 잠금)', async () => {
      const { canPerformAction } = await import('./permissions.js');
      const board = { permissions: { consultation_read: [] } };
      const admin = { userGroupSrl: 1, isAdmin: true };
      const member = { userGroupSrl: 1, isAdmin: false };
      const guest = { userGroupSrl: 0, isAdmin: false };

      expect(canPerformAction(board, 'consultation_read', admin)).toBe(true);
      expect(canPerformAction(board, 'consultation_read', member)).toBe(false);
      expect(canPerformAction(board, 'consultation_read', guest)).toBe(false);
    });
  });
});
