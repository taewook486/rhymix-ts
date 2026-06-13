'use client';

/**
 * AssignScopeDialog — Scope selection dialog for theme/layout/skin assignment.
 *
 * SPEC-THEME-POLISH-001 REQ-THEME-POLISH-011.
 * Module instance / Domain / Site scope 선택 UI.
 */

import { useState, useEffect, useRef } from 'react';

interface AssignScopeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (scope: 'module_instance' | 'domain' | 'site') => void;
  type: 'theme' | 'layout' | 'skin';
}

type ScopeType = 'module_instance' | 'domain' | 'site';

export function AssignScopeDialog({ open, onClose, onConfirm, type }: AssignScopeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedScope, setSelectedScope] = useState<ScopeType>('site');

  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (!open && dialogRef.current) {
      dialogRef.current.close();
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm(selectedScope);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Dialog 외부 클릭 시 닫기
  const handleClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      handleCancel();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleClick}
      className="backdrop:bg-black/50 bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
    >
      <h2 className="text-lg font-semibold mb-4">
        {type === 'theme' && '테마 적용 범위'}
        {type === 'layout' && '레이아웃 적용 범위'}
        {type === 'skin' && '스킨 적용 범위'}
      </h2>

      <div className="space-y-3 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="scope"
            value="module_instance"
            checked={selectedScope === 'module_instance'}
            onChange={() => setSelectedScope('module_instance')}
            className="mt-1"
          />
          <div>
            <div className="font-medium">모듈 인스턴스</div>
            <div className="text-sm text-gray-600">
              현재 선택된 모듈 인스턴스에만 적용
            </div>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="scope"
            value="domain"
            checked={selectedScope === 'domain'}
            onChange={() => setSelectedScope('domain')}
            className="mt-1"
          />
          <div>
            <div className="font-medium">도메인</div>
            <div className="text-sm text-gray-600">
              현재 도메인 전체에 적용
            </div>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="scope"
            value="site"
            checked={selectedScope === 'site'}
            onChange={() => setSelectedScope('site')}
            className="mt-1"
          />
          <div>
            <div className="font-medium">사이트</div>
            <div className="text-sm text-gray-600">
              사이트 전체의 기본값으로 적용
            </div>
          </div>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          적용
        </button>
      </div>
    </dialog>
  );
}

// @MX:NOTE: [AUTO] useState는 React hook이므로 import 필요
// 'use client' 지시자로 인해 자동으로 React hooks 사용 가능
