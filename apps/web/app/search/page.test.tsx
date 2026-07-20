// @vitest-environment jsdom
/**
 * search/page.test.tsx — SPEC-SEARCH-001 /search page tests
 *
 * Tests for search result page:
 * - Renders grouped sections by board
 * - Highlights search terms
 * - Shows empty state when no results
 * - Renders pagination
 *
 * `page.tsx` calls the REAL `createCallerFactory` (tRPC's `t.createCallerFactory`)
 * with `contentSearchRouter` as its argument, then `createCaller(ctx).integrated(...)`.
 * Mocking `contentSearchRouter` itself as a plain object with a fake `.createCaller`
 * method is the wrong shape — `createCallerFactory` builds the caller from real tRPC
 * router internals (`_def.procedures` etc.), not by invoking a `.createCaller` method
 * on its argument. Mock `createCallerFactory` itself instead, so it always returns a
 * caller matching the `.integrated(...)` shape `page.tsx` actually calls, independent
 * of what `contentSearchRouter` looks like.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import SearchPage from './page';

// This repo's convention: next/link must be mocked in jsdom tests (see
// app/(auth)/login/page.test.tsx) — otherwise rendering hangs.
vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode; className?: string }) => {
    const { href, children, ...rest } = props;
    return React.createElement('a', { href, ...rest }, children);
  },
}));

const integratedMock = vi.fn();

vi.mock('@/server/api/trpc', () => ({
  createCallerFactory: () => () => ({
    integrated: integratedMock,
  }),
}));

// contentSearchRouter's actual shape doesn't matter since createCallerFactory is mocked
// to ignore its argument — just needs to exist as an import target.
vi.mock('@/server/api/routers/content/search', () => ({
  contentSearchRouter: {},
}));

// Mock auth
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Mock prisma so importing it doesn't attempt a real DB connection
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// @rhymix-ts/file's barrel re-exports S3Storage/ClamAVScanner alongside the
// InMemoryStorage/NoopScanner this page actually uses, pulling in the AWS SDK
// and sharp's type surface transitively. Mocking it keeps this page test fast
// (search has nothing to do with file storage — it only builds a Context).
vi.mock('@rhymix-ts/file', () => ({
  InMemoryStorage: class {},
  NoopScanner: class {},
}));

describe('/search page', () => {
  beforeEach(() => {
    integratedMock.mockReset();
  });

  it('S-PAGE-1: renders search term from searchParams', async () => {
    const mockResults = [
      {
        id: 1,
        boardId: 1,
        boardName: '자유게시판',
        boardMid: 'freeboard',
        title: '타입스크립트 튜토리얼',
        content: '타입스크립트 기초를 배워봅시다',
        nickName: 'user1',
        regdate: new Date('2026-01-01'),
      },
    ];

    integratedMock.mockResolvedValue({
      results: mockResults,
      totalCount: 1,
      page: 1,
      totalPages: 1,
    });

    // @ts-ignore - testing async component
    const page = await SearchPage({
      searchParams: { q: '타입스크립트' },
    });

    const { container } = render(page);
    expect(container.textContent).toContain('타입스크립트');
  });

  it('S-PAGE-2: renders grouped sections by board', async () => {
    const mockResults = [
      {
        id: 1,
        boardId: 1,
        boardName: '자유게시판',
        boardMid: 'freeboard',
        title: 'title1',
        content: 'content1',
        nickName: 'user1',
        regdate: new Date('2026-01-01'),
      },
      {
        id: 2,
        boardId: 2,
        boardName: 'Q&A게시판',
        boardMid: 'qa',
        title: 'title2',
        content: 'content2',
        nickName: 'user2',
        regdate: new Date('2026-01-02'),
      },
    ];

    integratedMock.mockResolvedValue({
      results: mockResults,
      totalCount: 2,
      page: 1,
      totalPages: 1,
    });

    // @ts-ignore
    const page = await SearchPage({
      searchParams: { q: 'test' },
    });

    const { container } = render(page);
    expect(container.textContent).toContain('자유게시판');
    expect(container.textContent).toContain('Q&A게시판');
  });

  it('S-PAGE-3: shows empty state when no results', async () => {
    integratedMock.mockResolvedValue({
      results: [],
      totalCount: 0,
      page: 1,
      totalPages: 0,
    });

    // @ts-ignore
    const page = await SearchPage({
      searchParams: { q: 'nonexistent' },
    });

    const { container } = render(page);
    expect(container.textContent).toContain('검색 결과가 없습니다');
  });

  it('S-PAGE-4: renders pagination when multiple pages', async () => {
    integratedMock.mockResolvedValue({
      results: [],
      totalCount: 50,
      page: 1,
      totalPages: 3,
    });

    // @ts-ignore
    const page = await SearchPage({
      searchParams: { q: 'test', page: '1' },
    });

    const { container } = render(page);
    // Should render pagination controls
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('3');
  });
});

describe('/search generateMetadata (SPEC-SEO-001 REQ-SEO-001)', () => {
  it("returns title \"'{검색어}' 검색 결과\" when q is present", async () => {
    const { generateMetadata } = await import('./page');

    const metadata = await generateMetadata({ searchParams: { q: '테스트' } });

    expect(metadata.title).toBe("'테스트' 검색 결과");
  });

  it('returns empty metadata when q is missing', async () => {
    const { generateMetadata } = await import('./page');

    const metadata = await generateMetadata({ searchParams: {} });

    expect(metadata).toEqual({});
  });
});
