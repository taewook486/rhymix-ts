'use client';

/**
 * 이용약관 동의 컴포넌트 — SPEC-CAPTCHA-001 REQ-CAPTCHA-001.
 *
 * 관리자가 설정한 활성 약관 목록을 조회하여 체크박스로 표시한다.
 * 필수 약관은 (필수), 선택 약관은 (선택) 라벨을 표시한다.
 * "약관 보기" 링크 클릭 시 약관 내용을 모달로 표시한다.
 *
 * @MX:NOTE: [AUTO] 약관 동의 Client Component — public.terms.listActive 쿼리 후 렌더링.
 * @MX:SPEC: SPEC-CAPTCHA-001 REQ-CAPTCHA-001, AC-CAPTCHA-001, AC-CAPTCHA-002, AC-CAPTCHA-006
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@rhymix-ts/ui';

export interface TermsConsentProps {
  /** 이미 동의한 약관 (key 값들) 집합 - 계산용 */
  selectedAgreements: Set<number>;
  /** 약관 동의 토글 핸들러 - term 객체 전체를 받음 */
  onToggleAgreement: (term: { id: number; type: string; required: boolean }) => void;
  /** 약관 목록 */
  terms: Array<{ id: number; type: string; title: string; content: string; required: boolean }>;
}

/**
 * 이용약관 동의 폼 섹션.
 *
 * 사용:
 * ```tsx
 * const [agreements, setAgreements] = useState<Set<number>>(new Set());
 * const handleToggle = (id: number) => {
 *   setAgreements(prev => {
 *     const next = new Set(prev);
 *     if (next.has(id)) next.delete(id);
 *     else next.add(id);
 *     return next;
 *   });
 * };
 * <TermsConsent selectedAgreements={agreements} onToggleAgreement={handleToggle} />
 * ```
 */
export function TermsConsent({ selectedAgreements, onToggleAgreement, terms }: TermsConsentProps) {
  const [openedTermId, setOpenedTermId] = useState<number | null>(null);

  // Loading state
  if (!terms || terms.length === 0) {
    return (
      <div className="space-y-3 p-4 border border-gray-300 rounded bg-gray-50">
        <p className="text-sm text-gray-600">{terms === null ? '약관 로딩 중...' : '표시할 약관이 없습니다.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 border border-gray-300 rounded bg-gray-50">
      <h3 className="text-sm font-medium text-gray-900">이용약관 동의</h3>

      {terms.map((term) => {
        const isChecked = selectedAgreements.has(term.id);
        const termToOpen = terms.find((t) => t.id === openedTermId);

        return (
          <div key={term.id} className="flex items-start gap-2">
            <input
              id={`term-${term.id}`}
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggleAgreement(term)}
              className="mt-1 w-4 h-4 border border-gray-300 rounded cursor-pointer"
            />

            <label htmlFor={`term-${term.id}`} className="flex-1 text-sm text-gray-700 cursor-pointer">
              <span className="font-medium">
                {term.title}
              </span>
              <span className="text-gray-500">
                ({term.required ? '필수' : '선택'})
              </span>
            </label>

            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  onClick={() => setOpenedTermId(term.id)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  약관 보기
                </button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{termToOpen?.title || term.title}</DialogTitle>
                </DialogHeader>
                <DialogDescription asChild>
                  <div className="whitespace-pre-wrap text-sm text-gray-700">
                    {termToOpen?.content || term.content}
                  </div>
                </DialogDescription>
              </DialogContent>
            </Dialog>
          </div>
        );
      })}
    </div>
  );
}
