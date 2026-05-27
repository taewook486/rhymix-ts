// @vitest-environment jsdom
/**
 * page.test.tsx — SPEC-PAGE-001 Slice C
 *
 * 페이지 편집 관리자 페이지 + Server Action 단위 테스트.
 * RED 단계 기준 작성.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------- 모듈 목 ----------

vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    moduleInstance: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@rhymix-ts/page', () => ({
  loadPageContent: vi.fn(),
  savePageContent: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NOT_FOUND'); }),
  redirect: vi.fn(() => { throw new Error('REDIRECT'); }),
}));

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/auth/admin-middleware', () => ({
  isAdminSession: vi.fn(),
}));

// PageEditForm 을 test-friendly 목으로 교체
vi.mock(
  './_components/PageEditForm',
  () => ({
    PageEditForm: ({ instanceId, initialContent }: { instanceId: number; initialContent: string }) =>
      React.createElement('div', { 'data-testid': 'page-edit-form' },
        React.createElement('textarea', { 'data-testid': 'mcontent-textarea', defaultValue: initialContent }),
        React.createElement('span', { 'data-testid': 'instance-id' }, String(instanceId)),
      ),
  }),
);

// ---------- imports (목 이후) ----------
import { prisma } from '@rhymix-ts/db';
import { loadPageContent, savePageContent } from '@rhymix-ts/page';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { notFound, redirect } from 'next/navigation';

const mockFindUnique = prisma.moduleInstance.findUnique as ReturnType<typeof vi.fn>;
const mockLoadPageContent = loadPageContent as ReturnType<typeof vi.fn>;
const mockSavePageContent = savePageContent as ReturnType<typeof vi.fn>;
const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockIsAdminSession = isAdminSession as ReturnType<typeof vi.fn>;
const mockNotFound = notFound as ReturnType<typeof vi.fn>;
const mockRedirect = redirect as ReturnType<typeof vi.fn>;

// ---------- 테스트 ----------

describe('PageEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EDIT-1: page 인스턴스가 있으면 현재 mcontent 로 textarea 를 렌더한다', async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: 42,
      moduleCode: 'page',
      mid: 'home',
      name: '홈페이지',
    });
    mockLoadPageContent.mockResolvedValue({
      instanceId: 42,
      mcontent: '<p>기존 내용</p>',
      pageType: 'CONTENT',
      mcontentFormat: 'HTML',
    });

    const { default: PageEditPage } = await import('./page');
    const node = await PageEditPage({ params: Promise.resolve({ instanceId: '42' }) });
    render(node as React.ReactElement);

    // Assert
    const textarea = screen.getByTestId('mcontent-textarea');
    expect(textarea).toBeTruthy();
    const form = screen.getByTestId('page-edit-form');
    expect(form).toBeTruthy();
  });

  it('EDIT-2: moduleCode 가 page 가 아니면 notFound() 를 호출한다', async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: 1,
      moduleCode: 'board',
      mid: 'notice',
      name: '공지',
    });

    const { default: PageEditPage } = await import('./page');

    // Act & Assert
    await expect(
      PageEditPage({ params: Promise.resolve({ instanceId: '1' }) }),
    ).rejects.toThrow('NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('EDIT-3: 인스턴스가 없으면 notFound() 를 호출한다', async () => {
    // Arrange
    mockFindUnique.mockResolvedValue(null);

    const { default: PageEditPage } = await import('./page');

    // Act & Assert
    await expect(
      PageEditPage({ params: Promise.resolve({ instanceId: '999' }) }),
    ).rejects.toThrow('NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('EDIT-4: mcontent 가 null 이면 initialContent 를 빈 문자열로 전달한다', async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: 5,
      moduleCode: 'page',
      mid: 'about',
      name: 'About',
    });
    mockLoadPageContent.mockResolvedValue({
      instanceId: 5,
      mcontent: null,
      pageType: 'CONTENT',
      mcontentFormat: 'HTML',
    });

    const { default: PageEditPage } = await import('./page');
    const node = await PageEditPage({ params: Promise.resolve({ instanceId: '5' }) });
    render(node as React.ReactElement);

    // Assert: textarea 의 defaultValue 가 빈 문자열
    const textarea = screen.getByTestId('mcontent-textarea') as HTMLTextAreaElement;
    expect(textarea.defaultValue).toBe('');
  });
});

describe('savePageAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EDIT-5: 관리자면 savePageContent 를 호출한다', async () => {
    // Arrange
    mockAuth.mockResolvedValue({ user: { id: 1, email: 'admin@example.com' } });
    mockIsAdminSession.mockReturnValue(true);
    mockSavePageContent.mockResolvedValue({
      instanceId: 1,
      mcontent: '<p>내용</p>',
      pageType: 'CONTENT',
      mcontentFormat: 'HTML',
    });
    // redirect 는 항상 throw 하므로 catch 로 무시
    mockRedirect.mockImplementation(() => { throw new Error('REDIRECT'); });

    const { savePageAction } = await import('./actions');

    // Act
    await expect(savePageAction(1, '<p>내용</p>')).rejects.toThrow('REDIRECT');

    // Assert
    expect(mockSavePageContent).toHaveBeenCalledOnce();
    expect(mockSavePageContent).toHaveBeenCalledWith(
      { instanceId: 1, mcontent: '<p>내용</p>', pageType: 'CONTENT' },
      expect.anything(),
    );
  });

  it('EDIT-6: 비관리자면 권한 오류를 throw 한다 (REQ-PAGE-032)', async () => {
    // Arrange
    mockAuth.mockResolvedValue(null);
    mockIsAdminSession.mockReturnValue(false);

    const { savePageAction } = await import('./actions');

    // Act & Assert
    await expect(savePageAction(1, '<p>내용</p>')).rejects.toThrow('관리자 권한이 필요합니다.');
    expect(mockSavePageContent).not.toHaveBeenCalled();
  });

  it('EDIT-7: 저장 성공 후 redirect 를 호출한다', async () => {
    // Arrange
    mockAuth.mockResolvedValue({ user: { id: 1 } });
    mockIsAdminSession.mockReturnValue(true);
    mockSavePageContent.mockResolvedValue({});
    mockRedirect.mockImplementation(() => { throw new Error('REDIRECT'); });

    const { savePageAction } = await import('./actions');

    // Act & Assert
    await expect(savePageAction(2, '<p>내용</p>')).rejects.toThrow('REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/admin/pages/2/edit');
  });
});
