// @vitest-environment jsdom
/**
 * SEO 설정 폼 테스트 — SPEC-SEO-001 AC-SEO-005, AC-SEO-006
 *
 * Tests:
 * - SETTINGS-SEO-FORM-001: form → renders all input fields
 * - SETTINGS-SEO-FORM-002: form → displays initial values correctly
 * - SETTINGS-SEO-FORM-003: form → validates field max lengths
 * - SETTINGS-SEO-FORM-004: form → includes GA ID field (REQ-SEO-006)
 * - SETTINGS-SEO-FORM-005: form → includes Naver verification field (REQ-SEO-006)
 * - SETTINGS-SEO-FORM-006: form → includes robots.txt custom content field (REQ-SEO-006)
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeoSettingsForm } from './SeoSettingsForm';

// Mock actions
vi.mock('./actions', () => ({
  updateSeoSettingsAction: vi.fn(),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useActionState: vi.fn(() => [
      { error: null },
      vi.fn(),
      false,
    ]),
  };
});

describe('SeoSettingsForm', () => {
  const mockInitial = {
    defaultMetaTitle: 'Test Site',
    defaultMetaDescription: 'Test Description',
    ogTitle: 'Test OG Title',
    ogDescription: 'Test OG Description',
    ogImageUrl: 'https://example.com/og.jpg',
    canonicalUrlPolicy: 'default' as const,
    sitemapEnabled: true,
  };

  it('SETTINGS-SEO-FORM-001: form → renders all input fields', () => {
    render(<SeoSettingsForm initial={mockInitial} />);

    // Meta 태그 기본값
    expect(screen.getByLabelText(/기본 메타 제목/i)).toBeTruthy();
    expect(screen.getByLabelText(/기본 메타 설명/i)).toBeTruthy();

    // Open Graph 기본값
    expect(screen.getByLabelText(/OG 제목/i)).toBeTruthy();
    expect(screen.getByLabelText(/OG 설명/i)).toBeTruthy();
    expect(screen.getByLabelText(/OG 이미지 URL/i)).toBeTruthy();

    // Canonical URL 정책
    expect(screen.getByLabelText(/Canonical URL 사용 정책/i)).toBeTruthy();

    // Sitemap 설정
    expect(screen.getByLabelText(/Sitemap.xml 생성 활성화/i)).toBeTruthy();
  });

  it('SETTINGS-SEO-FORM-002: form → displays initial values correctly', () => {
    render(<SeoSettingsForm initial={mockInitial} />);

    const titleInput = screen.getByLabelText(/기본 메타 제목/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Test Site');

    const descInput = screen.getByLabelText(/기본 메타 설명/i) as HTMLTextAreaElement;
    expect(descInput.value).toBe('Test Description');

    const ogTitleInput = screen.getByLabelText(/OG 제목/i) as HTMLInputElement;
    expect(ogTitleInput.value).toBe('Test OG Title');

    const sitemapCheckbox = screen.getByLabelText(/Sitemap.xml 생성 활성화/i) as HTMLInputElement;
    expect(sitemapCheckbox.checked).toBe(true);
  });

  it('SETTINGS-SEO-FORM-003: form → validates field max lengths', () => {
    render(<SeoSettingsForm initial={mockInitial} />);

    const titleInput = screen.getByLabelText(/기본 메타 제목/i) as HTMLInputElement;
    expect(titleInput.maxLength).toBe(200);

    const descInput = screen.getByLabelText(/기본 메타 설명/i) as HTMLTextAreaElement;
    expect(descInput.maxLength).toBe(500);

    const ogTitleInput = screen.getByLabelText(/OG 제목/i) as HTMLInputElement;
    expect(ogTitleInput.maxLength).toBe(200);

    const ogDescInput = screen.getByLabelText(/OG 설명/i) as HTMLTextAreaElement;
    expect(ogDescInput.maxLength).toBe(500);
  });

  it('SETTINGS-SEO-FORM-004: form → includes GA ID field (REQ-SEO-006)', () => {
    render(<SeoSettingsForm initial={mockInitial} />);

    // Google Analytics ID field should be present
    expect(screen.getByLabelText(/Google Analytics ID/i)).toBeTruthy();
  });

  it('SETTINGS-SEO-FORM-005: form → includes Naver verification field (REQ-SEO-006)', () => {
    render(<SeoSettingsForm initial={mockInitial} />);

    // Naver site verification code field should be present
    expect(screen.getByLabelText(/Naver 사이트 인증 코드/i)).toBeTruthy();
  });

  it('SETTINGS-SEO-FORM-006: form → includes robots.txt custom content field (REQ-SEO-006)', () => {
    render(<SeoSettingsForm initial={mockInitial} />);

    // robots.txt custom content field should be present
    expect(screen.getByLabelText(/robots.txt 사용자 정의 내용/i)).toBeTruthy();
  });

  it('SETTINGS-SEO-FORM-007: form → shows error state from action', async () => {
    const { useActionState } = await import('react');
    const mockActionState = { error: '저장에 실패했습니다.' };

    vi.mocked(useActionState).mockReturnValue([
      mockActionState,
      vi.fn(),
      false,
    ]);

    render(<SeoSettingsForm initial={mockInitial} />);

    expect(screen.getByText('저장에 실패했습니다.')).toBeTruthy();
  });

  it('SETTINGS-SEO-FORM-008: form → shows loading state during submission', async () => {
    const { useActionState } = await import('react');
    const mockFormAction = vi.fn();

    const { rerender } = render(<SeoSettingsForm initial={mockInitial} />);

    // Re-render with pending state
    vi.mocked(useActionState).mockReturnValue([
      { error: null },
      mockFormAction,
      true,
    ]);

    rerender(<SeoSettingsForm initial={mockInitial} />);

    const submitButton = screen.getByRole('button', { name: /저장 중/i });
    // toBeDisabled 매처의 타입 augmentation이 레포 전역에 걸쳐 깨져 있으므로
    // 동등한 의미의 직접 프로퍼티 검사로 우회 (SYSTEMIC jest-dom/vitest 타입 갭).
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);
  });
});
