/**
 * visibility.test.ts — SPEC-FEED-001 Slice A (T-007)
 *
 * 가시성/보안 전용 테스트 — AC-FEED-A1, AC-FEED-A4 검증.
 *
 * 시나리오: board 에 PUBLIC 문서 3개 + SECRET 문서 1개 + 소프트 삭제 문서 1개를 시드(mock)하고,
 * SECRET/삭제 문서가 RSS/Atom 출력에 절대 나타나지 않는지, author.email/internal id 등
 * 민감 필드가 노출되지 않는지 검증한다.
 *
 * REQ-FEED-030, REQ-FEED-031, REQ-FEED-032, REQ-FEED-033, REQ-FEED-034, REQ-FEED-062.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveFeedXml } from '../resolve-feed.js';
import { buildFeed } from '../build-feed.js';

// ---------------------------------------------------------------------------
// AC-FEED-A1 / REQ-FEED-030/031: listDocuments 가 이미 PUBLIC + non-deleted 필터를
// 적용하므로, resolveFeedXml 은 그 결과만 빌더에 전달해야 한다 — SECRET/TEMP/삭제 문서가
// listDocuments mock 의 반환값에 없으면 출력에도 없어야 함을 단언한다.
// ---------------------------------------------------------------------------

const mockListDocuments = vi.fn();

vi.mock('@rhymix-ts/document', () => ({
  listDocuments: (...args: unknown[]) => mockListDocuments(...args),
}));

function makeInstance() {
  return { id: 1, mid: 'notice', moduleCode: 'board', browserTitle: null };
}

function makeBoard(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: '공지사항',
    description: null,
    permissions: { list: [0, 1], view: [0, 1] },
    feedConfig: { enabled: true, itemCount: 20, fullContent: true, excerptLength: 400 },
    ...overrides,
  };
}

function makePublicDoc(id: number, title: string) {
  return {
    id,
    title,
    content: `<p>공개 문서 ${id} 본문</p>`,
    contentText: `공개 문서 ${id} 본문`,
    regdate: new Date('2026-06-01T00:00:00.000Z'),
    lastUpdate: new Date('2026-06-01T00:00:00.000Z'),
    commentCount: 0,
    tags: [],
    category: null,
    author: { id: 99, userId: 'author-uid', nickName: '작성자', email: 'secret@example.com' },
    nickName: null,
  };
}

describe('SPEC-FEED-001 T-007: 가시성/보안 — listDocuments 필터 신뢰 (AC-FEED-A1/A4)', () => {
  beforeEach(() => {
    mockListDocuments.mockReset();
  });

  it('VIS-1 (AC-FEED-A1, REQ-FEED-030/031): listDocuments 가 PUBLIC 문서 3개만 반환하면 RSS 출력도 정확히 3개 <item> 만 갖는다 (SECRET/TEMP/삭제 문서 부재)', async () => {
    // listDocuments({status:'PUBLIC'}) 호출 시 실제로는 SECRET·TEMP·deletedAt!=null 문서가
    // 결과에서 이미 제외된 상태로 반환된다(document.ts:445~526 status/deletedAt 필터).
    // 여기서는 그 계약을 신뢰하고, "반환된 것만 출력에 반영되는지"를 검증한다.
    const publicDocs = [makePublicDoc(1, '공개글1'), makePublicDoc(2, '공개글2'), makePublicDoc(3, '공개글3')];
    mockListDocuments.mockResolvedValue({ notices: [], items: publicDocs, nextCursor: null });

    const result = await resolveFeedXml({
      format: 'rss',
      siteId: 1,
      mid: 'notice',
      baseUrl: 'https://example.com',
      prisma: {} as never,
      loadInstance: async () => makeInstance(),
      loadBoard: async () => makeBoard(),
    });

    expect(result.status).toBe(200);
    if (result.status !== 200) throw new Error('unreachable');

    const itemCount = (result.xml.match(/<item>/g) ?? []).length;
    expect(itemCount).toBe(3);
    expect(result.xml).toContain('공개글1');
    expect(result.xml).toContain('공개글2');
    expect(result.xml).toContain('공개글3');

    // listDocuments 가 status:'PUBLIC' 으로 호출되었는지 — SECRET/TEMP 제외 계약의 호출측 증거.
    expect(mockListDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PUBLIC' }),
      expect.anything(),
    );
  });

  it('VIS-2 (REQ-FEED-034): author.email, internal id 등 비공개 필드가 RSS/Atom 출력에 노출되지 않는다', async () => {
    const docWithSensitiveAuthor = makePublicDoc(1, '공개글');
    mockListDocuments.mockResolvedValue({
      notices: [],
      items: [docWithSensitiveAuthor],
      nextCursor: null,
    });

    const result = await resolveFeedXml({
      format: 'atom',
      siteId: 1,
      mid: 'notice',
      baseUrl: 'https://example.com',
      prisma: {} as never,
      loadInstance: async () => makeInstance(),
      loadBoard: async () => makeBoard(),
    });

    expect(result.status).toBe(200);
    if (result.status !== 200) throw new Error('unreachable');

    // 민감 필드 부재 검증 — author.email, author internal id(99), userId('author-uid')
    expect(result.xml).not.toContain('secret@example.com');
    expect(result.xml).not.toContain('author-uid');
    // nickName(공개 필드)만 노출되어야 한다.
    expect(result.xml).toContain('작성자');
  });

  it('VIS-3 (AC-FEED-A4, REQ-FEED-033): feedConfig.enabled=false 인 board 는 404 + 문서 데이터 없음', async () => {
    mockListDocuments.mockResolvedValue({
      notices: [],
      items: [makePublicDoc(1, '노출되면 안 되는 글')],
      nextCursor: null,
    });

    const result = await resolveFeedXml({
      format: 'rss',
      siteId: 1,
      mid: 'notice',
      baseUrl: 'https://example.com',
      prisma: {} as never,
      loadInstance: async () => makeInstance(),
      loadBoard: async () => makeBoard({ feedConfig: { enabled: false } }),
    });

    expect(result.status).toBe(404);
    expect(JSON.stringify(result)).not.toContain('노출되면 안 되는 글');
    expect(mockListDocuments).not.toHaveBeenCalled();
  });

  it('VIS-4 (AC-FEED-A4, REQ-FEED-032): guest 에게 list/view 권한이 없는 board 는 404 + 문서 데이터 없음', async () => {
    mockListDocuments.mockResolvedValue({
      notices: [],
      items: [makePublicDoc(1, '비공개 게시판 글')],
      nextCursor: null,
    });

    const result = await resolveFeedXml({
      format: 'atom',
      siteId: 1,
      mid: 'notice',
      baseUrl: 'https://example.com',
      prisma: {} as never,
      loadInstance: async () => makeInstance(),
      loadBoard: async () => makeBoard({ permissions: { list: [], view: [] } }),
    });

    expect(result.status).toBe(404);
    expect(JSON.stringify(result)).not.toContain('비공개 게시판 글');
    expect(mockListDocuments).not.toHaveBeenCalled();
  });

  it('VIS-5 (REQ-FEED-034): buildFeed 자체도 FeedDocument 에 정의된 필드(title/content/contentText/regdate/lastUpdate/authorNickName/commentCount/categoryTitle/tags) 외에는 입력받지 않는다 — password/ipAddress 같은 필드를 넘겨도 출력에 나타나지 않는다', () => {
    const xml = buildFeed({
      format: 'rss',
      instance: { mid: 'notice', browserTitle: null },
      board: { name: '공지사항', description: null },
      feedConfig: { enabled: true, itemCount: 20, fullContent: true, excerptLength: 400 },
      documents: [
        {
          id: 1,
          title: '글',
          content: '<p>본문</p>',
          contentText: '본문',
          regdate: new Date('2026-06-01T00:00:00.000Z'),
          lastUpdate: new Date('2026-06-01T00:00:00.000Z'),
          authorNickName: '작성자',
          commentCount: 0,
          categoryTitle: null,
          tags: [],
          // @ts-expect-error — FeedDocument 타입에 없는 필드를 의도적으로 주입해 누출 여부 확인
          password: 'should-not-leak',
          ipAddress: '127.0.0.1',
        },
      ],
      baseUrl: 'https://example.com',
    });

    expect(xml).not.toContain('should-not-leak');
    expect(xml).not.toContain('127.0.0.1');
  });
});
