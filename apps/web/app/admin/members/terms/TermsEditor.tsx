'use client';

/**
 * 약관 편집기 컴포넌트 — SPEC-CAPTCHA-001 REQ-CAPTCHA-002.
 *
 * 약관 목록을 표시하고 CRUD 기능을 제공한다.
 * 관리자는 약관 추가, 수정, 삭제, 활성화/비활성화를 할 수 있다.
 *
 * @MX:NOTE: [AUTO] 약관 편집 Client Component — 목록 표시 및 CRUD 제공.
 * @MX:SPEC: SPEC-CAPTCHA-001 REQ-CAPTCHA-002, AC-CAPTCHA-006
 */
import React, { useState, useActionState, useRef, useEffect } from 'react';
import { upsertTermAction, deleteTermAction, type ActionState } from './actions';

export interface Term {
  id: number;
  type: 'terms' | 'privacy' | 'custom';
  title: string;
  content: string;
  required: boolean;
  active: boolean;
}

interface TermsEditorProps {
  initialTerms: Term[];
}

export function TermsEditor({ initialTerms }: TermsEditorProps) {
  const [terms, setTerms] = useState<Term[]>(initialTerms);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // 삭제 진행 중인 약관 ID — dispatch 는 결과를 반환하지 않으므로
  // deleteState.success 를 관찰해 어떤 항목을 제거할지 기억해 둔다.
  const pendingDeleteIdRef = useRef<number | null>(null);

  const [upsertState, upsertFormAction, upsertPending] = useActionState(
    upsertTermAction,
    {} as ActionState,
  );

  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteTermAction,
    {} as ActionState,
  );

  const handleEdit = (term: Term) => {
    setEditingTerm(term);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingTerm({
      id: 0,
      type: 'custom',
      title: '',
      content: '',
      required: false,
      active: true,
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setEditingTerm(null);
    setIsCreating(false);
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  const handleDelete = (id: number) => {
    const formData = new FormData();
    formData.append('id', id.toString());
    pendingDeleteIdRef.current = id;
    deleteFormAction(formData);
  };

  // Handle delete state changes
  useEffect(() => {
    if (deleteState.success && pendingDeleteIdRef.current !== null) {
      setTerms(terms.filter((t) => t.id !== pendingDeleteIdRef.current));
      pendingDeleteIdRef.current = null;
    }
  }, [deleteState.success, terms]);

  const handleUpsertSuccess = () => {
    if (upsertState.success) {
      // Reload terms list after successful upsert
      // TODO: Replace with actual API call
      setEditingTerm(null);
      setIsCreating(false);
    }
  };

  // Show form for creating or editing
  const showForm = isCreating || editingTerm;

  return (
    <div className="space-y-6">
      {/* Error messages */}
      {upsertState.error && (
        <div className="text-sm text-red-600 p-3 bg-red-50 rounded" role="alert">
          {upsertState.error}
        </div>
      )}
      {deleteState.error && (
        <div className="text-sm text-red-600 p-3 bg-red-50 rounded" role="alert">
          {deleteState.error}
        </div>
      )}

      {/* Create button */}
      {!showForm && (
        <button
          type="button"
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          새 약관 추가
        </button>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <form ref={formRef} action={upsertFormAction} className="border rounded p-6 space-y-4">
          <h3 className="text-lg font-medium">
            {isCreating ? '새 약관 추가' : '약관 수정'}
          </h3>

          {editingTerm && editingTerm.id > 0 && (
            <input type="hidden" name="id" value={editingTerm.id} />
          )}

          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">
              약관 유형
            </label>
            <select
              id="type"
              name="type"
              defaultValue={editingTerm?.type}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="terms">이용약관</option>
              <option value="privacy">개인정보 처리방침</option>
              <option value="custom">추가 약관</option>
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              제목
            </label>
            <input
              id="title"
              name="title"
              type="text"
              defaultValue={editingTerm?.title}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-1">
              내용
            </label>
            <textarea
              id="content"
              name="content"
              defaultValue={editingTerm?.content}
              rows={10}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="required"
                className="rounded mr-2"
                defaultChecked={editingTerm?.required ?? false}
              />
              <span className="text-sm">필수 동의</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="active"
                className="rounded mr-2"
                defaultChecked={editingTerm?.active ?? true}
              />
              <span className="text-sm">활성화</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={upsertPending}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {upsertPending ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {/* Terms List */}
      {!showForm && (
        <div className="border rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">유형</th>
                <th className="px-4 py-2 text-left text-sm font-medium">제목</th>
                <th className="px-4 py-2 text-left text-sm font-medium">필수</th>
                <th className="px-4 py-2 text-left text-sm font-medium">활성</th>
                <th className="px-4 py-2 text-left text-sm font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((term) => (
                <tr key={term.id} className="border-t">
                  <td className="px-4 py-2 text-sm">
                    {term.type === 'terms' && '이용약관'}
                    {term.type === 'privacy' && '개인정보'}
                    {term.type === 'custom' && '추가'}
                  </td>
                  <td className="px-4 py-2 text-sm">{term.title}</td>
                  <td className="px-4 py-2 text-sm">{term.required ? '필수' : '선택'}</td>
                  <td className="px-4 py-2 text-sm">{term.active ? '활성' : '비활성'}</td>
                  <td className="px-4 py-2 text-sm">
                    <button
                      type="button"
                      onClick={() => handleEdit(term)}
                      className="text-blue-600 hover:underline mr-2"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(term.id)}
                      className="text-red-600 hover:underline"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
