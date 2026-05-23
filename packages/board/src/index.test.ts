/**
 * packages/board/src/index.test.ts — SPEC-CONTENT-001 Slice A
 *
 * A-1 ~ A-5: boardModule 정의 검증 (RED → GREEN)
 * A-6 ~ A-8: onInstall 훅 + registerModule 통합
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// boardModule 테스트 (A-1 ~ A-5)
// ---------------------------------------------------------------------------

describe('boardModule', () => {
  it('A-1: code === "board", displayName === "Board"', async () => {
    const { boardModule } = await import('./index.js');
    expect(boardModule.code).toBe('board');
    expect(boardModule.displayName).toBe('Board');
  });

  it('A-2: configSchema.parse(defaultBoardConfig) 성공 (동일 객체 반환)', async () => {
    const { boardModule, defaultBoardConfig } = await import('./index.js');
    const result = boardModule.configSchema.parse(defaultBoardConfig);
    expect(result).toMatchObject(defaultBoardConfig);
  });

  it('A-3: configSchema.parse({ orderTarget: "invalid" }) → ZodError', async () => {
    const { boardModule } = await import('./index.js');
    const { ZodError } = await import('zod');
    expect(() => boardModule.configSchema.parse({ orderTarget: 'invalid' })).toThrowError(ZodError);
  });

  it('A-4: cacheTags(42) → ["board:42", "documents:board:42"]', async () => {
    const { boardModule } = await import('./index.js');
    const tags = boardModule.cacheTags?.(42);
    expect(tags).toEqual(['board:42', 'documents:board:42']);
  });

  it('A-5: routes.index 가 정의되어 있고 호출 시 ReactNode 반환', async () => {
    const { boardModule } = await import('./index.js');
    expect(boardModule.routes.index).toBeDefined();
    expect(typeof boardModule.routes.index).toBe('function');
    const fakePrisma = {
      board: { findUnique: vi.fn().mockResolvedValue(null) },
      document: { findMany: vi.fn().mockResolvedValue([]) },
      documentCategory: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const fakeProps = {
      instance: { id: 1, moduleCode: 'board', mid: 'notice', name: '공지', config: null },
      params: {},
      searchParams: {},
      prisma: fakePrisma,
    };
    // 반환값이 null 이 아닌 ReactNode 인지 확인 (string, object 모두 허용)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await boardModule.routes.index!(fakeProps as any);
    expect(node).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// onInstallBoard 테스트 (A-6, A-7)
// ---------------------------------------------------------------------------

describe('onInstallBoard', () => {
  it('A-6: tx.board.create 가 moduleInstanceId + name + defaultBoardConfig 필드로 1회 호출됨', async () => {
    const { onInstallBoard } = await import('./on-install.js');
    const { defaultBoardConfig } = await import('./config.js');

    const mockBoardCreate = vi.fn().mockResolvedValue({ id: 1 });
    const mockTx = { board: { create: mockBoardCreate } };
    const fakeInstance = { id: 42, moduleCode: 'board', mid: 'notice', name: '공지사항' };
    const fakeActor = { memberId: 1 };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await onInstallBoard({ tx: mockTx as any, instance: fakeInstance as any, actor: fakeActor });

    expect(mockBoardCreate).toHaveBeenCalledOnce();
    const callArg = mockBoardCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(callArg?.data?.moduleInstanceId).toBe(42);
    expect(callArg?.data?.name).toBe('공지사항');
    expect(callArg?.data?.listCount).toBe(defaultBoardConfig.listCount);
    expect(callArg?.data?.pageCount).toBe(defaultBoardConfig.pageCount);
  });

  it('A-7: tx.board.create 가 throw 하면 onInstallBoard 도 throw propagation', async () => {
    const { onInstallBoard } = await import('./on-install.js');
    const mockError = new Error('DB error');
    const mockTx = { board: { create: vi.fn().mockRejectedValue(mockError) } };
    const fakeInstance = { id: 1, moduleCode: 'board', mid: 't', name: 'Test' };
    const fakeActor = { memberId: 1 };

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onInstallBoard({ tx: mockTx as any, instance: fakeInstance as any, actor: fakeActor }),
    ).rejects.toThrow('DB error');
  });
});

// ---------------------------------------------------------------------------
// registerModule 통합 (A-8, A-9)
// ---------------------------------------------------------------------------

describe('registerModule integration', () => {
  // registry 는 module-scope singleton 이므로 각 테스트 후 reset
  afterEach(async () => {
    const { resetRegistry } = await import('@rhymix-ts/core/modules');
    resetRegistry();
  });

  it('A-8: registerModule(boardModule) 후 getModule("board") === boardModule', async () => {
    const { boardModule } = await import('./index.js');
    const { registerModule, getModule } = await import('@rhymix-ts/core/modules');
    registerModule(boardModule);
    expect(getModule('board')).toBe(boardModule);
  });

  it('A-9: 중복 등록 → DuplicateModuleError', async () => {
    const { boardModule } = await import('./index.js');
    const { registerModule, DuplicateModuleError } = await import('@rhymix-ts/core/modules');
    registerModule(boardModule);
    expect(() => registerModule(boardModule)).toThrowError(DuplicateModuleError);
  });
});
