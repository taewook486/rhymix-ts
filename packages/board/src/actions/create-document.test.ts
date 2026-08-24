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
      user: {
        findUnique: vi.fn().mockResolvedValue({ nickName: '관리자닉' }),
      },
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

describe('handleCreateDocumentForm — 작성자 닉네임 스냅샷', () => {
  beforeEach(() => {
    mockCreateDocument.mockReset();
    mockCreateDocument.mockResolvedValue({ id: 1 });
  });

  it('로그인 작성자의 nickName 을 스냅샷해 createDocument 로 넘긴다', async () => {
    // 목록 렌더는 doc.nickName 스냅샷을 읽으므로(index-page.tsx),
    // 여기서 null 을 넘기면 모든 글의 작성자가 '-' 로 표시된다.
    const ctx = makeCtx();
    await handleCreateDocumentForm(
      makeFormData({ moduleInstanceId: '1', title: '제목', content: '본문' }),
      ctx
    );

    expect(mockCreateDocument).toHaveBeenCalledTimes(1);
    const arg = mockCreateDocument.mock.calls[0]![0];
    expect(arg.authorId).toBe(1);
    expect(arg.nickName).toBe('관리자닉');
  });

  it('비로그인(authorId=null)이면 nickName 을 조회하지 않고 null 로 둔다', async () => {
    const ctx = makeCtx();
    ctx.authorId = null as any;
    await handleCreateDocumentForm(
      makeFormData({ moduleInstanceId: '1', title: '제목', content: '본문' }),
      ctx
    );

    const arg = mockCreateDocument.mock.calls[0]![0];
    expect(arg.nickName).toBeNull();
    expect((ctx.prisma as any).user.findUnique).not.toHaveBeenCalled();
  });
});
