/**
 * category.ts — SPEC-CONTENT-001 Slice C (T-001)
 *
 * DocumentCategory 도메인 함수.
 * - createCategory / listCategoryTree / updateCategory / deleteCategory
 * - incrementDocumentCount (recursive CTE, $executeRaw)
 * - buildCategoryTree (flat → tree 변환)
 * - CategoryHasChildrenError 에러 클래스
 *
 * REQ-CONTENT-040, REQ-CONTENT-041, REQ-CONTENT-042.
 */
import { z } from 'zod';
import type { PrismaClient, DocumentCategory } from '@prisma/client';

// ---------------------------------------------------------------------------
// 에러 클래스
// ---------------------------------------------------------------------------

/**
 * 하위 카테고리가 있는 카테고리를 삭제하려 할 때 발생하는 도메인 예외.
 * tRPC 레이어에서 CONFLICT 로 변환된다.
 */
export class CategoryHasChildrenError extends Error {
  readonly code = 'CATEGORY_HAS_CHILDREN';
  constructor(categoryId: number) {
    super(`Category ${categoryId} has children and cannot be deleted`);
    this.name = 'CategoryHasChildrenError';
  }
}

// ---------------------------------------------------------------------------
// CategoryNode 타입 (트리 변환용)
// ---------------------------------------------------------------------------

export interface CategoryNode extends DocumentCategory {
  children: CategoryNode[];
}

// ---------------------------------------------------------------------------
// createCategory
// ---------------------------------------------------------------------------

const CreateCategorySchema = z.object({
  boardId: z.number().int().positive(),
  title: z.string().min(1).max(100),
  parentId: z.number().int().positive().nullable().default(null),
  description: z.string().max(500).nullable().default(null),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().default(null),
  listOrder: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  groupIds: z.array(z.number().int()).default([]),
});

export type CreateCategoryInput = z.input<typeof CreateCategorySchema>;

export async function createCategory(
  input: CreateCategoryInput,
  ctx: { prisma: PrismaClient },
): Promise<DocumentCategory> {
  const parsed = CreateCategorySchema.parse(input);

  return ctx.prisma.documentCategory.create({
    data: {
      boardId: parsed.boardId,
      title: parsed.title,
      parentId: parsed.parentId,
      description: parsed.description,
      color: parsed.color,
      listOrder: parsed.listOrder,
      isDefault: parsed.isDefault,
      groupIds: parsed.groupIds,
    },
  });
}

// ---------------------------------------------------------------------------
// listCategoryTree
// ---------------------------------------------------------------------------

export async function listCategoryTree(
  boardId: number,
  ctx: { prisma: PrismaClient },
): Promise<CategoryNode[]> {
  const categories = await ctx.prisma.documentCategory.findMany({
    where: { boardId },
    orderBy: [{ listOrder: 'asc' }, { id: 'asc' }],
  });

  return buildCategoryTree(categories);
}

// ---------------------------------------------------------------------------
// buildCategoryTree — flat list → tree 변환
// ---------------------------------------------------------------------------

/**
 * flat DocumentCategory 배열을 트리 구조로 변환한다.
 * orphan (존재하지 않는 parentId 를 가진 항목) 은 root 로 fallback.
 */
export function buildCategoryTree(categories: DocumentCategory[]): CategoryNode[] {
  const nodeMap = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  // 1단계: 모든 노드를 Map 에 등록
  for (const cat of categories) {
    nodeMap.set(cat.id, { ...cat, children: [] });
  }

  // 2단계: parent-child 관계 구성
  for (const cat of categories) {
    const node = nodeMap.get(cat.id)!;
    if (cat.parentId !== null && nodeMap.has(cat.parentId)) {
      nodeMap.get(cat.parentId)!.children.push(node);
    } else {
      // root 이거나 orphan → root 로 처리
      roots.push(node);
    }
  }

  return roots;
}

// ---------------------------------------------------------------------------
// updateCategory
// ---------------------------------------------------------------------------

const UpdateCategorySchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(100).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  listOrder: z.number().int().optional(),
  isDefault: z.boolean().optional(),
  groupIds: z.array(z.number().int()).optional(),
});

export type UpdateCategoryInput = z.input<typeof UpdateCategorySchema>;

export async function updateCategory(
  input: UpdateCategoryInput,
  ctx: { prisma: PrismaClient },
): Promise<DocumentCategory> {
  const parsed = UpdateCategorySchema.parse(input);
  const { id, ...data } = parsed;

  return ctx.prisma.documentCategory.update({
    where: { id },
    data,
  });
}

// ---------------------------------------------------------------------------
// deleteCategory
// ---------------------------------------------------------------------------

export async function deleteCategory(
  id: number,
  ctx: { prisma: PrismaClient },
): Promise<void> {
  // 자식 카테고리가 있는지 확인
  const child = await ctx.prisma.documentCategory.findFirst({
    where: { parentId: id },
  });

  if (child !== null) {
    throw new CategoryHasChildrenError(id);
  }

  await ctx.prisma.documentCategory.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// incrementDocumentCount — recursive CTE 단일 쿼리로 self + ancestors 갱신
//
// @MX:ANCHOR [AUTO]: self + ancestors 를 단일 recursive CTE 로 원자적으로 갱신.
// @MX:REASON: createDocument/deleteDocument 두 호출자에서 진입. $executeRaw recursive CTE 로
//             N-쿼리 회피, GREATEST(0, ...) 로 음수 방지.
// @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-041
// ---------------------------------------------------------------------------

export async function incrementDocumentCount(
  categoryId: number,
  delta: 1 | -1,
  prisma: PrismaClient | { $executeRaw: PrismaClient['$executeRaw'] },
): Promise<void> {
  await (prisma as PrismaClient).$executeRaw`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id FROM document_categories WHERE id = ${categoryId}
      UNION ALL
      SELECT c.id, c.parent_id
      FROM document_categories c
      JOIN ancestors a ON a.parent_id = c.id
    )
    UPDATE document_categories
    SET document_count = GREATEST(0, document_count + ${delta})
    WHERE id IN (SELECT id FROM ancestors);
  `;
}
