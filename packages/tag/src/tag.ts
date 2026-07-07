/**
 * tag.ts — SPEC-TAG-001 Tag domain functions
 *
 * Tag 도메인 함수:
 * - upsertTagsOnDocument: 게시물 저장 시 태그 upsert (REQ-TAG-002)
 * - getAutocompleteTags: 태그 자동완성 (REQ-TAG-001)
 * - getTagCloud: 태그 클라우드 데이터 (REQ-TAG-005)
 * - listTags: 태그 목록 조회 (REQ-TAG-006)
 * - mergeTags: 태그 병합 (REQ-TAG-006)
 * - renameTag: 태그 이름 변경 (REQ-TAG-006)
 * - deleteTag: 태그 삭제 (REQ-TAG-006)
 */
// @MX:NOTE [AUTO]: Prisma 모델 타입은 @rhymix-ts/db 가 Prisma 네임스페이스를 재내보내므로
//                   Prisma.TagGetPayload<{}> 로 파생. tag 패키지는 @prisma/client 를
//                   직접 의존하지 않음 (SPEC-TAG-001).
// @MX:REASON: package.json 수정 금지(팀 리드 지시) — Prisma namespace 재내보내기로 타입 확보.
import type { PrismaClient, Prisma } from '@rhymix-ts/db';

/** Prisma Tag 모델 타입 (id, name, count, createdAt) */
type Tag = Prisma.TagGetPayload<Record<string, never>>;

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class TagNotFoundError extends Error {
  readonly code = 'TAG_NOT_FOUND';
  constructor(tagId: number) {
    super(`Tag ${tagId} not found`);
    this.name = 'TagNotFoundError';
  }
}

export class TagAlreadyExistsError extends Error {
  readonly code = 'TAG_ALREADY_EXISTS';
  constructor(name: string) {
    super(`Tag '${name}' already exists`);
    this.name = 'TagAlreadyExistsError';
  }
}

// ---------------------------------------------------------------------------
// REQ-TAG-002: 게시물-태그 연결 (upsert on document save)
// ---------------------------------------------------------------------------

export interface UpsertTagsOnDocumentInput {
  documentId: number;
  tags: string[];
}

/**
 * 게시물 저장 시 태그를 upsert하고 관계를 저장하며 count를 갱신한다.
 * 기존 태그는 upsert로 처리하여 신규 생성 또는 count 증가.
 * 제거된 태그는 count 감소 및 DocumentTag 관계 삭제.
 */
export async function upsertTagsOnDocument(
  input: UpsertTagsOnDocumentInput,
  ctx: { prisma: PrismaClient },
): Promise<void> {
  const { documentId, tags } = input;

  return ctx.prisma.$transaction(async (tx) => {
    // 현재 문서에 연결된 태그 조회
    const existingTags = await tx.documentTag.findMany({
      where: { documentId },
      include: { tag: true },
    });

    const existingTagNames = new Set(existingTags.map((dt) => dt.tag.name));
    const newTagNames = new Set(tags);

    // 제거된 태그 처리 (count 감소 및 관계 삭제)
    for (const documentTag of existingTags) {
      if (!newTagNames.has(documentTag.tag.name)) {
        // count 감소
        await tx.tag.update({
          where: { id: documentTag.tagId },
          data: { count: { decrement: 1 } },
        });
        // 관계 삭제
        await tx.documentTag.delete({
          where: {
            documentId_tagId: {
              documentId,
              tagId: documentTag.tagId,
            },
          },
        });
      }
    }

    // 추가/유지된 태그 처리 (count 증가 및 관계 생성)
    for (const tagName of tags) {
      if (!existingTagNames.has(tagName)) {
        // 태그 upsert (name이 unique이므로 upsert)
        const tag = await tx.tag.upsert({
          where: { name: tagName },
          create: { name: tagName, count: 1 },
          update: { count: { increment: 1 } },
        });

        // 관계 생성
        await tx.documentTag.create({
          data: { documentId, tagId: tag.id },
        });
      }
    }
  });
}

// ---------------------------------------------------------------------------
// REQ-TAG-001: 태그 자동완성
// ---------------------------------------------------------------------------

export interface GetAutocompleteTagsInput {
  query: string;
  limit?: number;
}

export async function getAutocompleteTags(
  input: GetAutocompleteTagsInput,
  ctx: { prisma: PrismaClient },
): Promise<Tag[]> {
  const { query, limit = 10 } = input;

  return ctx.prisma.tag.findMany({
    where: {
      name: {
        contains: query,
        mode: 'insensitive',
      },
    },
    orderBy: { count: 'desc' },
    take: limit,
  });
}

// ---------------------------------------------------------------------------
// REQ-TAG-005: 태그 클라우드 데이터 (top N by count)
// ---------------------------------------------------------------------------

export interface GetTagCloudInput {
  limit?: number;
}

export async function getTagCloud(
  input: GetTagCloudInput,
  ctx: { prisma: PrismaClient },
): Promise<Tag[]> {
  const { limit = 30 } = input;

  return ctx.prisma.tag.findMany({
    where: { count: { gt: 0 } }, // 사용된 태그만
    orderBy: { count: 'desc' },
    take: limit,
  });
}

// ---------------------------------------------------------------------------
// REQ-TAG-006: 관리자 태그 관리
// ---------------------------------------------------------------------------

export interface ListTagsInput {
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'count' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ListTagsResult {
  tags: Tag[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export async function listTags(
  input: ListTagsInput,
  ctx: { prisma: PrismaClient },
): Promise<ListTagsResult> {
  const { page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc' } = input;

  const [tags, totalCount] = await Promise.all([
    ctx.prisma.tag.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    }),
    ctx.prisma.tag.count(),
  ]);

  return {
    tags,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page,
  };
}

export interface MergeTagsInput {
  sourceTagId: number;
  targetTagId: number;
}

/**
 * 태그 병합: sourceTag → targetTag
 * sourceTag가 붙은 모든 문서를 targetTag로 변경 후 sourceTag 삭제
 */
export async function mergeTags(
  input: MergeTagsInput,
  ctx: { prisma: PrismaClient },
): Promise<void> {
  const { sourceTagId, targetTagId } = input;

  return ctx.prisma.$transaction(async (tx) => {
    // 두 태그가 모두 존재하는지 확인
    const [sourceTag, targetTag] = await Promise.all([
      tx.tag.findUnique({ where: { id: sourceTagId } }),
      tx.tag.findUnique({ where: { id: targetTagId } }),
    ]);

    if (!sourceTag) throw new TagNotFoundError(sourceTagId);
    if (!targetTag) throw new TagNotFoundError(targetTagId);

    // sourceTag의 모든 DocumentTag를 targetTag로 이동
    await tx.documentTag.updateMany({
      where: { tagId: sourceTagId },
      data: { tagId: targetTagId },
    });

    // targetTag count 업데이트 (source count + target count)
    await tx.tag.update({
      where: { id: targetTagId },
      data: { count: sourceTag.count + targetTag.count },
    });

    // sourceTag 삭제
    await tx.tag.delete({ where: { id: sourceTagId } });
  });
}

export interface RenameTagInput {
  tagId: number;
  newName: string;
}

export async function renameTag(
  input: RenameTagInput,
  ctx: { prisma: PrismaClient },
): Promise<Tag> {
  const { tagId, newName } = input;

  try {
    return await ctx.prisma.tag.update({
      where: { id: tagId },
      data: { name: newName },
    });
  } catch (error: any) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      throw new TagAlreadyExistsError(newName);
    }
    throw error;
  }
}

export interface DeleteTagInput {
  tagId: number;
}

/**
 * 태그 삭제: 연결된 게시물에서 자동 제거 (onDelete: Cascade)
 */
export async function deleteTag(
  input: DeleteTagInput,
  ctx: { prisma: PrismaClient },
): Promise<Tag> {
  const { tagId } = input;

  const tag = await ctx.prisma.tag.findUnique({ where: { id: tagId } });
  if (!tag) throw new TagNotFoundError(tagId);

  // Cascade delete will automatically remove DocumentTag relations
  return ctx.prisma.tag.delete({ where: { id: tagId } });
}
