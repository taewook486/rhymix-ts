/**
 * 관리자 태그 Server Action 테스트 — SPEC-TAG-001 REQ-TAG-006.
 *
 * 이 테스트가 존재하는 이유: 관리자 태그 화면의 이름 변경/병합/삭제 버튼이
 * alert('구현 예정') 스텁이었고, 그 onClick 이 서버 컴포넌트 안에 있어서
 * 태그가 1건이라도 있으면 페이지가 500 이 났다. 도메인 함수는 이미 있었다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = vi.fn();
const mockRenameTag = vi.fn();
const mockMergeTags = vi.fn();
const mockDeleteTag = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/auth/config', () => ({ auth: mockAuth }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { __marker: 'prisma' } }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
vi.mock('@rhymix-ts/tag', () => {
  class TagNotFoundError extends Error {}
  class TagAlreadyExistsError extends Error {}
  return {
    renameTag: mockRenameTag,
    mergeTags: mockMergeTags,
    deleteTag: mockDeleteTag,
    TagNotFoundError,
    TagAlreadyExistsError,
  };
});

async function loadActions() {
  return import('./actions');
}

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe('관리자 태그 Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: '1', isAdmin: true } });
  });

  describe('권한', () => {
    it('비관리자는 어떤 작업도 수행하지 못한다', async () => {
      mockAuth.mockResolvedValue({ user: { id: '2', isAdmin: false } });
      const { renameTagAction, mergeTagsAction, deleteTagAction } = await loadActions();

      const r = await renameTagAction(null, fd({ tagId: '1', newName: 'x' }));
      const m = await mergeTagsAction(null, fd({ sourceTagId: '1', targetTagId: '2' }));
      const d = await deleteTagAction(null, fd({ tagId: '1' }));

      expect(r.error).toBe('관리자만 수행할 수 있습니다.');
      expect(m.error).toBe('관리자만 수행할 수 있습니다.');
      expect(d.error).toBe('관리자만 수행할 수 있습니다.');
      expect(mockRenameTag).not.toHaveBeenCalled();
      expect(mockMergeTags).not.toHaveBeenCalled();
      expect(mockDeleteTag).not.toHaveBeenCalled();
    });
  });

  describe('renameTagAction', () => {
    it('도메인 renameTag 를 호출하고 목록을 revalidate 한다', async () => {
      const { renameTagAction } = await loadActions();

      const state = await renameTagAction(null, fd({ tagId: '3', newName: '  새이름  ' }));

      expect(mockRenameTag).toHaveBeenCalledWith(
        { tagId: 3, newName: '새이름' },
        { prisma: { __marker: 'prisma' } },
      );
      expect(state.error).toBeUndefined();
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/tags');
    });

    it('빈 이름은 도메인을 부르지 않고 거부한다', async () => {
      const { renameTagAction } = await loadActions();

      const state = await renameTagAction(null, fd({ tagId: '3', newName: '   ' }));

      expect(state.error).toBe('새 태그 이름을 입력하세요.');
      expect(mockRenameTag).not.toHaveBeenCalled();
    });

    it('중복 이름 등 도메인 오류를 그대로 노출한다', async () => {
      const { renameTagAction } = await loadActions();
      const { TagAlreadyExistsError } = await import('@rhymix-ts/tag');
      mockRenameTag.mockRejectedValue(new TagAlreadyExistsError('이미 있는 태그입니다'));

      const state = await renameTagAction(null, fd({ tagId: '3', newName: 'dup' }));

      expect(state.error).toBe('이미 있는 태그입니다');
    });
  });

  describe('mergeTagsAction', () => {
    it('도메인 mergeTags 를 호출한다', async () => {
      const { mergeTagsAction } = await loadActions();

      const state = await mergeTagsAction(null, fd({ sourceTagId: '1', targetTagId: '2' }));

      expect(mockMergeTags).toHaveBeenCalledWith(
        { sourceTagId: 1, targetTagId: 2 },
        { prisma: { __marker: 'prisma' } },
      );
      expect(state.error).toBeUndefined();
    });

    it('대상 미선택 / 자기 자신 병합은 거부한다', async () => {
      const { mergeTagsAction } = await loadActions();

      const none = await mergeTagsAction(null, fd({ sourceTagId: '1', targetTagId: '' }));
      const self = await mergeTagsAction(null, fd({ sourceTagId: '1', targetTagId: '1' }));

      expect(none.error).toBe('병합할 대상 태그를 선택하세요.');
      expect(self.error).toBe('같은 태그끼리는 병합할 수 없습니다.');
      expect(mockMergeTags).not.toHaveBeenCalled();
    });
  });

  describe('deleteTagAction', () => {
    it('도메인 deleteTag 를 호출하고 목록을 revalidate 한다', async () => {
      const { deleteTagAction } = await loadActions();

      const state = await deleteTagAction(null, fd({ tagId: '9' }));

      expect(mockDeleteTag).toHaveBeenCalledWith(
        { tagId: 9 },
        { prisma: { __marker: 'prisma' } },
      );
      expect(state.error).toBeUndefined();
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/tags');
    });

    it('알 수 없는 예외는 일반 메시지로 돌려주고 조용히 성공 처리하지 않는다', async () => {
      const { deleteTagAction } = await loadActions();
      mockDeleteTag.mockRejectedValue(new Error('boom'));

      const state = await deleteTagAction(null, fd({ tagId: '9' }));

      expect(state.error).toBe('태그 삭제 중 오류가 발생했습니다.');
      expect(state.success).toBeUndefined();
    });
  });
});
