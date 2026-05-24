/**
 * extra-keys.ts — SPEC-CONTENT-001 Slice F
 *
 * DocumentExtraKey 도메인 CRUD.
 *
 * @MX:NOTE [AUTO]: 캐시 evict 의무 — createExtraKey / updateExtraKey / deleteExtraKey / reorderExtraKeys
 *                 호출 성공 후 반드시 evictExtraVarsSchemaCache(boardId) 를 호출해야 한다.
 * @MX:REASON: 키 정의 변경 후 stale Zod 스키마가 검증되면 잘못된 데이터를 통과시킬 위험.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-120
 */
import { z } from 'zod';
import type { PrismaClient, DocumentExtraKey } from '@prisma/client';
import { evictExtraVarsSchemaCache } from './extra-vars-schema.js';

// ---------------------------------------------------------------------------
// varOptions 내부 스키마
// ---------------------------------------------------------------------------

const ExtraKeyOptionsSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  defaultValue: z.string().nullable().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  pattern: z.string().optional(),
  options: z.array(z.object({
    value: z.string().min(1).max(80),
    label: z.string().min(1).max(80),
  })).optional(),
  placeholder: z.string().max(200).optional(),
}).strict();

export type ExtraKeyOptions = z.infer<typeof ExtraKeyOptionsSchema>;

// ---------------------------------------------------------------------------
// 에러 클래스
// ---------------------------------------------------------------------------

/**
 * 동일 boardId + varName + langCode 중복 시 발생.
 */
export class ExtraKeyDuplicateNameError extends Error {
  readonly code = 'EXTRA_KEY_DUPLICATE_NAME';
  constructor(public readonly boardId: number, public readonly varName: string) {
    super(`Extra key '${varName}' already exists on board ${boardId}`);
    this.name = 'ExtraKeyDuplicateNameError';
  }
}

/**
 * select/checkbox 타입인데 varOptions.options 가 없을 때 발생.
 */
export class ExtraKeyOptionsRequiredError extends Error {
  readonly code = 'EXTRA_KEY_OPTIONS_REQUIRED';
  constructor(public readonly varType: string) {
    super(`varType '${varType}' requires varOptions.options to be defined`);
    this.name = 'ExtraKeyOptionsRequiredError';
  }
}

// ---------------------------------------------------------------------------
// listExtraKeys
// ---------------------------------------------------------------------------

export async function listExtraKeys(
  input: { boardId: number; langCode?: string },
  ctx: { prisma: PrismaClient },
): Promise<DocumentExtraKey[]> {
  return ctx.prisma.documentExtraKey.findMany({
    where: {
      boardId: input.boardId,
      langCode: input.langCode ?? 'ko',
    },
    orderBy: { varIdx: 'asc' },
  });
}

// ---------------------------------------------------------------------------
// createExtraKey
// ---------------------------------------------------------------------------

const VAR_TYPES = ['text', 'textarea', 'number', 'select', 'checkbox', 'date', 'email', 'url'] as const;
type VarType = typeof VAR_TYPES[number];

const CreateExtraKeySchema = z.object({
  boardId: z.number().int().positive(),
  varName: z.string().min(1).max(50).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'varName must be a valid JS identifier'),
  varType: z.enum(VAR_TYPES),
  varIsRequired: z.boolean().default(false),
  varSearch: z.boolean().default(false),
  varSort: z.boolean().default(false),
  varOptions: ExtraKeyOptionsSchema.nullable().optional(),
  langCode: z.string().default('ko'),
});

export type CreateExtraKeyInput = z.input<typeof CreateExtraKeySchema>;

export async function createExtraKey(
  input: CreateExtraKeyInput,
  ctx: { prisma: PrismaClient },
): Promise<DocumentExtraKey> {
  const parsed = CreateExtraKeySchema.parse(input);

  // select/checkbox 는 options 필수
  if ((parsed.varType === 'select' || parsed.varType === 'checkbox')) {
    const opts = parsed.varOptions as ExtraKeyOptions | null | undefined;
    if (!opts?.options || opts.options.length === 0) {
      throw new ExtraKeyOptionsRequiredError(parsed.varType);
    }
  }

  // 중복 검사
  const existing = await ctx.prisma.documentExtraKey.findFirst({
    where: {
      boardId: parsed.boardId,
      varName: parsed.varName,
      langCode: parsed.langCode,
    },
  });
  if (existing) {
    throw new ExtraKeyDuplicateNameError(parsed.boardId, parsed.varName);
  }

  // varIdx 자동 할당 = max(현재 varIdx) + 1
  const agg = await ctx.prisma.documentExtraKey.aggregate({
    _max: { varIdx: true },
    where: { boardId: parsed.boardId, langCode: parsed.langCode },
  });
  const nextIdx = (agg._max.varIdx ?? -1) + 1;

  const row = await ctx.prisma.documentExtraKey.create({
    data: {
      boardId: parsed.boardId,
      varIdx: nextIdx,
      varName: parsed.varName,
      varType: parsed.varType,
      varIsRequired: parsed.varIsRequired,
      varSearch: parsed.varSearch,
      varSort: parsed.varSort,
      varOptions: parsed.varOptions ?? undefined,
      langCode: parsed.langCode,
    },
  });

  evictExtraVarsSchemaCache(parsed.boardId);
  return row;
}

// ---------------------------------------------------------------------------
// updateExtraKey
// ---------------------------------------------------------------------------

const UpdateExtraKeySchema = z.object({
  id: z.number().int().positive(),
  varName: z.string().min(1).max(50).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).optional(),
  varType: z.enum(VAR_TYPES).optional(),
  varIsRequired: z.boolean().optional(),
  varSearch: z.boolean().optional(),
  varSort: z.boolean().optional(),
  varOptions: ExtraKeyOptionsSchema.nullable().optional(),
  langCode: z.string().optional(),
});

export type UpdateExtraKeyInput = z.input<typeof UpdateExtraKeySchema>;

export async function updateExtraKey(
  input: UpdateExtraKeyInput,
  ctx: { prisma: PrismaClient },
): Promise<DocumentExtraKey> {
  const parsed = UpdateExtraKeySchema.parse(input);

  // 기존 row 확인
  const existing = await ctx.prisma.documentExtraKey.findUniqueOrThrow({
    where: { id: parsed.id },
  });

  const data: Record<string, unknown> = {};
  if (parsed.varName !== undefined) data.varName = parsed.varName;
  if (parsed.varType !== undefined) data.varType = parsed.varType;
  if (parsed.varIsRequired !== undefined) data.varIsRequired = parsed.varIsRequired;
  if (parsed.varSearch !== undefined) data.varSearch = parsed.varSearch;
  if (parsed.varSort !== undefined) data.varSort = parsed.varSort;
  if (parsed.varOptions !== undefined) data.varOptions = parsed.varOptions;
  if (parsed.langCode !== undefined) data.langCode = parsed.langCode;

  const row = await ctx.prisma.documentExtraKey.update({
    where: { id: parsed.id },
    data,
  });

  evictExtraVarsSchemaCache(existing.boardId);
  return row;
}

// ---------------------------------------------------------------------------
// deleteExtraKey
// ---------------------------------------------------------------------------

export async function deleteExtraKey(
  input: { id: number },
  ctx: { prisma: PrismaClient },
): Promise<{ id: number }> {
  const existing = await ctx.prisma.documentExtraKey.findUniqueOrThrow({
    where: { id: input.id },
  });

  await ctx.prisma.documentExtraKey.delete({
    where: { id: input.id },
  });

  evictExtraVarsSchemaCache(existing.boardId);
  return { id: input.id };
}

// ---------------------------------------------------------------------------
// reorderExtraKeys
// ---------------------------------------------------------------------------

export async function reorderExtraKeys(
  input: { boardId: number; idsInOrder: number[] },
  ctx: { prisma: PrismaClient },
): Promise<DocumentExtraKey[]> {
  // 현재 board 의 모든 키 조회
  const allKeys = await ctx.prisma.documentExtraKey.findMany({
    where: { boardId: input.boardId },
  });

  const allIds = new Set(allKeys.map((k) => k.id));

  // 전달된 id 가 모두 유효한지 검사
  for (const id of input.idsInOrder) {
    if (!allIds.has(id)) {
      throw new Error(`Extra key id ${id} does not belong to board ${input.boardId}`);
    }
  }

  // 트랜잭션 내에서 varIdx 재할당
  await ctx.prisma.$transaction(async (tx) => {
    for (let i = 0; i < input.idsInOrder.length; i++) {
      await (tx as unknown as PrismaClient).documentExtraKey.update({
        where: { id: input.idsInOrder[i] },
        data: { varIdx: i },
      });
    }
  });

  evictExtraVarsSchemaCache(input.boardId);

  // 업데이트 후 재조회
  return ctx.prisma.documentExtraKey.findMany({
    where: { boardId: input.boardId },
    orderBy: { varIdx: 'asc' },
  });
}
