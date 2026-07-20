/**
 * create-document.test.ts — SPEC-POLL-001 REQ-POLL-001
 *
 * handleCreateDocumentForm 의 글쓰기 폼 직접 설문 생성 분기를 검증한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCreateDocumentForm } from './create-document';

const { mockCreateDocument } = vi.hoisted(() => ({
  mockCreateDocument: vi.fn(),
}));

vi.mock('@rhymix-ts/document', () => ({
  createDocument: mockCreateDocument,
}));

function makeFormData(fields: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v);
    } else {
      fd.append(key, value);
    }
  }
  return fd;
}

function makeCtx() {
  return {
    prisma: {
      moduleInstance: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ siteId: 1 }),
      },
      $transaction: vi.fn(async (fn: any) =>
        fn({
          poll: { create: vi.fn().mockResolvedValue({ id: 100 }) },
          documentPoll: { create: vi.fn().mockResolvedValue({}) },
        })
      ),
    } as any,
    authorId: 1,
    actor: { userGroupSrl: 1, isAdmin: false },
  };
}

describe('handleCreateDocumentForm — poll section (REQ-POLL-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateDocument.mockResolvedValue({ id: 500 });
  });

  it('creates the document without a poll when pollQuestion is empty', async () => {
    const ctx = makeCtx();
    const formData = makeFormData({
      moduleInstanceId: '1',
      title: 'Title',
      content: 'Content',
    });

    const result = await handleCreateDocumentForm(formData, ctx);

    expect(result).toEqual({ success: true, documentId: 500 });
    expect(ctx.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a poll and attaches it to the new document when the poll section is filled', async () => {
    const ctx = makeCtx();
    const formData = makeFormData({
      moduleInstanceId: '1',
      title: 'Title',
      content: 'Content',
      pollQuestion: '가장 좋아하는 색은?',
      pollOptions: ['빨강', '파랑', ''],
      pollMultiSelect: 'on',
      pollEndsAt: '2026-12-31',
    });

    const result = await handleCreateDocumentForm(formData, ctx);

    expect(result).toEqual({ success: true, documentId: 500 });
    expect(ctx.prisma.moduleInstance.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { siteId: true },
    });
    expect(ctx.prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects with fewer than 2 non-empty options and does not create the document', async () => {
    const ctx = makeCtx();
    const formData = makeFormData({
      moduleInstanceId: '1',
      title: 'Title',
      content: 'Content',
      pollQuestion: '질문',
      pollOptions: ['옵션1', ''],
      pollEndsAt: '2026-12-31',
    });

    const result = await handleCreateDocumentForm(formData, ctx);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/2개 이상/);
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it('rejects when the poll deadline is missing', async () => {
    const ctx = makeCtx();
    const formData = makeFormData({
      moduleInstanceId: '1',
      title: 'Title',
      content: 'Content',
      pollQuestion: '질문',
      pollOptions: ['옵션1', '옵션2'],
    });

    const result = await handleCreateDocumentForm(formData, ctx);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/마감일/);
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it('rejects with more than 10 options', async () => {
    const ctx = makeCtx();
    const formData = makeFormData({
      moduleInstanceId: '1',
      title: 'Title',
      content: 'Content',
      pollQuestion: '질문',
      pollOptions: Array.from({ length: 11 }, (_, i) => `옵션${i + 1}`),
      pollEndsAt: '2026-12-31',
    });

    const result = await handleCreateDocumentForm(formData, ctx);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/10개 이하/);
  });
});
