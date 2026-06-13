import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { registerFileEventSubscribers, cascadeDeleteByDocumentId, cascadeDeleteByCommentId } from './events';

function makePrisma() {
  return {
    fileAttachment: {
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
  } as unknown as PrismaClient;
}

function makeEmitters() {
  type Handler = (e: unknown) => void | Promise<void>;
  const docHandlers: Handler[] = [];
  const comHandlers: Handler[] = [];
  return {
    documentEvents: {
      on: vi.fn((_event: string, h: Handler) => { docHandlers.push(h); return { on: vi.fn(), off: vi.fn() }; }),
      off: vi.fn((_event: string, h: Handler) => { const i = docHandlers.indexOf(h); if (i >= 0) docHandlers.splice(i, 1); return { on: vi.fn(), off: vi.fn() }; }),
      emit: (e: unknown) => docHandlers.forEach(h => h(e)),
    },
    commentEvents: {
      on: vi.fn((_event: string, h: Handler) => { comHandlers.push(h); return { on: vi.fn(), off: vi.fn() }; }),
      off: vi.fn((_event: string, h: Handler) => { const i = comHandlers.indexOf(h); if (i >= 0) comHandlers.splice(i, 1); return { on: vi.fn(), off: vi.fn() }; }),
      emit: (e: unknown) => comHandlers.forEach(h => h(e)),
    },
  };
}

describe('registerFileEventSubscribers', () => {
  it('document.deleted 이벤트에 구독한다', () => {
    const prisma = makePrisma();
    const emitters = makeEmitters();
    registerFileEventSubscribers(emitters, { prisma, storage: {} as never });
    expect(emitters.documentEvents.on).toHaveBeenCalledWith('deleted', expect.any(Function));
  });

  it('comment.deleted 이벤트에 구독한다', () => {
    const prisma = makePrisma();
    const emitters = makeEmitters();
    registerFileEventSubscribers(emitters, { prisma, storage: {} as never });
    expect(emitters.commentEvents.on).toHaveBeenCalledWith('deleted', expect.any(Function));
  });

  it('dispose 후 구독이 해제된다', () => {
    const prisma = makePrisma();
    const emitters = makeEmitters();
    const { dispose } = registerFileEventSubscribers(emitters, { prisma, storage: {} as never });
    dispose();
    expect(emitters.documentEvents.off).toHaveBeenCalled();
    expect(emitters.commentEvents.off).toHaveBeenCalled();
  });
});

describe('cascadeDeleteByDocumentId', () => {
  it('documentId로 fileAttachment를 soft-delete한다', async () => {
    const prisma = makePrisma();
    await cascadeDeleteByDocumentId({ documentId: 42 }, { prisma });
    expect(prisma.fileAttachment.updateMany).toHaveBeenCalledWith({
      where: { documentId: 42, isvalid: true },
      data: { isvalid: false },
    });
  });
});

describe('cascadeDeleteByCommentId', () => {
  it('commentId로 fileAttachment를 soft-delete한다', async () => {
    const prisma = makePrisma();
    await cascadeDeleteByCommentId({ commentId: 7 }, { prisma });
    expect(prisma.fileAttachment.updateMany).toHaveBeenCalledWith({
      where: { commentId: 7, isvalid: true },
      data: { isvalid: false },
    });
  });
});
