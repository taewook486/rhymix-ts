// @vitest-environment jsdom
/**
 * page.test.tsx — SPEC-PAGE-001 Slice C + SPEC-ADMIN-002 Slice 3D.
 *
 * 페이지 편집 관리자 페이지 + Server Action 단위 테스트.
 * RED 단계 기준 작성.
 * REQ-ADMIN2-028: 모바일 페이지 콘텐츠 지원 테스트 추가.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

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
    PageEditForm: ({
      instanceId,
      initialContent,
      initialMobileContent,
    }: {
      instanceId: number;
      initialContent: string;
      initialMobileContent?: string;
    }) => {
      const children = [
        React.createElement('textarea', {
          key: 'desktop',
          'data-testid': 'mcontent-textarea',
          defaultValue: initialContent,
        }),
        React.createElement('span', { key: 'instance-id', 'data-testid': 'instance-id' }, String(instanceId)),
      ];

      if (initialMobileContent !== undefined) {
        children.push(
          React.createElement('textarea', {
            key: 'mobile',
            'data-testid': 'mcontent-mobile-textarea',
            defaultValue: initialMobileContent,
          }),
        );
      }

      return React.createElement('div', { 'data-testid': 'page-edit-form' }, ...children);
    },
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

  it('EDIT-8: 모바일 콘텐츠가 있으면 모바일 탭 textarea 렌더 (REQ-ADMIN2-028)', async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: 10,
      moduleCode: 'page',
      mid: 'mobile-home',
      name: '모바일 홈',
    });
    mockLoadPageContent.mockResolvedValue({
      instanceId: 10,
      mcontent: '<p>데스크톱 내용</p>',
      mcontentMobile: '<p>모바일 내용</p>',
      pageType: 'CONTENT',
      mcontentFormat: 'HTML',
    });

    const { default: PageEditPage } = await import('./page');
    const node = await PageEditPage({ params: Promise.resolve({ instanceId: '10' }) });
    render(node as React.ReactElement);

    // Assert: 모바일 콘텐츠 textarea가 렌더되어야 함 (현재는 실패할 것임 - RED phase)
    const mobileTextarea = screen.queryByTestId('mcontent-mobile-textarea');
    expect(mobileTextarea).toBeTruthy(); // 이 테스트는 처음에 실패해야 함
  });

  it('EDIT-9: saveMobilePageAction으로 모바일 콘텐츠 저장 (REQ-ADMIN2-028)', async () => {
    // Arrange
    mockAuth.mockResolvedValue({ user: { id: 1 } });
    mockIsAdminSession.mockReturnValue(true);
    mockSavePageContent.mockResolvedValue({
      instanceId: 5,
      mcontent: '<p>데스크톱</p>',
      mcontentMobile: '<p>모바일</p>',
      pageType: 'CONTENT',
      mcontentFormat: 'HTML',
    });
    mockRedirect.mockImplementation(() => { throw new Error('REDIRECT'); });

    const { saveMobilePageAction } = await import('./actions');

    // Act & Assert
    await expect(saveMobilePageAction(5, '<p>모바일</p>')).rejects.toThrow('REDIRECT');
    expect(mockSavePageContent).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: 5,
        mcontentMobile: '<p>모바일</p>',
      }),
      expect.anything(),
    );
  });
});
