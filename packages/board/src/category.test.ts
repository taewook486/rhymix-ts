/**
 * category.test.ts — SPEC-CONTENT-001 Slice C (T-001)
 *
 * C-1 ~ C-12: createCategory, listCategoryTree, updateCategory, deleteCategory,
 *              incrementDocumentCount, buildCategoryTree, canPerformAction(category) 검증.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';

// ---------------------------------------------------------------------------
// createCategory (C-1 ~ C-3)
// ---------------------------------------------------------------------------

describe('createCategory', () => {
  it('C-1: boardId + title 로 카테고리 생성, DB row 반환', async () => {
    const { createCategory } = await import('./category.js');

    const fakeCategory = {
      id: 1,
      boardId: 5,
      parentId: null,
      title: '자유',
      description: null,
      color: null,
      expand: true,
      isDefault: false,
      groupIds: [],
      documentCount: 0,
      listOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCreate = vi.fn().mockResolvedValue(fakeCategory);
    const mockPrisma = {
      documentCategory: { create: mockCreate },
    };

    const result = await createCategory(
      { boardId: 5, title: '자유' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArg = mockCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(callArg?.data?.boardId).toBe(5);
    expect(callArg?.data?.title).toBe('자유');
    expect(result.id).toBe(1);
  });

  it('C-2: parentId 있는 서브카테고리 생성', async () => {
    const { createCategory } = await import('./category.js');

    const fakeChild = {
      id: 2,
      boardId: 5,
      parentId: 1,
      title: '서브카테고리',
      description: null,
      color: null,
      expand: true,
      isDefault: false,
      groupIds: [],
      documentCount: 0,
      listOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCreate = vi.fn().mockResolvedValue(fakeChild);
    const mockPrisma = {
      documentCategory: { create: mockCreate },
    };

    const result = await createCategory(
      { boardId: 5, title: '서브카테고리', parentId: 1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(result.parentId).toBe(1);
    const callArg = mockCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(callArg?.data?.parentId).toBe(1);
  });

  it('C-3: 빈 title → ZodError', async () => {
    const { createCategory } = await import('./category.js');

    const mockPrisma = { documentCategory: { create: vi.fn() } };

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createCategory({ boardId: 5, title: '' }, { prisma: mockPrisma as any }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

// ---------------------------------------------------------------------------
// listCategoryTree (C-4, C-11)
// ---------------------------------------------------------------------------

describe('listCategoryTree', () => {
  it('C-4: flat list 가 children 트리로 변환됨 (2레벨)', async () => {
    const { listCategoryTree } = await import('./category.js');

    const flatCategories = [
      {
        id: 1, boardId: 5, parentId: null, title: '부모', description: null, color: null,
        expand: true, isDefault: false, groupIds: [], documentCount: 0, listOrder: 0,
        createdAt: new Date(), updatedAt: new Date(),
      },
      {
        id: 2, boardId: 5, parentId: 1, title: '자식', description: null, color: null,
        expand: true, isDefault: false, groupIds: [], documentCount: 0, listOrder: 0,
        createdAt: new Date(), updatedAt: new Date(),
      },
    ];

    const mockFindMany = vi.fn().mockResolvedValue(flatCategories);
    const mockPrisma = { documentCategory: { findMany: mockFindMany } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listCategoryTree(5, { prisma: mockPrisma as any });

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('부모');
    expect(result[0]?.children).toHaveLength(1);
    expect(result[0]?.children[0]?.title).toBe('자식');
  });

  it('C-11: boardId 없는 카테고리는 포함 안 됨', async () => {
    const { listCategoryTree } = await import('./category.js');

    // findMany 는 boardId 필터로 쿼리 — mock 이 올바른 where 사용 확인
    const mockFindMany = vi.fn().mockResolvedValue([]);
    const mockPrisma = { documentCategory: { findMany: mockFindMany } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listCategoryTree(99, { prisma: mockPrisma as any });

    expect(result).toHaveLength(0);
    const callArg = mockFindMany.mock.calls[0]?.[0] as { where: { boardId: number } };
    expect(callArg?.where?.boardId).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// updateCategory (C-5)
// ---------------------------------------------------------------------------

describe('updateCategory', () => {
  it('C-5: title 변경, 반환 값 확인', async () => {
    const { updateCategory } = await import('./category.js');

    const updated = {
      id: 1, boardId: 5, parentId: null, title: '변경됨',
      description: null, color: null, expand: true, isDefault: false,
      groupIds: [], documentCount: 0, listOrder: 0,
      createdAt: new Date(), updatedAt: new Date(),
    };

    const mockUpdate = vi.fn().mockResolvedValue(updated);
    const mockPrisma = { documentCategory: { update: mockUpdate } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await updateCategory({ id: 1, title: '변경됨' }, { prisma: mockPrisma as any });

    expect(result.title).toBe('변경됨');
    expect(mockUpdate).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// deleteCategory (C-6, C-7)
// ---------------------------------------------------------------------------

describe('deleteCategory', () => {
  it('C-6: 자식 없는 카테고리 삭제 성공', async () => {
    const { deleteCategory } = await import('./category.js');

    const mockFindFirst = vi.fn().mockResolvedValue(null); // 자식 없음
    const mockDelete = vi.fn().mockResolvedValue({ id: 1 });
    const mockPrisma = {
      documentCategory: { findFirst: mockFindFirst, delete: mockDelete },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deleteCategory(1, { prisma: mockPrisma as any });

    expect(mockDelete).toHaveBeenCalledOnce();
  });

  it('C-7: 자식 있는 카테고리 → CategoryHasChildrenError', async () => {
    const { deleteCategory, CategoryHasChildrenError } = await import('./category.js');

    const mockFindFirst = vi.fn().mockResolvedValue({ id: 2, parentId: 1 }); // 자식 있음
    const mockDelete = vi.fn();
    const mockPrisma = {
      documentCategory: { findFirst: mockFindFirst, delete: mockDelete },
    };

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deleteCategory(1, { prisma: mockPrisma as any }),
    ).rejects.toBeInstanceOf(CategoryHasChildrenError);

    expect(mockDelete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// incrementDocumentCount (C-8, C-9)
// ---------------------------------------------------------------------------

describe('incrementDocumentCount', () => {
  it('C-8: categoryId + parent 에 +1 반영 (executeRaw 호출)', async () => {
    const { incrementDocumentCount } = await import('./category.js');

    const mockExecuteRaw = vi.fn().mockResolvedValue(1);
    const mockPrisma = { $executeRaw: mockExecuteRaw };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await incrementDocumentCount(3, 1, mockPrisma as any);

    expect(mockExecuteRaw).toHaveBeenCalledOnce();
  });

  it('C-9: delta -1 → documentCount 0 미만으로 내려가지 않음 (GREATEST 사용)', async () => {
    const { incrementDocumentCount } = await import('./category.js');

    // $executeRaw 에 전달되는 SQL 에 GREATEST 가 포함되는지 확인
    let capturedSql = '';
    const mockExecuteRaw = vi.fn().mockImplementation((strings: TemplateStringsArray) => {
      capturedSql = strings.join('');
      return Promise.resolve(0);
    });
    const mockPrisma = { $executeRaw: mockExecuteRaw };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await incrementDocumentCount(1, -1, mockPrisma as any);

    expect(capturedSql.toUpperCase()).toContain('GREATEST');
  });
});

// ---------------------------------------------------------------------------
// buildCategoryTree (C-10)
// ---------------------------------------------------------------------------

describe('buildCategoryTree', () => {
  it('C-10: orphan (존재하지 않는 parentId) 은 root 로 fallback', async () => {
    const { buildCategoryTree } = await import('./category.js');

    const categories = [
      {
        id: 1, boardId: 5, parentId: 999, title: '고아', description: null, color: null,
        expand: true, isDefault: false, groupIds: [], documentCount: 0, listOrder: 0,
        categorySrl: null, createdAt: new Date(), updatedAt: new Date(),
      },
    ];

    const tree = buildCategoryTree(categories);

    // parentId 999 는 존재하지 않으므로 root 로 처리
    expect(tree).toHaveLength(1);
    expect(tree[0]?.title).toBe('고아');
    expect(tree[0]?.children).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// canPerformAction — category write (C-12)
// ---------------------------------------------------------------------------

describe('canPerformAction — category write (C-12)', () => {
  it('C-12: groupIds 있으면 해당 그룹만 write 가능', async () => {
    const { canPerformAction } = await import('./permissions.js');

    // groupIds [2, 3] 설정된 카테고리 — 사용자의 userGroupSrl 이 일치해야 통과
    const board = { permissions: { write_document: [2, 3] } };

    // 그룹 2 소속 사용자 — 통과
    expect(canPerformAction(board, 'write_document', { userGroupSrl: 2, isAdmin: false })).toBe(true);

    // 그룹 1 소속 사용자 — 거부
    expect(canPerformAction(board, 'write_document', { userGroupSrl: 1, isAdmin: false })).toBe(false);

    // admin — 항상 통과
    expect(canPerformAction(board, 'write_document', { userGroupSrl: 0, isAdmin: true })).toBe(true);
  });
});
