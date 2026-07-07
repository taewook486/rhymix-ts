/**
 * search/page.test.tsx — SPEC-SEARCH-001 /search page tests
 *
 * Tests for search result page:
 * - Renders grouped sections by board
 * - Highlights search terms
 * - Shows empty state when no results
 * - Renders pagination
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SearchPage from './page';

// Mock tRPC caller
vi.mock('@/server/api/routers/content', () => ({
  contentSearchRouter: {
    createCaller: vi.fn(() => ({
      integrated: vi.fn(),
    })),
  },
}));

// Mock auth
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}));

describe('/search page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    vi.doMock('@/server/api/routers/content', () => ({
      contentSearchRouter: {
        createCaller: vi.fn(() => ({
          integrated: vi.fn().mockResolvedValue({
            results: mockResults,
            totalCount: 1,
            page: 1,
            totalPages: 1,
          }),
        })),
      },
    }));

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

    vi.doMock('@/server/api/routers/content', () => ({
      contentSearchRouter: {
        createCaller: vi.fn(() => ({
          integrated: vi.fn().mockResolvedValue({
            results: mockResults,
            totalCount: 2,
            page: 1,
            totalPages: 1,
          }),
        })),
      },
    }));

    // @ts-ignore
    const page = await SearchPage({
      searchParams: { q: 'test' },
    });

    const { container } = render(page);
    expect(container.textContent).toContain('자유게시판');
    expect(container.textContent).toContain('Q&A게시판');
  });

  it('S-PAGE-3: shows empty state when no results', async () => {
    vi.doMock('@/server/api/routers/content', () => ({
      contentSearchRouter: {
        createCaller: vi.fn(() => ({
          integrated: vi.fn().mockResolvedValue({
            results: [],
            totalCount: 0,
            page: 1,
            totalPages: 0,
          }),
        })),
      },
    }));

    // @ts-ignore
    const page = await SearchPage({
      searchParams: { q: 'nonexistent' },
    });

    const { container } = render(page);
    expect(container.textContent).toContain('검색 결과가 없습니다');
  });

  it('S-PAGE-4: renders pagination when multiple pages', async () => {
    vi.doMock('@/server/api/routers/content', () => ({
      contentSearchRouter: {
        createCaller: vi.fn(() => ({
          integrated: vi.fn().mockResolvedValue({
            results: [],
            totalCount: 50,
            page: 1,
            totalPages: 3,
          }),
        })),
      },
    }));

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
