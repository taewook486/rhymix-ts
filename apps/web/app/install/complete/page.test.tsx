// @vitest-environment jsdom
/**
 * 설치 완료 페이지 테스트 (SPEC-INSTALL-002 Group 3).
 *
 * GREEN 단계: 카피가 기본 모듈/메뉴/콘텐츠 존재를 정확히 안내하며,
 * "첫 모듈 인스턴스를 생성하세요" 등 빈 상태 전제 문구를 포함하지 않습니다.
 *
 * REQ-INSTALL2-020: 기본 모듈(board/notice/qna), 메뉴, 샘플 문서 존재를 안내
 * REQ-INSTALL2-021: 커스터마이징 방향 안내
 * REQ-INSTALL2-022: "첫 모듈 인스턴스를 생성하세요" 등 빈 상태 전제 문구 금지
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// --- mocks ---
vi.mock('@/lib/install/wizard-session', () => ({
  getWizardSession: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

import { getWizardSession } from '@/lib/install/wizard-session';

const mockGetWizardSession = getWizardSession as ReturnType<typeof vi.fn>;

describe('InstallCompletePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('REQ-INSTALL2-020, 021, 022: 다음 단계 안내 카피 정합성', () => {
    it('AC-INSTALL2-008: 설치 완료 시 기본 모듈/메뉴/콘텐츠 존재를 안내하고, "첫 모듈 인스턴스를 생성" 문구는 포함하지 않는다', async () => {
      // Arrange
      mockGetWizardSession.mockResolvedValue({
        step: 'finish',
        language: 'ko',
        siteUrl: '',
        adminEmail: '',
        adminNickname: '',
        timezone: 'Asia/Seoul',
      });

      // Act
      const { default: InstallCompletePage } = await import('./page');
      const result = await InstallCompletePage();
      render(result as React.ReactElement);

      // Assert - REQ-INSTALL2-020: 기본 모듈/메뉴/콘텐츠 존재 안내
      const nextStepsSection = screen.getByText('다음 단계 안내');
      expect(nextStepsSection).toBeTruthy();

      const listItems = screen.getAllByRole('listitem');
      const listText = listItems.map((item) => item.textContent).join(' ');

      // 기본 모듈(board/notice/qna), 메뉴, 샘플 문서가 이미 생성되었음을 언급
      expect(listText).toMatch(/기본.*모듈/);
      expect(listText).toMatch(/메뉴/);
      expect(listText).toMatch(/샘플.*문서|샘플.*콘텐츠/);

      // Assert - REQ-INSTALL2-021: 커스터마이징 방향 안내
      expect(listText).toMatch(/편집|추가|변경|커스터마이징/);

      // Assert - REQ-INSTALL2-022: "첫 모듈 인스턴스를 생성" 문구 부재
      expect(listText).not.toMatch(/첫.*모듈.*인스턴스.*생성/);
      expect(listText).not.toMatch(/첫 번째.*모듈/);
      expect(listText).not.toMatch(/처음.*모듈.*만들/);
    });
  });
});
