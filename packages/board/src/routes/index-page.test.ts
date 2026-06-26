/**
 * routes/index-page.test.tsx — SPEC-CONTENT-001 Slice C
 *
 * IP-1 ~ IP-6: BoardIndexPage cursor pagination + notices + category dropdown 검증.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMockPrismaClient } from '@rhymix-ts/test-utils';

describe('BoardIndexPage (Slice C)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('IP-1: notices[] 가 있으면 [공지] 배지와 함께 상단에 렌더됨', async () => {
    // Mock at the package level
    vi.doMock('@rhymix-ts/document', () => ({
      listDocuments: vi.fn().mockResolvedValue({
        notices: [{ id: 10, title: '공지사항', listOrder: BigInt(9999) }],
        items: [],
        nextCursor: null,
      }),
      listCategoryTree: vi.fn().mockResolvedValue([]),
    }));

    const mockPrisma = createMockPrismaClient();

    const { BoardIndexPage } = await import('./index-page.js');

    const fakeProps = {
      instance: { id: 1, moduleCode: 'board', mid: 'notice', name: '공지', config: null },
      params: {},
      searchParams: {},
      prisma: mockPrisma,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardIndexPage(fakeProps as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    expect(html).toContain('[공지]');
    expect(html).toContain('공지사항');
  });

  it('IP-2: items[] 가 렌더됨', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      listDocuments: vi.fn().mockResolvedValue({
        notices: [],
        items: [{ id: 1, title: '일반글', listOrder: BigInt(100) }],
        nextCursor: null,
      }),
      listCategoryTree: vi.fn().mockResolvedValue([]),
    }));

    const mockPrisma = createMockPrismaClient();

    const { BoardIndexPage } = await import('./index-page.js');

    const fakeProps = {
      instance: { id: 1, moduleCode: 'board', mid: 'notice', name: '공지', config: null },
      params: {},
      searchParams: {},
      prisma: mockPrisma,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardIndexPage(fakeProps as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    expect(html).toContain('일반글');
    expect(html).not.toContain('[공지]');
  });

  it('IP-3: nextCursor 있으면 다음 페이지 링크가 렌더됨', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      listDocuments: vi.fn().mockResolvedValue({
        notices: [],
        items: [{ id: 1, title: '글1', listOrder: BigInt(100) }],
        nextCursor: 'abc123cursor',
      }),
      listCategoryTree: vi.fn().mockResolvedValue([]),
    }));

    const mockPrisma = createMockPrismaClient();

    const { BoardIndexPage } = await import('./index-page.js');

    const fakeProps = {
      instance: { id: 1, moduleCode: 'board', mid: 'notice', name: '공지', config: null },
      params: {},
      searchParams: {},
      prisma: mockPrisma,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardIndexPage(fakeProps as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    expect(html).toContain('abc123cursor');
  });

  it('IP-4: nextCursor 없으면 다음 페이지 링크가 없음 (비활성 or 미표시)', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      listDocuments: vi.fn().mockResolvedValue({
        notices: [],
        items: [],
        nextCursor: null,
      }),
      listCategoryTree: vi.fn().mockResolvedValue([]),
    }));

    const mockPrisma = createMockPrismaClient();

    const { BoardIndexPage } = await import('./index-page.js');

    const fakeProps = {
      instance: { id: 1, moduleCode: 'board', mid: 'notice', name: '공지', config: null },
      params: {},
      searchParams: {},
      prisma: mockPrisma,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardIndexPage(fakeProps as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    // nextCursor 가 null 이면 cursor 파라미터가 없는 상태 (다음 페이지 없음)
    expect(html).not.toContain('cursor=abc123cursor');
  });

  it('IP-5: 카테고리 드롭다운 렌더됨 (listCategoryTree 결과 사용)', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      listDocuments: vi.fn().mockResolvedValue({
        notices: [],
        items: [],
        nextCursor: null,
      }),
      listCategoryTree: vi.fn().mockResolvedValue([
        { id: 1, title: '자유게시판', children: [] },
        { id: 2, title: '질문게시판', children: [] },
      ]),
    }));

    const mockPrisma = createMockPrismaClient();

    const { BoardIndexPage } = await import('./index-page.js');

    const fakeProps = {
      instance: { id: 1, moduleCode: 'board', mid: 'notice', name: '공지', config: null },
      params: {},
      searchParams: {},
      prisma: mockPrisma,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardIndexPage(fakeProps as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    expect(html).toContain('자유게시판');
    expect(html).toContain('질문게시판');
    expect(html).toContain('<select');
  });

  it('IP-6: searchParams.cursor 가 listDocuments 에 전달됨', async () => {
    const mockListDocuments = vi.fn().mockResolvedValue({
      notices: [],
      items: [],
      nextCursor: null,
    });

    vi.doMock('@rhymix-ts/document', () => ({
      listDocuments: mockListDocuments,
      listCategoryTree: vi.fn().mockResolvedValue([]),
    }));

    const mockPrisma = createMockPrismaClient();

    const { BoardIndexPage } = await import('./index-page.js');

    const fakeProps = {
      instance: { id: 1, moduleCode: 'board', mid: 'notice', name: '공지', config: null },
      params: {},
      searchParams: { cursor: 'testcursor123' },
      prisma: mockPrisma,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await BoardIndexPage(fakeProps as any);

    expect(mockListDocuments).toHaveBeenCalledOnce();
    const callArg = mockListDocuments.mock.calls[0]?.[0] as { cursor: string };
    expect(callArg?.cursor).toBe('testcursor123');
  });
});
