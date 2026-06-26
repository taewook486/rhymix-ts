// @vitest-environment jsdom
/**
 * apps/web/app/admin/boards/[mid]/feed/page.test.tsx
 * SPEC-FEED-001 Slice C (T-011) — 게시판 피드 설정 관리자 페이지 RED 테스트.
 *
 * permissions/extra-keys 페이지와 동일한 패턴: Server Component를 직접 호출하여
 * 렌더 결과를 검증한다. auth/prisma/getModuleInstanceByMid 는 vi.mock 으로 대체.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import React from 'react';

const mockAuth = vi.fn();
const mockGetModuleInstanceByMid = vi.fn();
const mockBoardFindUnique = vi.fn();
const mockBoardUpdate = vi.fn();
const mockRevalidateTag = vi.fn();
const mockRedirect = vi.fn();
const mockNotFound = vi.fn();

vi.mock('@/lib/auth/config', () => ({
  auth: mockAuth,
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    board: {
      findUnique: mockBoardFindUnique,
      update: mockBoardUpdate,
    },
    $transaction: (cb: (tx: { board: { update: typeof mockBoardUpdate } }) => unknown) =>
      cb({ board: { update: mockBoardUpdate } }),
  },
}));

vi.mock('@rhymix-ts/core/modules', () => ({
  getModuleInstanceByMid: mockGetModuleInstanceByMid,
}));

vi.mock('next/cache', () => ({
  revalidateTag: mockRevalidateTag,
}));

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
  redirect: mockRedirect,
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(
    new Map([['x-site-id', '1']]) as unknown as Headers,
  ),
}));

// @rhymix-ts/board/feed → resolve-feed.ts → @rhymix-ts/document(무거운 패키지) 를 임포트해서 타임아웃.
// boardFeedConfigSchema만 인라인 스텁으로 제공해 전체 패키지 로드 방지.
vi.mock('@rhymix-ts/board/feed', async () => {
  const { z } = await import('zod');
  const boardFeedConfigSchema = z.object({
    enabled: z.boolean().default(false),
    itemCount: z.number().int().min(1).max(1000).default(20),
    fullContent: z.boolean().default(false),
    excerptLength: z.number().int().positive().default(400),
    description: z.string().optional(),
    imageUrl: z.string().url().optional(),
    copyright: z.string().optional(),
  });
  return { boardFeedConfigSchema };
});

describe('FeedSettingsPage (SPEC-FEED-001 Slice C / T-011)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { isAdmin: true } });
    mockGetModuleInstanceByMid.mockResolvedValue({ id: 42, name: '자유게시판', mid: 'free' });
    mockBoardFindUnique.mockResolvedValue({
      id: 7,
      moduleInstanceId: 42,
      feedConfig: {
        enabled: true,
        itemCount: 30,
        fullContent: false,
        excerptLength: 250,
        description: '자유게시판 피드',
        imageUrl: 'https://example.com/feed.png',
        copyright: '(c) example',
      },
    });
  });

  it('T-011-UI-1: 관리자에게 현재 feedConfig 값을 채운 폼을 렌더한다', async () => {
    const { default: FeedSettingsPage } = await import('./page');
    const result = await FeedSettingsPage({ params: Promise.resolve({ mid: 'free' }) });

    const { container, getByLabelText } = render(result as React.ReactElement);

    expect((getByLabelText('피드 활성화') as HTMLInputElement).checked).toBe(true);
    expect((getByLabelText('항목 수') as HTMLInputElement).value).toBe('30');
    expect((getByLabelText('전체 본문 포함') as HTMLInputElement).checked).toBe(false);
    expect((getByLabelText('발췌 길이') as HTMLInputElement).value).toBe('250');
    expect((getByLabelText('피드 설명') as HTMLTextAreaElement).value).toBe('자유게시판 피드');
    expect((getByLabelText('피드 이미지 URL') as HTMLInputElement).value).toBe(
      'https://example.com/feed.png',
    );
    expect((getByLabelText('저작권') as HTMLInputElement).value).toBe('(c) example');

    // REQ-FEED-054: fullContent=false 이므로 excerptLength 입력이 활성 상태여야 한다.
    expect((getByLabelText('발췌 길이') as HTMLInputElement).disabled).toBe(false);
    expect(container.querySelector('form')).not.toBeNull();
  });

  it('T-011-UI-2: feedConfig 가 없을 때 기본값(boardFeedConfigSchema)으로 렌더한다', async () => {
    mockBoardFindUnique.mockResolvedValue({ id: 7, moduleInstanceId: 42, feedConfig: {} });

    const { default: FeedSettingsPage } = await import('./page');
    const result = await FeedSettingsPage({ params: Promise.resolve({ mid: 'free' }) });

    const { getByLabelText } = render(result as React.ReactElement);

    expect((getByLabelText('피드 활성화') as HTMLInputElement).checked).toBe(false);
    expect((getByLabelText('항목 수') as HTMLInputElement).value).toBe('20');
    expect((getByLabelText('발췌 길이') as HTMLInputElement).value).toBe('400');
  });

  it('T-011-SEC-1: 관리자가 아니면 /login 으로 redirect 한다', async () => {
    mockAuth.mockResolvedValue({ user: { isAdmin: false } });

    const { default: FeedSettingsPage } = await import('./page');
    await FeedSettingsPage({ params: Promise.resolve({ mid: 'free' }) });

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/login'),
    );
  });

  it('T-011-SAVE-1: 저장 시 boardFeedConfigSchema 로 검증 후 트랜잭션 업데이트하고 revalidateTag 를 호출한다', async () => {
    const { default: FeedSettingsPage } = await import('./page');
    const result = await FeedSettingsPage({ params: Promise.resolve({ mid: 'free' }) });

    const formData = new FormData();
    formData.set('enabled', 'on');
    formData.set('itemCount', '50');
    formData.set('fullContent', 'on');
    formData.set('excerptLength', '400');
    formData.set('description', '새 설명');
    formData.set('imageUrl', 'https://example.com/new.png');
    formData.set('copyright', '(c) new');

    const formElement = (result as React.ReactElement<{ children?: React.ReactNode }>)
      .props.children;
    // form 은 children 배열의 마지막 엘리먼트(설정 폼) — action prop을 직접 호출한다.
    const formNode = Array.isArray(formElement)
      ? formElement.find(
          (el): el is React.ReactElement<{ action: (fd: FormData) => Promise<void> }> =>
            React.isValidElement(el) && (el.props as { action?: unknown }).action !== undefined,
        )
      : formElement;

    expect(formNode).toBeDefined();
    await (formNode as React.ReactElement<{ action: (fd: FormData) => Promise<void> }>).props.action(
      formData,
    );

    expect(mockBoardUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        feedConfig: {
          enabled: true,
          itemCount: 50,
          fullContent: true,
          excerptLength: 400,
          description: '새 설명',
          imageUrl: 'https://example.com/new.png',
          copyright: '(c) new',
        },
      },
    });
    expect(mockRevalidateTag).toHaveBeenCalledWith('feed:42', undefined);
  });
});
