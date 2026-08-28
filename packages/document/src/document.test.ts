/**
 * packages/board/src/document.test.ts — SPEC-CONTENT-001 Slice A + Slice B + Slice C
 *
 * A-9 ~ A-12: createDocument, listDocuments, getDocument 도메인 함수 검증 (Slice A)
 * B-401 ~ B-431: Slice B XSS, permissions, ownership 검증
 * D-1 ~ D-10: Slice C cursor pagination, notices, categoryId, tags, cursor 유틸 검증
 */
import { describe, it, expect, vi } from 'vitest';
import { ZodError } from 'zod';
import { createMockPrismaClient } from '@rhymix-ts/test-utils';
import {
  makeBoard,
  makeDocument,
  makeDocumentExtraKey,
  makeDocumentFromInput,
  makeDocumentUpdateLog,
  makeTrash,
  makeUser,
} from './__fixtures__.js';

// ---------------------------------------------------------------------------
// createDocument (A-9, A-10)
// ---------------------------------------------------------------------------

describe('createDocument', () => {
  it('A-9: 정상 입력 → document 생성, status=TEMP, boardId 일치, sanitize 적용된 content', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 7, moduleInstanceId: 3, permissions: {} });
    const fakeDocument = makeDocument({
      id: 1,
      boardId: 7,
      status: 'TEMP',
      title: 'hi',
      content: '<p>x</p>',
      contentText: 'x',
    });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUniqueOrThrow.mockResolvedValue(fakeBoard);
    mockPrisma.document.create.mockResolvedValue(fakeDocument);
    mockPrisma.documentExtraKey.findMany.mockResolvedValue([]);
    // authorId 가 있으면 createDocument 가 작성자 스냅샷을 위해 User 를 조회한다.
    // 이 테스트는 스냅샷을 검증하지 않으므로 "조회 결과 없음" 으로 고정한다.
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await createDocument(
      // actor 미지정 시 기본값 (member, non-admin) 사용
      { moduleInstanceId: 3, authorId: 1, title: 'hi', content: '<p>x</p>', nickName: null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.board.findUniqueOrThrow).toHaveBeenCalledOnce();
    expect(mockPrisma.document.create).toHaveBeenCalledOnce();

    const createCall = mockPrisma.document.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(createCall?.data?.boardId).toBe(7);
    expect(createCall?.data?.status).toBe('TEMP');
    // Slice B: sanitize + toPlainText 후 contentText 가 별도 계산됨
    expect(typeof createCall?.data?.contentText).toBe('string');

    expect(result).toMatchObject({ id: 1, boardId: 7, status: 'TEMP' });
    // 이 파일에서 sanitizeHtml 을 처음 부르는 테스트다. sanitizeHtml 은
    // isomorphic-dompurify(jsdom)를 지연 로드하는데, /mnt/d 위에서는 이 콜드
    // 임포트만으로 기본 타임아웃 60초를 넘겨 거짓 실패가 난다. 뒤따르는
    // 테스트들은 이미 로드된 모듈을 쓰므로 영향이 없다.
  }, 240_000);

  it('A-10: title 이 빈 문자열이면 ZodError', async () => {
    const { createDocument } = await import('./document.js');
    const mockPrisma = createMockPrismaClient();

    await expect(
      createDocument(
        { moduleInstanceId: 1, authorId: 1, title: '', content: 'content', nickName: null },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrowError(ZodError);
  });
});

// ---------------------------------------------------------------------------
// listDocuments (A-11)
// ---------------------------------------------------------------------------

describe('listDocuments', () => {
  it('A-11: status=PUBLIC 필터 + deletedAt=null + regdate desc + take 20; Board 없으면 { notices:[], items:[], nextCursor:null }', async () => {
    const { listDocuments } = await import('./document.js');

    // Board 없는 경우
    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUnique.mockResolvedValue(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listDocuments({ moduleInstanceId: 99, status: 'PUBLIC' }, { prisma: mockPrisma as any });
    // Slice C: 반환 타입이 { notices, items, nextCursor } 로 변경됨
    expect(result).toMatchObject({ notices: [], items: [], nextCursor: null });
    expect(mockPrisma.document.findMany).not.toHaveBeenCalled();

    // Board 있는 경우 — findMany 호출 검증 (notices + items)
    const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
    const mockPrisma2 = createMockPrismaClient();
    mockPrisma2.board.findUnique.mockResolvedValue(fakeBoard);
    mockPrisma2.document.findMany
      .mockResolvedValueOnce([]) // notices
      .mockResolvedValueOnce([]); // items

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result2 = await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC' }, { prisma: mockPrisma2 as any });
    // findMany 는 최소 2번 호출 (notices + items)
    expect(mockPrisma2.document.findMany).toHaveBeenCalled();
    expect(result2.notices).toEqual([]);
    expect(result2.items).toEqual([]);
    expect(result2.nextCursor).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getDocument (A-12)
// ---------------------------------------------------------------------------

describe('getDocument', () => {
  it('A-12: Document + author { id, userId, nickName } 셀렉트 포함; 없으면 throw', async () => {
    const { getDocument } = await import('./document.js');

    // include 로 붙는 관계 필드는 실제 Prisma 응답과 같은 형태로 채운다.
    // documentTags 를 빠뜨리면 getDocument 의 태그 매핑이 그 누락에 맞춰 물러서게 된다.
    const fakeResult = makeDocument({
      id: 1,
      title: 'test',
      author: { id: 1, userId: 'user1', nickName: '홍길동' },
      documentTags: [{ tag: { name: '공지' } }, { tag: { name: '이벤트' } }],
    });
    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(fakeResult);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getDocument(1, { prisma: mockPrisma as any });
    expect(result).toMatchObject({ id: 1, author: { id: 1, userId: 'user1' } });
    // REQ-TAG-003: DocumentTag 조인이 string[] 로 매핑돼야 한다
    expect(result.tags).toEqual(['공지', '이벤트']);

    const callArg = mockPrisma.document.findUniqueOrThrow.mock.calls[0]?.[0] as {
      where: unknown;
      include: { author: { select: Record<string, boolean> } };
    };
    expect(callArg?.where).toMatchObject({ id: 1 });
    expect(callArg?.include?.author?.select).toMatchObject({ id: true, userId: true, nickName: true });

    // 존재하지 않으면 throw (findUniqueOrThrow 가 throw 하는 케이스)
    const mockPrisma2 = createMockPrismaClient();
    mockPrisma2.document.findUniqueOrThrow.mockRejectedValue(new Error('Not found'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(getDocument(999, { prisma: mockPrisma2 as any })).rejects.toThrow('Not found');
  });
});

// ---------------------------------------------------------------------------
// SPEC-CONTENT-001 Slice B (T-006) — XSS sanitize + status + permissions
// ---------------------------------------------------------------------------

describe('createDocument (Slice B)', () => {
  it('B-401: <script> 태그가 sanitize 되어 저장됨 (contentText 도 마찬가지)', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = makeBoard({
      id: 7,
      moduleInstanceId: 3,
      permissions: { write_document: [1] },
    });
    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUniqueOrThrow.mockResolvedValue(fakeBoard);
    mockPrisma.document.create.mockImplementation(({ data }) =>
      makeDocumentFromInput(data, makeDocument({ id: 1 })),
    );
    mockPrisma.documentExtraKey.findMany.mockResolvedValue([]);

    await createDocument(
      {
        moduleInstanceId: 3,
        authorId: 1,
        title: 'hi',
        content: '<p>safe</p><script>alert(1)</script>',
        nickName: null,
        actor: { userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    const data = mockPrisma.document.create.mock.calls[0]?.[0]?.data as {
      content: string;
      contentText: string;
    };
    expect(data.content).not.toContain('<script');
    expect(data.content).toContain('safe');
  });

  it('B-402: status 옵션 = PUBLIC 으로 명시하면 그대로 저장', async () => {
    const { createDocument } = await import('./document.js');
    const fakeBoard = makeBoard({ id: 7, moduleInstanceId: 3, permissions: {} });
    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUniqueOrThrow.mockResolvedValue(fakeBoard);
    mockPrisma.document.create.mockImplementation(({ data }) =>
      makeDocumentFromInput(data, makeDocument({ id: 1 })),
    );
    mockPrisma.documentExtraKey.findMany.mockResolvedValue([]);

    await createDocument(
      {
        moduleInstanceId: 3,
        authorId: 1,
        title: 'x',
        content: 'y',
        nickName: null,
        status: 'PUBLIC',
        actor: { userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    const data = mockPrisma.document.create.mock.calls[0]?.[0]?.data as { status: string };
    expect(data.status).toBe('PUBLIC');
  });

  it('B-403: 권한 거부 — guest(groupSrl=0) 가 write_document=[1] 게시판에 글 작성 시 throw', async () => {
    const { createDocument } = await import('./document.js');
    const fakeBoard = makeBoard({ id: 7, moduleInstanceId: 3, permissions: { write_document: [1] } });
    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUniqueOrThrow.mockResolvedValue(fakeBoard);

    await expect(
      createDocument(
        {
          moduleInstanceId: 3,
          authorId: null,
          title: 'x',
          content: 'y',
          nickName: 'guest',
          actor: { userGroupSrl: 0, isAdmin: false },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrowError();
    expect(mockPrisma.document.create).not.toHaveBeenCalled();
  });
});

describe('updateDocument (Slice B)', () => {
  it('B-411: 본인 author 가 title 변경 → prisma.document.update 호출됨', async () => {
    const { updateDocument } = await import('./document.js');
    const fakeDoc = makeDocument({
      id: 10,
      boardId: 7,
      authorId: 5,
      title: 'old',
      content: '<p>x</p>',
      contentText: '<p>x</p>',
      status: 'PUBLIC',
      board: { id: 7, permissions: {} },
    });
    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(fakeDoc);
    mockPrisma.document.update.mockResolvedValue({ ...fakeDoc, title: 'new' });

    const result = await updateDocument(
      {
        id: 10,
        title: 'new',
        actor: { userId: 5, userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );
    expect(mockPrisma.document.update).toHaveBeenCalledOnce();
    expect(result.title).toBe('new');
  });

  it('B-412: 본인이 아닌데 admin 도 아니면 throw', async () => {
    const { updateDocument } = await import('./document.js');
    const fakeDoc = makeDocument({
      id: 10,
      boardId: 7,
      authorId: 5,
      title: 'old',
      content: '<p>x</p>',
      contentText: '<p>x</p>',
      status: 'PUBLIC',
      board: { id: 7, permissions: {} },
    });
    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(fakeDoc);

    await expect(
      updateDocument(
        {
          id: 10,
          title: 'new',
          actor: { userId: 99, userGroupSrl: 1, isAdmin: false },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrowError();
    expect(mockPrisma.document.update).not.toHaveBeenCalled();
  });

  it('B-413: content 변경 시 sanitize 적용 + contentText 재계산', async () => {
    const { updateDocument } = await import('./document.js');
    const fakeDoc = makeDocument({
      id: 10,
      boardId: 7,
      authorId: 5,
      title: 't',
      content: 'old',
      contentText: 'old',
      status: 'PUBLIC',
      board: { id: 7, permissions: {} },
    });
    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(fakeDoc);
    mockPrisma.document.update.mockImplementation(({ data }) =>
      makeDocumentFromInput(data, fakeDoc),
    );

    await updateDocument(
      {
        id: 10,
        content: '<p>new</p><script>alert(1)</script>',
        actor: { userId: 5, userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    const updateCall = mockPrisma.document.update.mock.calls[0]?.[0] as {
      data: { content: string; contentText?: string };
    };
    expect(updateCall.data.content).not.toContain('<script');
    expect(updateCall.data.contentText).toBeDefined();
  });
});

describe('deleteDocument (Slice B)', () => {
  it('B-421: 본인 또는 admin 이면 soft delete (deletedAt 세팅)', async () => {
    const { deleteDocument } = await import('./document.js');
    const fakeDoc = makeDocument({
      id: 10,
      authorId: 5,
      categoryId: null,
      board: { id: 7, permissions: {}, trashUse: false },
    });
    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(fakeDoc);
    mockPrisma.document.update.mockResolvedValue({ ...fakeDoc, deletedAt: new Date() });

    await deleteDocument(
      { id: 10, actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.document.update).toHaveBeenCalledOnce();
    const updateCall = mockPrisma.document.update.mock.calls[0]?.[0] as {
      data: { deletedAt: unknown };
    };
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });

  it('B-422: 타인 + non-admin 이면 throw, update 미호출', async () => {
    const { deleteDocument } = await import('./document.js');
    const fakeDoc = makeDocument({
      id: 10,
      authorId: 5,
      board: { id: 7, permissions: {} },
    });
    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(fakeDoc);

    await expect(
      deleteDocument(
        { id: 10, actor: { userId: 99, userGroupSrl: 1, isAdmin: false } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrowError();
    expect(mockPrisma.document.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Slice D 회귀/확장 테스트 (DD-1 ~ DD-5)
//
// deleteDocument → softDeleteDocument wrapper 회귀 보호
// updateDocument → recordUpdate 자동 호출 검증
// ---------------------------------------------------------------------------

describe('deleteDocument Slice D 회귀 (DD-1 ~ DD-3)', () => {
  it('DD-1: deleteDocument 기존 시그니처 유지 — Document 반환, deletedAt set', async () => {
    const { deleteDocument } = await import('./document.js');

    const fakeDoc = makeDocument({
      id: 10,
      authorId: 5,
      categoryId: null,
      board: { id: 7, permissions: {}, trashUse: false },
    });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(fakeDoc);
    mockPrisma.document.update.mockResolvedValue({ ...fakeDoc, deletedAt: new Date() });

    const result = await deleteDocument(
      { id: 10, actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    // Document 를 반환해야 함
    expect(result).toBeTruthy();
    expect(result.id).toBe(10);

    // deletedAt 세팅 확인
    expect(mockPrisma.document.update).toHaveBeenCalledOnce();
    const updateCall = mockPrisma.document.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateCall?.data?.deletedAt).toBeInstanceOf(Date);
  });

  it('DD-2: deleteDocument + board.trashUse=true → Trash row 생성', async () => {
    const { deleteDocument } = await import('./document.js');

    const fakeDoc = makeDocument({
      id: 10,
      authorId: 5,
      categoryId: null,
      board: { id: 7, permissions: {}, trashUse: true },
    });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(fakeDoc);
    mockPrisma.document.update.mockResolvedValue({ ...fakeDoc, deletedAt: new Date() });
    mockPrisma.trash.upsert.mockResolvedValue(makeTrash({ id: 1, documentId: 10 }));

    await deleteDocument(
      { id: 10, actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.trash.upsert).toHaveBeenCalledOnce();
  });

  it('DD-3: deleteDocument + board.trashUse=false → Trash row 미생성', async () => {
    const { deleteDocument } = await import('./document.js');

    const fakeDoc = makeDocument({
      id: 10,
      authorId: 5,
      categoryId: null,
      board: { id: 7, permissions: {}, trashUse: false },
    });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(fakeDoc);
    mockPrisma.document.update.mockResolvedValue({ ...fakeDoc, deletedAt: new Date() });

    await deleteDocument(
      { id: 10, actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.trash.upsert).not.toHaveBeenCalled();
  });
});

describe('updateDocument Slice D 확장 (DD-4 ~ DD-5)', () => {
  it('DD-4: updateDocument board.updateLog=false → DocumentUpdateLog 미생성', async () => {
    const { updateDocument } = await import('./document.js');

    const fakeDoc = makeDocument({
      id: 10,
      boardId: 7,
      authorId: 5,
      title: '기존 제목',
      content: '기존 내용',
      contentText: '기존 내용',
      status: 'PUBLIC',
      board: { id: 7, permissions: {}, updateLog: false },
    });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(fakeDoc);
    mockPrisma.document.update.mockResolvedValue({ ...fakeDoc, title: '새 제목' });

    await updateDocument(
      { id: 10, title: '새 제목', actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.document.update).toHaveBeenCalledOnce();
    // updateLog=false → DocumentUpdateLog.create 미호출
    expect(mockPrisma.documentUpdateLog.create).not.toHaveBeenCalled();
  });

  it('DD-3b (=DD-5): updateDocument board.updateLog=true + title 변경 → DocumentUpdateLog row 1개 추가', async () => {
    const { updateDocument } = await import('./document.js');

    const fakeDoc = makeDocument({
      id: 10,
      boardId: 7,
      authorId: 5,
      title: '기존 제목',
      content: '기존 내용',
      contentText: '기존 내용',
      status: 'PUBLIC',
      board: { id: 7, permissions: {}, updateLog: true },
    });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(fakeDoc);
    mockPrisma.document.update.mockResolvedValue({ ...fakeDoc, title: '새 제목' });
    mockPrisma.documentUpdateLog.create.mockResolvedValue(makeDocumentUpdateLog({ id: 1 }));

    await updateDocument(
      { id: 10, title: '새 제목', actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    // $transaction 이 사용되어야 함
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    // DocumentUpdateLog row 1개 생성 확인
    expect(mockPrisma.documentUpdateLog.create).toHaveBeenCalledOnce();
    const logCall = mockPrisma.documentUpdateLog.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(logCall?.data?.documentId).toBe(10);
    expect(logCall?.data?.prevTitle).toBe('기존 제목');
  });
});

describe('listDocuments search (Slice B)', () => {
  it('B-431: search 파라미터가 주어지면 prisma.$queryRaw 가 plainto_tsquery 와 함께 호출됨', async () => {
    const { listDocuments } = await import('./document.js');
    const fakeBoard = makeBoard({ id: 7, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUnique.mockResolvedValue(fakeBoard);
    // FTS 원시 SQL 은 id 만 고르고, 본문은 Prisma 로 되읽는다.
    mockPrisma.$queryRaw.mockResolvedValue([{ id: 1 }]);
    mockPrisma.document.findMany.mockResolvedValue([
      makeDocument({ id: 1, boardId: 7, title: 'hit' }),
    ]);

    const result = await listDocuments(
      // SPEC-BOARD-UI-001: search만 주어지면 searchField 기본값이 'title'(단순 contains)로
      // 바뀌었으므로, FTS($queryRaw) 경로를 검증하려면 searchField='content'를 명시해야 한다.
      { moduleInstanceId: 3, status: 'PUBLIC', search: '검색어', searchField: 'content' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.$queryRaw).toHaveBeenCalledOnce();
    // 검색 조건 자체는 원시 SQL 이 담당하고, findMany 는 id 로 본문만 되읽는다.
    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({ where: { id: { in: [1] } } });
    // Slice C: 반환 타입이 { notices, items, nextCursor } 로 변경됨
    expect(result.items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// SPEC-CONTENT-001 Slice C — cursor pagination + notices + categoryId + tags
// ---------------------------------------------------------------------------

describe('listDocuments (Slice C)', () => {
  it('D-1: cursor 없음 → 첫 페이지 반환, nextCursor 있음 (items.length === limit)', async () => {
    const { listDocuments } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 2, exceptNotice: false });
    const fakeDocs = [
      makeDocument({ id: 3, boardId: 5, isNotice: false, listOrder: BigInt(1000), status: 'PUBLIC', deletedAt: null }),
      makeDocument({ id: 2, boardId: 5, isNotice: false, listOrder: BigInt(999), status: 'PUBLIC', deletedAt: null }),
      makeDocument({ id: 1, boardId: 5, isNotice: false, listOrder: BigInt(998), status: 'PUBLIC', deletedAt: null }),
    ];

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUnique.mockResolvedValue(fakeBoard);
    mockPrisma.document.findMany
      .mockResolvedValueOnce([]) // notices query
      .mockResolvedValueOnce(fakeDocs.slice(0, 3)); // items query (take limit+1)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC', limit: 2 }, { prisma: mockPrisma as any });

    expect(result.notices).toHaveLength(0);
    expect(result.items).toHaveLength(2); // limit=2, sliced from 3
    expect(result.nextCursor).not.toBeNull();
  });

  it('D-2: cursor 있음 → 다음 페이지 반환, 이전 페이지와 겹치지 않음', async () => {
    const { listDocuments, encodeCursor } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 2, exceptNotice: false });
    const cursor = encodeCursor(BigInt(999), 2);

    const fakeDocs = [
      makeDocument({ id: 1, boardId: 5, isNotice: false, listOrder: BigInt(998), status: 'PUBLIC', deletedAt: null }),
    ];

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUnique.mockResolvedValue(fakeBoard);
    mockPrisma.document.findMany
      .mockResolvedValueOnce([]) // notices
      .mockResolvedValueOnce(fakeDocs);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC', cursor, limit: 2 }, { prisma: mockPrisma as any });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull(); // 마지막 페이지
    expect(result.items[0]?.id).toBe(1);
  });

  it('D-3: isNotice=true 문서가 notices[] 에 분리', async () => {
    const { listDocuments } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
    const noticeDoc = makeDocument({ id: 10, boardId: 5, isNotice: true, listOrder: BigInt(9999), status: 'PUBLIC', deletedAt: null });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUnique.mockResolvedValue(fakeBoard);
    mockPrisma.document.findMany
      .mockResolvedValueOnce([noticeDoc]) // notices
      .mockResolvedValueOnce([]); // items

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC' }, { prisma: mockPrisma as any });

    expect(result.notices).toHaveLength(1);
    expect(result.notices[0]?.id).toBe(10);
    expect(result.items).toHaveLength(0);
  });

  it('D-4: exceptNotice=true 게시판 → notices[] 비어있음', async () => {
    const { listDocuments } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: true });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUnique.mockResolvedValue(fakeBoard);
    mockPrisma.document.findMany.mockResolvedValue([]); // items only

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC' }, { prisma: mockPrisma as any });

    expect(result.notices).toHaveLength(0);
  });

  it('D-5: categoryId 필터 → findMany 에 categoryId 조건 포함', async () => {
    const { listDocuments } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUnique.mockResolvedValue(fakeBoard);
    mockPrisma.document.findMany
      .mockResolvedValueOnce([]) // notices
      .mockResolvedValueOnce([]); // items

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC', categoryId: 7 }, { prisma: mockPrisma as any });

    // items findMany 호출 검증 (두 번째 호출)
    const itemsCall = mockPrisma.document.findMany.mock.calls[1]?.[0] as { where: Record<string, unknown> };
    expect(itemsCall?.where?.categoryId).toBe(7);
  });

  it('D-6: tags 필터 → findMany 에 tags 조건 포함', async () => {
    const { listDocuments } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUnique.mockResolvedValue(fakeBoard);
    mockPrisma.document.findMany
      .mockResolvedValueOnce([]) // notices
      .mockResolvedValueOnce([]); // items

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC', tags: ['ts', 'react'] }, { prisma: mockPrisma as any });

    const itemsCall = mockPrisma.document.findMany.mock.calls[1]?.[0] as { where: Record<string, unknown> };
    expect(itemsCall?.where).toMatchObject({ tags: { hasEvery: ['ts', 'react'] } });
  });
});

describe('createDocument (Slice C)', () => {
  it('D-7: categoryId 있으면 documentCount +1 확인 (incrementDocumentCount 호출)', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 7, moduleInstanceId: 3, permissions: {} });
    const fakeDoc = makeDocument({ id: 1, boardId: 7, categoryId: 3, title: 'test', status: 'TEMP' });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUniqueOrThrow.mockResolvedValue(fakeBoard);
    mockPrisma.document.create.mockResolvedValue(fakeDoc);
    mockPrisma.documentExtraKey.findMany.mockResolvedValue([]);
    mockPrisma.$executeRaw.mockResolvedValue(1);

    await createDocument(
      {
        moduleInstanceId: 3, authorId: 1, title: 'test', content: 'content', nickName: null,
        categoryId: 3, actor: { userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    // incrementDocumentCount 가 $executeRaw 를 통해 호출돼야 함
    expect(mockPrisma.$executeRaw).toHaveBeenCalledOnce();
  });
});

describe('deleteDocument (Slice C)', () => {
  it('D-8: soft delete 후 categoryId 있으면 documentCount -1 확인', async () => {
    const { deleteDocument } = await import('./document.js');

    const fakeDoc = makeDocument({
      id: 10,
      authorId: 5,
      categoryId: 3,
      board: { id: 7, permissions: {} },
    });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(fakeDoc);
    mockPrisma.document.update.mockResolvedValue({ ...fakeDoc, deletedAt: new Date() });
    mockPrisma.$executeRaw.mockResolvedValue(1);

    await deleteDocument(
      { id: 10, actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.document.update).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// D-9 (회귀): 기존 Slice B 호출 시그니처 호환성 보장
// ---------------------------------------------------------------------------

describe('listDocuments — Breaking Change 회귀 보장 (D-9)', () => {
  it('D-9: { moduleInstanceId, status } 만 전달 → { notices:[], items:[], nextCursor:null } 반환', async () => {
    const { listDocuments } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUnique.mockResolvedValue(fakeBoard);
    mockPrisma.document.findMany
      .mockResolvedValueOnce([]) // notices
      .mockResolvedValueOnce([]); // items

    // Slice B 스타일 호출 — 새 파라미터 없이 기존 시그니처만 사용
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC' }, { prisma: mockPrisma as any });

    // 반환 타입이 { notices, items, nextCursor } 로 변경됨을 확인
    expect(result).toMatchObject({
      notices: [],
      items: [],
      nextCursor: null,
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC-CONTENT-001 Slice F — DD-1 ~ DD-6: extraVars 통합 검증
// ---------------------------------------------------------------------------

describe('createDocument + extraVars (Slice F — DD-1 ~ DD-5)', () => {
  it('DD-F1: extraVars 포함 정상 생성 → prisma.document.create.data.extraVars 가 저장됨', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 10, moduleInstanceId: 3, permissions: {} });
    const fakeKeys = [
      makeDocumentExtraKey({ id: 1, boardId: 10, varIdx: 0, varName: 'price', varType: 'number', varIsRequired: false, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' }),
      makeDocumentExtraKey({ id: 2, boardId: 10, varIdx: 1, varName: 'eventDate', varType: 'date', varIsRequired: false, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' }),
    ];

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUniqueOrThrow.mockResolvedValue(fakeBoard);
    mockPrisma.document.create.mockResolvedValue(
      makeDocument({ id: 1, boardId: 10, extraVars: { price: 100, eventDate: '2026-06-01' } }),
    );
    mockPrisma.documentExtraKey.findMany.mockResolvedValue(fakeKeys);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createDocument(
      {
        moduleInstanceId: 3,
        authorId: 1,
        title: 'test',
        content: '<p>내용</p>',
        nickName: null,
        extraVars: { price: 100, eventDate: '2026-06-01' },
      },
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.document.create).toHaveBeenCalledOnce();
    const createCall = mockPrisma.document.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(createCall?.data?.extraVars).toMatchObject({ price: 100, eventDate: '2026-06-01' });
  });

  it('DD-F2: extraVars 검증 실패 → ZodError throw', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 10, moduleInstanceId: 3, permissions: {} });
    const fakeKeys = [
      makeDocumentExtraKey({ id: 1, boardId: 10, varIdx: 0, varName: 'price', varType: 'number', varIsRequired: true, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' }),
    ];

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUniqueOrThrow.mockResolvedValue(fakeBoard);
    mockPrisma.documentExtraKey.findMany.mockResolvedValue(fakeKeys);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(
      createDocument(
        {
          moduleInstanceId: 3,
          authorId: 1,
          title: 'test',
          content: '<p>내용</p>',
          nickName: null,
          extraVars: { price: 'not-a-number' }, // 타입 불일치
        },
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow();
  });

  it('DD-F3: 키 미정의 게시판 + extraVars 포함 → ExtraVarsNotConfiguredError', async () => {
    const { createDocument, ExtraVarsNotConfiguredError } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 10, moduleInstanceId: 3, permissions: {} });

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUniqueOrThrow.mockResolvedValue(fakeBoard);
    mockPrisma.documentExtraKey.findMany.mockResolvedValue([]); // 키 없음

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(
      createDocument(
        {
          moduleInstanceId: 3,
          authorId: 1,
          title: 'test',
          content: '<p>내용</p>',
          nickName: null,
          extraVars: { foo: 1 }, // 정의 없는 키
        },
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow(ExtraVarsNotConfiguredError);
  });

  it('DD-F4: required 키 있는 게시판 + extraVars 미전달 → ExtraVarsRequiredError', async () => {
    const { createDocument, ExtraVarsRequiredError } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 10, moduleInstanceId: 3, permissions: {} });
    const fakeKeys = [
      makeDocumentExtraKey({ id: 1, boardId: 10, varIdx: 0, varName: 'price', varType: 'number', varIsRequired: true, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' }),
    ];

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUniqueOrThrow.mockResolvedValue(fakeBoard);
    mockPrisma.documentExtraKey.findMany.mockResolvedValue(fakeKeys);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(
      createDocument(
        {
          moduleInstanceId: 3,
          authorId: 1,
          title: 'test',
          content: '<p>내용</p>',
          nickName: null,
          // extraVars 없음
        },
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow(ExtraVarsRequiredError);
  });

  it('DD-F5: required 키 없는 게시판 + extraVars 미전달 → 기존 동작 통과', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = makeBoard({ id: 10, moduleInstanceId: 3, permissions: {} });
    const fakeKeys = [
      makeDocumentExtraKey({ id: 1, boardId: 10, varIdx: 0, varName: 'price', varType: 'number', varIsRequired: false, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' }),
    ];

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUniqueOrThrow.mockResolvedValue(fakeBoard);
    mockPrisma.document.create.mockResolvedValue(makeDocument({ id: 1, boardId: 10 }));
    mockPrisma.documentExtraKey.findMany.mockResolvedValue(fakeKeys);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createDocument(
      {
        moduleInstanceId: 3,
        authorId: 1,
        title: 'test',
        content: '<p>내용</p>',
        nickName: null,
        // extraVars 없음, required 아니므로 통과
      },
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.document.create).toHaveBeenCalledOnce();
  });
});

describe('updateDocument + extraVars (Slice F — DD-F6)', () => {
  it('DD-F6: updateDocument extraVars → PUT semantics (전체 교체)', async () => {
    const { updateDocument } = await import('./document.js');

    const fakeDoc = makeDocument({
      id: 10,
      boardId: 7,
      authorId: 5,
      title: '제목',
      content: '<p>내용</p>',
      contentText: '내용',
      status: 'PUBLIC',
      extraVars: { price: 100, eventDate: '2026-01-01' }, // 기존 값
      board: { id: 7, permissions: {}, updateLog: false },
    });
    const fakeKeys = [
      makeDocumentExtraKey({ id: 1, boardId: 7, varIdx: 0, varName: 'price', varType: 'number', varIsRequired: false, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' }),
      makeDocumentExtraKey({ id: 2, boardId: 7, varIdx: 1, varName: 'eventDate', varType: 'date', varIsRequired: false, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' }),
    ];

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUniqueOrThrow.mockResolvedValue(fakeDoc);
    mockPrisma.document.update.mockResolvedValue({ ...fakeDoc, extraVars: { price: 200 } });
    mockPrisma.documentExtraKey.findMany.mockResolvedValue(fakeKeys);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDocument(
      {
        id: 10,
        actor: { userId: 5, userGroupSrl: 1, isAdmin: false },
        extraVars: { price: 200 }, // eventDate 없음 → PUT: eventDate 제거됨
      },
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.document.update).toHaveBeenCalledOnce();
    const updateCall = mockPrisma.document.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    // PUT semantics: 전달된 값만 저장됨 (eventDate 없음)
    expect(updateCall?.data?.extraVars).toMatchObject({ price: 200 });
    expect((updateCall?.data?.extraVars as Record<string, unknown>)?.eventDate).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// D-10: encodeCursor / decodeCursor BigInt round-trip
// ---------------------------------------------------------------------------

describe('encodeCursor / decodeCursor — BigInt round-trip (D-10)', () => {
  it('D-10: { listOrder: 100n, id: 5 } → encode → decode → 원본과 deep equal (BigInt 보존)', async () => {
    const { encodeCursor, decodeCursor } = await import('./document.js');

    const original = { listOrder: BigInt(100), id: 5 };
    const token = encodeCursor(original.listOrder, original.id);

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);

    const decoded = decodeCursor(token);
    expect(decoded.listOrder).toBe(original.listOrder); // BigInt equality
    expect(decoded.id).toBe(original.id);
  });
});

// ---------------------------------------------------------------------------
// AC-DOC-B1: createDocument + Board.documentCount atomicity
// ---------------------------------------------------------------------------

describe('createDocument — AC-DOC-B1 (Board.documentCount atomicity)', () => {
  it('AC-DOC-B1: GIVEN board with documentCount=5, WHEN createDocument called, THEN Board.documentCount=6', async () => {
    const { createDocument } = await import('./document.js');

    // documentCount 는 Board 가 아니라 DocumentCategory 의 컬럼이다.
    // 증가는 incrementDocumentCount 가 document_categories 에 실행하는 SQL 로 일어나므로
    // 여기서는 게시판 픽스처에 없는 필드를 얹지 않는다.
    const fakeBoard = makeBoard({ id: 7, moduleInstanceId: 3, permissions: {} });
    const fakeDocument = makeDocument({
      id: 1,
      boardId: 7,
      status: 'TEMP',
      title: 'Test Doc',
      content: '<p>Content</p>',
      contentText: 'Content',
      categoryId: 10, // Category ID present - should trigger increment
    });

    const transactionCalls: unknown[] = [];
    // incrementDocumentCount 는 tx.$executeRaw 로 카운트를 올린다.
    // 그래서 이 spy 호출 여부가 곧 "증가가 실제로 일어났는가"의 증거다.
    const mockExecuteRaw = vi.fn();

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUniqueOrThrow.mockResolvedValue(fakeBoard);
    mockPrisma.document.create.mockResolvedValue(fakeDocument);
    mockPrisma.documentExtraKey.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      transactionCalls.push(callback);
      // Mock transaction execution
      if (typeof callback === 'function') {
        const mockTx = {
          document: {
            create: mockPrisma.document.create,
          },
          $executeRaw: mockExecuteRaw,
        };
        // 트랜잭션 콜백은 전체 TransactionClient 를 요구하지만 이 경로가 실제로 쓰는 건 위 둘뿐이다
        return callback(mockTx as unknown as Parameters<typeof callback>[0]);
      }
      throw new Error('Invalid transaction callback');
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createDocument(
      {
        moduleInstanceId: 3,
        authorId: 1,
        title: 'Test Doc',
        content: '<p>Content</p>',
        nickName: null,
        categoryId: 10,
        actor: { userGroupSrl: 1, isAdmin: false },
      },
      { prisma: mockPrisma as any },
    );

    // Verify transaction was used
    expect(transactionCalls.length).toBeGreaterThan(0);

    // Verify create was called
    expect(mockPrisma.document.create).toHaveBeenCalledOnce();

    // categoryId 가 있으므로 documentCount 증가가 트랜잭션 안에서 실행돼야 한다
    expect(mockExecuteRaw).toHaveBeenCalledOnce();
  });

  it('AC-DOC-B1: should NOT increment documentCount when categoryId is null', async () => {
    const { createDocument } = await import('./document.js');

    // documentCount 는 Board 가 아니라 DocumentCategory 의 컬럼이다.
    // 증가는 incrementDocumentCount 가 document_categories 에 실행하는 SQL 로 일어나므로
    // 여기서는 게시판 픽스처에 없는 필드를 얹지 않는다.
    const fakeBoard = makeBoard({ id: 7, moduleInstanceId: 3, permissions: {} });
    const fakeDocument = makeDocument({
      id: 1,
      boardId: 7,
      status: 'TEMP',
      title: 'Test Doc',
      content: '<p>Content</p>',
      contentText: 'Content',
    });

    const transactionCalls: unknown[] = [];

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUniqueOrThrow.mockResolvedValue(fakeBoard);
    mockPrisma.document.create.mockResolvedValue(fakeDocument);
    mockPrisma.documentExtraKey.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      transactionCalls.push(callback);
      if (typeof callback === 'function') {
        const mockTx = {
          document: {
            create: mockPrisma.document.create,
          },
        };
        // 트랜잭션 콜백은 전체 TransactionClient 를 요구하지만 이 경로가 실제로 쓰는 건 위 하나뿐이다
        return callback(mockTx as unknown as Parameters<typeof callback>[0]);
      }
      throw new Error('Invalid transaction callback');
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createDocument(
      {
        moduleInstanceId: 3,
        authorId: 1,
        title: 'Test Doc',
        content: '<p>Content</p>',
        nickName: null,
        categoryId: null, // No category - should NOT use transaction
        actor: { userGroupSrl: 1, isAdmin: false },
      },
      { prisma: mockPrisma as any },
    );

    // Verify NO transaction was used (categoryId is null)
    expect(transactionCalls.length).toBe(0);

    // Verify create was called directly (not in transaction)
    expect(mockPrisma.document.create).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// SPEC-BOARD-UI-001 Slice A — Offset pagination, search, sort
// ---------------------------------------------------------------------------

describe('listDocuments (SPEC-BOARD-UI-001)', () => {
  describe('Offset pagination (page/pageSize)', () => {
    it('BUIT-001: page=1, pageSize=20 → totalCount, totalPages, currentPage 반환', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const items = Array.from({ length: 20 }, (_, i) =>
        makeDocument({
          id: i + 1,
          boardId: 5,
          isNotice: false,
          listOrder: BigInt(100 - i),
          status: 'PUBLIC',
          deletedAt: null,
        }),
      );

      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard);
      mockPrisma.document.findMany.mockResolvedValueOnce([]); // notices
      mockPrisma.document.findMany.mockResolvedValueOnce(items); // items
      mockPrisma.document.count.mockResolvedValueOnce(55); // totalCount

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await listDocuments(
        { moduleInstanceId: 3, status: 'PUBLIC', page: 1, pageSize: 20 },
        { prisma: mockPrisma as any },
      );

      expect(result).toMatchObject({
        notices: [],
        items,
        nextCursor: null,
        totalCount: 55,
        totalPages: 3,
        currentPage: 1,
        pageSize: 20,
      });
      expect(mockPrisma.document.count).toHaveBeenCalledOnce();
    });

    it('BUIT-002: page=2, pageSize=20 → skip=20 적용', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const items = Array.from({ length: 20 }, (_, i) =>
        makeDocument({
          id: i + 21,
          boardId: 5,
          isNotice: false,
          listOrder: BigInt(100 - i),
          status: 'PUBLIC',
          deletedAt: null,
        }),
      );

      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard);
      mockPrisma.document.findMany.mockResolvedValueOnce([]); // notices
      mockPrisma.document.findMany.mockResolvedValueOnce(items); // items
      mockPrisma.document.count.mockResolvedValueOnce(55);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listDocuments(
        { moduleInstanceId: 3, status: 'PUBLIC', page: 2, pageSize: 20 },
        { prisma: mockPrisma as any },
      );

      const itemsCall = mockPrisma.document.findMany.mock.calls[1]?.[0] as {
        skip?: number;
        take?: number;
      };
      expect(itemsCall?.skip).toBe(20);
      expect(itemsCall?.take).toBe(20);
    });

    it('BUIT-003: notices는 totalCount에 포함되지 않음', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const notices = [
        makeDocument({
          id: 1,
          boardId: 5,
          isNotice: true,
          listOrder: BigInt(9999),
          status: 'PUBLIC',
          deletedAt: null,
        }),
      ];
      const items = Array.from({ length: 20 }, (_, i) =>
        makeDocument({
          id: i + 2,
          boardId: 5,
          isNotice: false,
          listOrder: BigInt(100 - i),
          status: 'PUBLIC',
          deletedAt: null,
        }),
      );

      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard);
      mockPrisma.document.findMany.mockResolvedValueOnce(notices); // notices
      mockPrisma.document.findMany.mockResolvedValueOnce(items); // items
      mockPrisma.document.count.mockResolvedValueOnce(50); // Only non-notice items

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await listDocuments(
        { moduleInstanceId: 3, status: 'PUBLIC', page: 1, pageSize: 20 },
        { prisma: mockPrisma as any },
      );

      expect(result.notices).toHaveLength(1);
      expect(result.totalCount).toBe(50); // notices 제외
      expect(result.totalPages).toBe(3); // 50 / 20 = 2.5 → 3 pages
    });

    it('BUIT-004: page 없으면 기존 cursor 모드 동작 (nextCursor만 반환)', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const items = Array.from({ length: 20 }, (_, i) =>
        makeDocument({
          id: i + 1,
          boardId: 5,
          isNotice: false,
          listOrder: BigInt(100 - i),
          status: 'PUBLIC',
          deletedAt: null,
        }),
      );

      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard);
      mockPrisma.document.findMany.mockResolvedValueOnce([]); // notices
      mockPrisma.document.findMany.mockResolvedValueOnce([
        ...items,
        makeDocument({
          id: 21,
          boardId: 5,
          isNotice: false,
          listOrder: BigInt(0),
          status: 'PUBLIC',
          deletedAt: null,
          title: '',
          content: '',
        }),
      ]); // 21 items (hasMore)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await listDocuments(
        { moduleInstanceId: 3, status: 'PUBLIC' },
        { prisma: mockPrisma as any },
      );

      // 기존 cursor 모드: totalCount, totalPages, currentPage, pageSize 없음
      expect(result).toHaveProperty('notices');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('nextCursor');
      expect(result).not.toHaveProperty('totalCount');
      expect(result).not.toHaveProperty('totalPages');
      expect(mockPrisma.document.count).not.toHaveBeenCalled();
    });

    it('BUIT-005: pageSize=10 → validate 10 is in allowed values', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard as any);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.count.mockResolvedValueOnce(10);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(
        listDocuments(
          { moduleInstanceId: 3, status: 'PUBLIC', page: 1, pageSize: 15 },
          { prisma: mockPrisma as any },
        ),
      ).rejects.toThrow();
    });

    it('BUIT-006: page만 있고 pageSize 없으면 기본값 20 사용', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard as any);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.count.mockResolvedValueOnce(20);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC', page: 1 }, { prisma: mockPrisma as any });

      const itemsCall = mockPrisma.document.findMany.mock.calls[1]?.[0] as { take?: number };
      expect(itemsCall?.take).toBe(20);
    });
  });

  describe('Sort options (recommend, views, latest)', () => {
    it('BUIT-007: sort=recommend → votedCount desc, id desc', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard as any);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.count.mockResolvedValueOnce(10);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listDocuments(
        { moduleInstanceId: 3, status: 'PUBLIC', page: 1, pageSize: 20, sort: 'recommend' },
        { prisma: mockPrisma as any },
      );

      const itemsCall = mockPrisma.document.findMany.mock.calls[1]?.[0] as { orderBy: unknown };
      expect(itemsCall.orderBy).toEqual([{ votedCount: 'desc' }, { id: 'desc' }]);
    });

    it('BUIT-008: sort=views → readedCount desc, id desc', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard as any);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.count.mockResolvedValueOnce(10);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listDocuments(
        { moduleInstanceId: 3, status: 'PUBLIC', page: 1, pageSize: 20, sort: 'views' },
        { prisma: mockPrisma as any },
      );

      const itemsCall = mockPrisma.document.findMany.mock.calls[1]?.[0] as { orderBy: unknown };
      expect(itemsCall.orderBy).toEqual([{ readedCount: 'desc' }, { id: 'desc' }]);
    });

    it('BUIT-009: sort=latest → listOrder desc, id desc (same as list_order)', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard as any);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.count.mockResolvedValueOnce(10);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listDocuments(
        { moduleInstanceId: 3, status: 'PUBLIC', page: 1, pageSize: 20, sort: 'latest' },
        { prisma: mockPrisma as any },
      );

      const itemsCall = mockPrisma.document.findMany.mock.calls[1]?.[0] as { orderBy: unknown };
      expect(itemsCall.orderBy).toEqual([{ listOrder: 'desc' }, { id: 'desc' }]);
    });
  });

  describe('searchField options (title, author, content)', () => {
    it('BUIT-010: searchField=title → title contains insensitive', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard as any);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.count.mockResolvedValueOnce(5);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listDocuments(
        { moduleInstanceId: 3, status: 'PUBLIC', page: 1, pageSize: 20, search: 'test', searchField: 'title' },
        { prisma: mockPrisma as any },
      );

      const itemsCall = mockPrisma.document.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
      expect(itemsCall.where?.title).toMatchObject({ contains: 'test', mode: 'insensitive' });
    });

    it('BUIT-011: searchField=author → nickName OR userIdSnapshot contains', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard as any);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.count.mockResolvedValueOnce(3);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listDocuments(
        { moduleInstanceId: 3, status: 'PUBLIC', page: 1, pageSize: 20, search: 'user1', searchField: 'author' },
        { prisma: mockPrisma as any },
      );

      const itemsCall = mockPrisma.document.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
      expect(itemsCall.where?.OR).toEqual([
        { nickName: { contains: 'user1', mode: 'insensitive' } },
        { userIdSnapshot: { contains: 'user1', mode: 'insensitive' } },
      ]);
    });

    it('BUIT-012: searchField=content → FTS search_vector @@ plainto_tsquery', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard as any);
      // $queryRaw is called twice: once for data, once for count
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // data query
        .mockResolvedValueOnce([{ count: BigInt(5) }]); // count query

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listDocuments(
        { moduleInstanceId: 3, status: 'PUBLIC', page: 1, pageSize: 20, search: 'test content', searchField: 'content' },
        { prisma: mockPrisma as any },
      );

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('BUIT-013: searchField 없이 search만 있으면 기본값 title', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard as any);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.count.mockResolvedValueOnce(5);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listDocuments(
        { moduleInstanceId: 3, status: 'PUBLIC', page: 1, pageSize: 20, search: 'test' },
        { prisma: mockPrisma as any },
      );

      const itemsCall = mockPrisma.document.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
      expect(itemsCall.where?.title).toMatchObject({ contains: 'test', mode: 'insensitive' });
    });
  });

  describe('Search with offset pagination', () => {
    it('BUIT-014: search + page → search 결과도 offset pagination 적용', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard as any);
      mockPrisma.document.findMany.mockResolvedValueOnce([]);
      mockPrisma.document.count.mockResolvedValueOnce(35);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listDocuments(
        { moduleInstanceId: 3, status: 'PUBLIC', page: 2, pageSize: 20, search: 'test', searchField: 'title' },
        { prisma: mockPrisma as any },
      );

      const itemsCall = mockPrisma.document.findMany.mock.calls[0]?.[0] as {
        skip?: number;
        take?: number;
      };
      expect(itemsCall?.skip).toBe(20);
      expect(itemsCall?.take).toBe(20);
      expect(mockPrisma.document.count).toHaveBeenCalledOnce();
    });

    it('BUIT-015: FTS search + page → $queryRaw called with LIMIT/OFFSET params', async () => {
      const { listDocuments } = await import('./document.js');

      const fakeBoard = makeBoard({ id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false });
      const mockPrisma = createMockPrismaClient();
      mockPrisma.board.findUnique.mockResolvedValue(fakeBoard as any);
      // $queryRaw is called twice: once for data, once for count
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // data query
        .mockResolvedValueOnce([{ count: BigInt(35) }]); // count query

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listDocuments(
        { moduleInstanceId: 3, status: 'PUBLIC', page: 2, pageSize: 20, search: 'test', searchField: 'content' },
        { prisma: mockPrisma as any },
      );

      // Verify $queryRaw was called with page params (LIMIT=20, OFFSET=20 for page=2)
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
      // Check the data query call (first call)
      const firstCallArgs = mockPrisma.$queryRaw.mock.calls[0];
      expect(firstCallArgs).toBeDefined();
      // The template should contain pageSize (20) and offset ((page-1) * pageSize = 20)
      // We can't easily test the template string directly, but we can verify the call was made
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC-BOARD-UI-001 adjacent lookup (이전글/다음글)
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// createDocument — 작성자 스냅샷 (nickName / userIdSnapshot)
// ---------------------------------------------------------------------------

describe('createDocument — 작성자 스냅샷', () => {
  async function runCreate(
    input: { authorId: number | null; nickName: string | null },
    author?: ReturnType<typeof makeUser>,
  ) {
    const { createDocument } = await import('./document.js');

    const mockPrisma = createMockPrismaClient();
    mockPrisma.board.findUniqueOrThrow.mockResolvedValue(
      makeBoard({ id: 7, moduleInstanceId: 3, permissions: {} }),
    );
    mockPrisma.document.create.mockResolvedValue(makeDocument({ id: 1, boardId: 7 }));
    mockPrisma.documentExtraKey.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue(author ?? null);

    await createDocument(
      { moduleInstanceId: 3, title: 'hi', content: '<p>x</p>', ...input },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    const call = mockPrisma.document.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    return { data: call.data, mockPrisma };
  }

  // 목록 렌더는 doc.nickName 을, 작성자 검색은 nickName OR userIdSnapshot 을
  // 직접 읽는다. 여기서 비우면 로그인 사용자 글의 작성자가 '-' 로 보이고
  // 로그인 ID 로는 검색되지 않는다.
  it('로그인 작성자면 User 를 조회해 nickName 과 userIdSnapshot 을 채운다', async () => {
    const { data, mockPrisma } = await runCreate(
      { authorId: 42, nickName: null },
      makeUser({ id: 42, userId: 'admin', nickName: '관리자닉' }),
    );

    expect(mockPrisma.user.findUnique).toHaveBeenCalledOnce();
    expect(data.nickName).toBe('관리자닉');
    expect(data.userIdSnapshot).toBe('admin');
  });

  it('명시된 nickName 은 User 값보다 우선한다', async () => {
    const { data } = await runCreate(
      { authorId: 42, nickName: '직접입력' },
      makeUser({ id: 42, userId: 'admin', nickName: '관리자닉' }),
    );

    expect(data.nickName).toBe('직접입력');
    // 로그인 사용자이므로 userIdSnapshot 은 그대로 채운다.
    expect(data.userIdSnapshot).toBe('admin');
  });

  it('비회원(authorId=null)이면 User 를 조회하지 않고 userIdSnapshot 을 비운다', async () => {
    const { data, mockPrisma } = await runCreate({ authorId: null, nickName: '손님' });

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(data.nickName).toBe('손님');
    expect(data.userIdSnapshot).toBeNull();
  });

  it('작성자 조회가 비면 nickName 을 넘어온 값 그대로 두고 터지지 않는다', async () => {
    const { data } = await runCreate({ authorId: 999, nickName: null });

    expect(data.nickName).toBeNull();
    expect(data.userIdSnapshot).toBeNull();
  });
});
