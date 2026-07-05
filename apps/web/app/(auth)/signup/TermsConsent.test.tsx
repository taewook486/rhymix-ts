/**
 * @vitest-environment jsdom
 */

/**
 * 이용약관 동의 컴포넌트 테스트 — SPEC-CAPTCHA-001.
 *
 * 약관 체크박스 렌더링 및 필수 약관 동의 검증을 테스트한다.
 * TermsConsent 는 terms 를 prop 으로 받는다 (페이지에서 tRPC 로 조회 후 전달).
 */
import React from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TermsConsent, type TermsConsentProps } from './TermsConsent';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock Dialog component.
// DialogContent 는 실제 Radix 구현에서 열리기 전까지 DOM 에 존재하지 않으므로
// null 을 반환하여 닫힌 상태를 재현한다 (제목 텍스트 중복 렌더 방지).
vi.mock('@rhymix-ts/ui', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: () => null,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? children : <button>{children}</button>,
}));

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const mockTerms = [
  {
    id: 1,
    type: 'terms' as const,
    title: '이용약관',
    content: '본 약관은...',
    required: true,
  },
  {
    id: 2,
    type: 'privacy' as const,
    title: '개인정보 처리방침',
    content: '개인정보를...',
    required: true,
  },
  {
    id: 3,
    type: 'custom' as const,
    title: '마케팅 정보 수신',
    content: '마케팅 정보를...',
    required: false,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TermsConsent', () => {
  afterEach(() => {
    cleanup();
  });

  it('terms 가 null 이면 로딩 메시지를 표시', () => {
    render(
      React.createElement(TermsConsent, {
        selectedAgreements: new Set<number>(),
        onToggleAgreement: vi.fn(),
        terms: null as unknown as TermsConsentProps['terms'],
      }),
    );

    // terms === null 은 로딩 상태를 의미한다.
    expect(screen.getByText(/약관 로딩 중/i)).toBeDefined();
  });

  it('표시할 약관이 없으면 안내 메시지를 표시', () => {
    render(
      React.createElement(TermsConsent, {
        selectedAgreements: new Set<number>(),
        onToggleAgreement: vi.fn(),
        terms: [],
      }),
    );

    // 빈 배열은 "표시할 약관 없음" 상태를 의미한다.
    expect(screen.getByText(/표시할 약관이 없습니다/i)).toBeDefined();
  });

  it('약관 목록을 렌더링', () => {
    render(
      React.createElement(TermsConsent, {
        selectedAgreements: new Set<number>(),
        onToggleAgreement: vi.fn(),
        terms: mockTerms,
      }),
    );

    expect(screen.getByText('이용약관')).toBeDefined();
    expect(screen.getByText('개인정보 처리방침')).toBeDefined();
    expect(screen.getByText('마케팅 정보 수신')).toBeDefined();
  });

  it('필수 약관에 (필수) 라벨을 표시', () => {
    render(
      React.createElement(TermsConsent, {
        selectedAgreements: new Set<number>(),
        onToggleAgreement: vi.fn(),
        terms: mockTerms,
      }),
    );

    // 필수 약관 2개 (이용약관, 개인정보 처리방침) 에 (필수) 라벨이 표시된다.
    expect(screen.getAllByText('(필수)')).toHaveLength(2);
  });

  it('선택 약관에 (선택) 라벨을 표시', () => {
    render(
      React.createElement(TermsConsent, {
        selectedAgreements: new Set<number>(),
        onToggleAgreement: vi.fn(),
        terms: mockTerms,
      }),
    );

    // 선택 약관 1개 (마케팅 정보 수신) 에 (선택) 라벨이 표시된다.
    expect(screen.getByText('(선택)')).toBeDefined();
  });

  it('체크박스 클릭 시 onToggleAgreement 를 호출', () => {
    const onToggle = vi.fn();
    render(
      React.createElement(TermsConsent, {
        selectedAgreements: new Set<number>(),
        onToggleAgreement: onToggle,
        terms: mockTerms,
      }),
    );

    const checkbox = screen.getByLabelText(/이용약관/) as HTMLInputElement;
    fireEvent.click(checkbox);

    // 컴포넌트는 term 객체 전체를 콜백으로 전달한다.
    expect(onToggle).toHaveBeenCalledWith(mockTerms[0]);
  });

  it('이미 선택된 약관은 checked 상태로 표시', () => {
    const selected = new Set<number>([1]);
    render(
      React.createElement(TermsConsent, {
        selectedAgreements: selected,
        onToggleAgreement: vi.fn(),
        terms: mockTerms,
      }),
    );

    const checkbox = screen.getByLabelText(/이용약관/) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});
