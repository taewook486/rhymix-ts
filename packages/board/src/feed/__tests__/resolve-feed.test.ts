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

function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: '글',
    content: '<p>본문</p>',
    contentText: '본문',
    regdate: new Date('2026-06-01T00:00:00.000Z'),
    lastUpdate: new Date('2026-06-01T00:00:00.000Z'),
    commentCount: 0,
    tags: [],
    category: null,
    author: { nickName: '홍길동' },
    nickName: null,
    ...overrides,
  };
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
      prisma: {} as never,
      loadInstance: async () => makeInstance(),
      loadBoard: async () => makeBoard(),
    });

    expect(result.status).toBe(200);
    if (result.status !== 200) throw new Error('unreachable');
    expect(result.xml).toContain('<item>');
    expect(result.xml).toContain('https://example.com/notice/1');
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
      prisma: {} as never,
      loadInstance: async () => makeInstance(),
      loadBoard: async () => makeBoard(),
    });

    expect(result.status).toBe(200);
    if (result.status !== 200) throw new Error('unreachable');
    expect(result.xml).toContain('<entry>');
  });
});
