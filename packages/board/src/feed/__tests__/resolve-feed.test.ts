/**
 * resolve-feed.test.ts — SPEC-FEED-001 Slice A (T-005/T-006 공통 헬퍼)
 *
 * resolveFeedXml() — 인스턴스/게이트(enabled/guest 권한)/문서조회/빌더 호출을
 * 하나의 함수로 묶어 rss/atom 두 라우트 핸들러가 동일 로직을 공유하게 한다
 * (REQ-FEED-001~006, 020, 022, 030~034).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveFeedXml } from '../resolve-feed.js';

const mockListDocuments = vi.fn();

vi.mock('@rhymix-ts/document', () => ({
  listDocuments: (...args: unknown[]) => mockListDocuments(...args),
}));

function makeInstance(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    mid: 'notice',
    moduleCode: 'board',
    browserTitle: null,
    ...overrides,
  };
}

function makeBoard(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: '공지사항',
    description: null,
    // guest(userGroupSrl=0) 에게 list/view 허용 — 공개 게시판 기본 fixture.
    permissions: { list: [0, 1], view: [0, 1] },
    feedConfig: { enabled: true, itemCount: 20, fullContent: false, excerptLength: 400 },
    ...overrides,
  };
}

/**
 * `listDocuments`가 실제로 반환하는 형태에 맞춘 문서 픽스처.
 *
 * **`tags` 필드가 없는 것이 의도된 것이다.** `listDocuments`는 `Document[]`를 그대로
 * 반환할 뿐 `documentTags` 조인을 포함하지 않는다. 과거 픽스처가 `tags: []`를 손으로
 * 넣어준 탓에, `resolveCategories`의 `push(...doc.tags)`가 운영에서
 * `TypeError: doc.tags is not iterable`로 터져 RSS가 500을 반환하는데도 단위 테스트는
 * 전부 통과했다. 픽스처를 실제 반환 형태와 일치시켜 같은 결함이 재발하면 잡히게 한다.
 */
function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: '글',
    content: '<p>본문</p>',
    contentText: '본문',
    regdate: new Date('2026-06-01T00:00:00.000Z'),
    lastUpdate: new Date('2026-06-01T00:00:00.000Z'),
    commentCount: 0,
    category: null,
    author: { nickName: '홍길동' },
    nickName: null,
    ...overrides,
  };
}

/**
 * 태그 조회에 쓰이는 최소 prisma 목.
 * @param rows `document_tags` 조인 결과 — `[{ documentId, tag: { name } }]`
 */
function makePrisma(rows: Array<{ documentId: number; tag: { name: string } }> = []) {
  return {
    documentTag: {
      findMany: vi.fn(async () => rows),
    },
  } as never;
}

describe('resolveFeedXml (SPEC-FEED-001 T-005/006 공통 게이트)', () => {
  beforeEach(() => {
    mockListDocuments.mockReset();
  });

  it('GATE-1 (REQ-FEED-004): 인스턴스가 없으면 404 결과를 반환한다', async () => {
    const result = await resolveFeedXml({
      format: 'rss',
      siteId: 1,
      mid: 'missing',
      baseUrl: 'https://example.com',
      prisma: {} as never,
      loadInstance: async () => null,
      loadBoard: async () => null,
    });
    expect(result.status).toBe(404);
  });

  it('GATE-2 (REQ-FEED-033): feedConfig.enabled=false 면 404를 반환한다', async () => {
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
  });

  it('GATE-3 (REQ-FEED-032): guest 에게 list/view 권한이 없으면 404를 반환한다', async () => {
    const result = await resolveFeedXml({
      format: 'rss',
      siteId: 1,
      mid: 'notice',
      baseUrl: 'https://example.com',
      prisma: {} as never,
      loadInstance: async () => makeInstance(),
      loadBoard: async () => makeBoard({ permissions: { list: [], view: [] } }),
    });
    expect(result.status).toBe(404);
    expect(mockListDocuments).not.toHaveBeenCalled();
  });

  it('GATE-4: 모든 게이트를 통과하면 200 + XML 본문을 반환한다', async () => {
    mockListDocuments.mockResolvedValue({
      notices: [],
      items: [makeDoc()],
      nextCursor: null,
    });

    const result = await resolveFeedXml({
      format: 'rss',
      siteId: 1,
      mid: 'notice',
      baseUrl: 'https://example.com',
      prisma: makePrisma(),
      loadInstance: async () => makeInstance(),
      loadBoard: async () => makeBoard(),
    });

    expect(result.status).toBe(200);
    if (result.status !== 200) throw new Error('unreachable');
    expect(result.xml).toContain('<item>');
    expect(result.xml).toContain('https://example.com/notice/1');
  });

  /**
   * 회귀 방지 (RSS 500 결함):
   * `listDocuments`가 `tags` 없이 반환해도 500으로 죽지 않아야 하고,
   * `document_tags` 조인 결과가 category로 매핑되어야 한다 (REQ-FEED-015).
   */
  it('GATE-4b: listDocuments 결과에 tags 필드가 없어도 200이며, 조회한 태그가 category 로 매핑된다', async () => {
    mockListDocuments.mockResolvedValue({
      notices: [],
      items: [makeDoc()],
      nextCursor: null,
    });

    const prisma = makePrisma([
      { documentId: 1, tag: { name: 'typescript' } },
      { documentId: 1, tag: { name: 'rss' } },
    ]);

    const result = await resolveFeedXml({
      format: 'rss',
      siteId: 1,
      mid: 'notice',
      baseUrl: 'https://example.com',
      prisma,
      loadInstance: async () => makeInstance(),
      loadBoard: async () => makeBoard(),
    });

    expect(result.status).toBe(200);
    if (result.status !== 200) throw new Error('unreachable');
    expect(result.xml).toContain('<category>typescript</category>');
    expect(result.xml).toContain('<category>rss</category>');
  });

  it('GATE-4c: 태그가 없는 문서도 200이며 board.name category 만 렌더된다', async () => {
    mockListDocuments.mockResolvedValue({
      notices: [],
      items: [makeDoc()],
      nextCursor: null,
    });

    const result = await resolveFeedXml({
      format: 'rss',
      siteId: 1,
      mid: 'notice',
      baseUrl: 'https://example.com',
      prisma: makePrisma([]),
      loadInstance: async () => makeInstance(),
      loadBoard: async () => makeBoard(),
    });

    expect(result.status).toBe(200);
    if (result.status !== 200) throw new Error('unreachable');
    expect(result.xml).toContain('<category>공지사항</category>');
  });

  it('GATE-5 (F1 결정): itemCount 가 Math.min(itemCount, 100) 으로 clamp 되어 listDocuments 에 전달된다', async () => {
    mockListDocuments.mockResolvedValue({ notices: [], items: [], nextCursor: null });

    await resolveFeedXml({
      format: 'rss',
      siteId: 1,
      mid: 'notice',
      baseUrl: 'https://example.com',
      prisma: {} as never,
      loadInstance: async () => makeInstance(),
      loadBoard: async () => makeBoard({ feedConfig: { enabled: true, itemCount: 500 } }),
    });

    expect(mockListDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ moduleInstanceId: 1, status: 'PUBLIC', limit: 100 }),
      expect.anything(),
    );
  });

  it('GATE-6: format=atom 이면 atom 빌더가 호출되어 entry 가 생성된다', async () => {
    mockListDocuments.mockResolvedValue({
      notices: [],
      items: [makeDoc()],
      nextCursor: null,
    });

    const result = await resolveFeedXml({
      format: 'atom',
      siteId: 1,
      mid: 'notice',
      baseUrl: 'https://example.com',
      prisma: makePrisma(),
      loadInstance: async () => makeInstance(),
      loadBoard: async () => makeBoard(),
    });

    expect(result.status).toBe(200);
    if (result.status !== 200) throw new Error('unreachable');
    expect(result.xml).toContain('<entry>');
  });
});
