/**
 * packages/board/src/extra-keys.test.ts — SPEC-CONTENT-001 Slice F
 *
 * EK-1 ~ EK-7: DocumentExtraKey 도메인 CRUD 검증.
 *
 * REQ-CONTENT-120: 게시판 별 커스텀 필드 정의 CRUD.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Prisma mock 빌더
// ---------------------------------------------------------------------------

function makeExtraKeyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    boardId: 10,
    varIdx: 0,
    varName: 'price',
    varType: 'number',
    varIsRequired: false,
    varSearch: false,
    varSort: false,
    varOptions: null,
    langCode: 'ko',
    ...overrides,
  };
}

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    documentExtraKey: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn().mockResolvedValue({ _max: { varIdx: null } }),
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        documentExtraKey: {
          update: vi.fn(),
          updateMany: vi.fn(),
        },
      }),
    ),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// EK-1: createExtraKey — 7개 타입 각각 정상 생성
// ---------------------------------------------------------------------------

describe('createExtraKey', () => {
  it('EK-1a: text 타입 정상 생성 → row 반환 + varIdx 자동 할당', async () => {
    const { createExtraKey } = await import('./extra-keys.js');
    const mockPrisma = makePrisma();
    const row = makeExtraKeyRow({ varType: 'text', varName: 'title_text' });
    (mockPrisma.documentExtraKey.create as ReturnType<typeof vi.fn>).mockResolvedValue(row);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createExtraKey(
      { boardId: 10, varName: 'title_text', varType: 'text' },
      { prisma: mockPrisma as any },
    );
    expect(result).toMatchObject({ varType: 'text', varName: 'title_text', boardId: 10 });
    expect(mockPrisma.documentExtraKey.create).toHaveBeenCalledOnce();
  });

  it('EK-1b: select 타입 + options → 정상 생성', async () => {
    const { createExtraKey } = await import('./extra-keys.js');
    const mockPrisma = makePrisma();
    const row = makeExtraKeyRow({
      varType: 'select',
      varName: 'rating',
      varOptions: { options: [{ value: '1', label: '별1' }, { value: '5', label: '별5' }] },
    });
    (mockPrisma.documentExtraKey.create as ReturnType<typeof vi.fn>).mockResolvedValue(row);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createExtraKey(
      {
        boardId: 10,
        varName: 'rating',
        varType: 'select',
        varOptions: { options: [{ value: '1', label: '별1' }, { value: '5', label: '별5' }] },
      },
      { prisma: mockPrisma as any },
    );
    expect(result.varType).toBe('select');
  });

  it('EK-1c: checkbox 타입 + options → 정상 생성', async () => {
    const { createExtraKey } = await import('./extra-keys.js');
    const mockPrisma = makePrisma();
    const row = makeExtraKeyRow({
      varType: 'checkbox',
      varName: 'tags_field',
      varOptions: { options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
    });
    (mockPrisma.documentExtraKey.create as ReturnType<typeof vi.fn>).mockResolvedValue(row);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createExtraKey(
      {
        boardId: 10,
        varName: 'tags_field',
        varType: 'checkbox',
        varOptions: { options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
      },
      { prisma: mockPrisma as any },
    );
    expect(result.varType).toBe('checkbox');
  });

  it('EK-1d: number/date/email/url 타입 정상 생성', async () => {
    const { createExtraKey } = await import('./extra-keys.js');

    for (const varType of ['number', 'date', 'email', 'url', 'textarea'] as const) {
      const mockPrisma = makePrisma();
      const row = makeExtraKeyRow({ varType, varName: `field_${varType}` });
      (mockPrisma.documentExtraKey.create as ReturnType<typeof vi.fn>).mockResolvedValue(row);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await createExtraKey(
        { boardId: 10, varName: `field_${varType}`, varType },
        { prisma: mockPrisma as any },
      );
      expect(result.varType).toBe(varType);
    }
  });

  it('EK-1e: varIdx 는 기존 최대 varIdx + 1 로 자동 할당', async () => {
    const { createExtraKey } = await import('./extra-keys.js');
    const mockPrisma = makePrisma();
    // 기존 최대 varIdx = 3
    (mockPrisma.documentExtraKey.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _max: { varIdx: 3 },
    });
    const row = makeExtraKeyRow({ varIdx: 4, varName: 'new_field' });
    (mockPrisma.documentExtraKey.create as ReturnType<typeof vi.fn>).mockResolvedValue(row);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createExtraKey(
      { boardId: 10, varName: 'new_field', varType: 'text' },
      { prisma: mockPrisma as any },
    );
    expect(result.varIdx).toBe(4);
    const createCall = (mockPrisma.documentExtraKey.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(createCall?.data?.varIdx).toBe(4);
  });

  // ---------------------------------------------------------------------------
  // EK-2: 중복 varName → ExtraKeyDuplicateNameError
  // ---------------------------------------------------------------------------

  it('EK-2: 동일 boardId + varName + langCode 중복 → ExtraKeyDuplicateNameError', async () => {
    const { createExtraKey, ExtraKeyDuplicateNameError } = await import('./extra-keys.js');
    const mockPrisma = makePrisma();
    // 중복 findFirst 결과
    (mockPrisma.documentExtraKey.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeExtraKeyRow({ varName: 'price' }),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(
      createExtraKey(
        { boardId: 10, varName: 'price', varType: 'number' },
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow(ExtraKeyDuplicateNameError);
  });

  // ---------------------------------------------------------------------------
  // EK-3: select/checkbox + options 누락 → ExtraKeyOptionsRequiredError
  // ---------------------------------------------------------------------------

  it('EK-3a: select 타입 + varOptions.options 없음 → ExtraKeyOptionsRequiredError', async () => {
    const { createExtraKey, ExtraKeyOptionsRequiredError } = await import('./extra-keys.js');
    const mockPrisma = makePrisma();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(
      createExtraKey(
        { boardId: 10, varName: 'rating', varType: 'select' }, // options 없음
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow(ExtraKeyOptionsRequiredError);
  });

  it('EK-3b: checkbox 타입 + varOptions.options 없음 → ExtraKeyOptionsRequiredError', async () => {
    const { createExtraKey, ExtraKeyOptionsRequiredError } = await import('./extra-keys.js');
    const mockPrisma = makePrisma();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(
      createExtraKey(
        { boardId: 10, varName: 'multi_tags', varType: 'checkbox' },
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow(ExtraKeyOptionsRequiredError);
  });
});

// ---------------------------------------------------------------------------
// EK-4: updateExtraKey — 부분 업데이트
// ---------------------------------------------------------------------------

describe('updateExtraKey', () => {
  it('EK-4: label/required/options 부분 업데이트 → 업데이트된 row 반환', async () => {
    const { updateExtraKey } = await import('./extra-keys.js');
    const mockPrisma = makePrisma();
    const updatedRow = makeExtraKeyRow({
      varIsRequired: true,
      varOptions: { label: '가격', min: 0, max: 100 },
    });
    (mockPrisma.documentExtraKey.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedRow);
    // findUniqueOrThrow 로 기존 row 가져오기
    (mockPrisma.documentExtraKey.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeExtraKeyRow(),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await updateExtraKey(
      { id: 1, varIsRequired: true, varOptions: { label: '가격', min: 0, max: 100 } },
      { prisma: mockPrisma as any },
    );
    expect(result.varIsRequired).toBe(true);
    expect(mockPrisma.documentExtraKey.update).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// EK-5: deleteExtraKey — row 제거
// ---------------------------------------------------------------------------

describe('deleteExtraKey', () => {
  it('EK-5: row 제거 → { id } 반환', async () => {
    const { deleteExtraKey } = await import('./extra-keys.js');
    const mockPrisma = makePrisma();
    (mockPrisma.documentExtraKey.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeExtraKeyRow({ id: 5 }),
    );
    (mockPrisma.documentExtraKey.delete as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeExtraKeyRow({ id: 5 }),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await deleteExtraKey({ id: 5 }, { prisma: mockPrisma as any });
    expect(result).toMatchObject({ id: 5 });
    expect(mockPrisma.documentExtraKey.delete).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// EK-6: reorderExtraKeys — varIdx 재할당
// ---------------------------------------------------------------------------

describe('reorderExtraKeys', () => {
  it('EK-6: 5개 키 순서 뒤집기 → varIdx 0..4 재할당', async () => {
    const { reorderExtraKeys } = await import('./extra-keys.js');

    const txUpdate = vi.fn().mockResolvedValue({ id: 1 });
    const mockPrisma = {
      documentExtraKey: {
        findMany: vi.fn().mockResolvedValue([
          makeExtraKeyRow({ id: 1, varIdx: 0 }),
          makeExtraKeyRow({ id: 2, varIdx: 1 }),
          makeExtraKeyRow({ id: 3, varIdx: 2 }),
          makeExtraKeyRow({ id: 4, varIdx: 3 }),
          makeExtraKeyRow({ id: 5, varIdx: 4 }),
        ]),
      },
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          documentExtraKey: { update: txUpdate },
        }),
      ),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await reorderExtraKeys(
      { boardId: 10, idsInOrder: [5, 4, 3, 2, 1] }, // 역순
      { prisma: mockPrisma as any },
    );
    // 5번 update 호출
    expect(txUpdate).toHaveBeenCalledTimes(5);
    // 첫 번째 update 호출 → id=5 이 varIdx=0
    const firstCall = txUpdate.mock.calls[0]?.[0] as { where: { id: number }; data: { varIdx: number } };
    expect(firstCall?.where?.id).toBe(5);
    expect(firstCall?.data?.varIdx).toBe(0);
    // 결과는 배열
    expect(Array.isArray(result)).toBe(true);
  });

  it('EK-6b: idsInOrder 에 없는 id 포함 → 에러', async () => {
    const { reorderExtraKeys } = await import('./extra-keys.js');
    const mockPrisma = {
      documentExtraKey: {
        findMany: vi.fn().mockResolvedValue([
          makeExtraKeyRow({ id: 1 }),
          makeExtraKeyRow({ id: 2 }),
        ]),
      },
      $transaction: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(
      reorderExtraKeys(
        { boardId: 10, idsInOrder: [1, 999] }, // 999는 없는 id
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// EK-7: listExtraKeys — varIdx 오름차순 + langCode 필터
// ---------------------------------------------------------------------------

describe('listExtraKeys', () => {
  it('EK-7: boardId + langCode 필터 → varIdx 오름차순 반환', async () => {
    const { listExtraKeys } = await import('./extra-keys.js');
    const mockPrisma = makePrisma();
    const rows = [
      makeExtraKeyRow({ id: 1, varIdx: 0 }),
      makeExtraKeyRow({ id: 2, varIdx: 1 }),
    ];
    (mockPrisma.documentExtraKey.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(rows);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listExtraKeys({ boardId: 10 }, { prisma: mockPrisma as any });
    expect(result).toHaveLength(2);
    expect(mockPrisma.documentExtraKey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ boardId: 10, langCode: 'ko' }),
        orderBy: { varIdx: 'asc' },
      }),
    );
  });

  it('EK-7b: langCode 명시적 지정 → 해당 langCode 로 필터', async () => {
    const { listExtraKeys } = await import('./extra-keys.js');
    const mockPrisma = makePrisma();
    (mockPrisma.documentExtraKey.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await listExtraKeys({ boardId: 10, langCode: 'en' }, { prisma: mockPrisma as any });
    expect(mockPrisma.documentExtraKey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ langCode: 'en' }),
      }),
    );
  });
});
