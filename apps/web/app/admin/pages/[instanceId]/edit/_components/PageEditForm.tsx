'use client';

/**
 * PageEditForm.tsx — SPEC-PAGE-001 Slice C + SPEC-ADMIN-002 Slice 2A + Slice 3D.
 *
 * 페이지 본문 편집 클라이언트 컴포넌트.
 * textarea + 저장/되돌리기(revert) 버튼으로 구성된 간단한 HTML 편집 폼.
 *
 * REQ-ADMIN2-026: 저장 및 되돌리기(revert) 기능 제공
 * REQ-ADMIN2-027: 기본 페이지 설정 필드 (title, browserTitle, layout, grant)
 * REQ-ADMIN2-028: 모바일 페이지 콘텐츠 편집 지원
 * REQ-ADMIN2-029: 페이지 삭제 기능
 *
 * @MX:NOTE [AUTO]: 클라이언트 컴포넌트로 분리된 이유 — textarea 상태와 form submit 상태가 필요.
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-031 + SPEC-ADMIN-002 REQ-ADMIN2-026, REQ-ADMIN2-027, REQ-ADMIN2-028, REQ-ADMIN2-029
 */
import React, { useTransition, useState } from 'react';
import { savePageAction, saveMobilePageAction, deletePageAction, updatePageSettingsAction } from '../actions';

interface PageEditFormProps {
  instanceId: number;
  initialContent: string;
  initialMobileContent?: string; // REQ-ADMIN2-028: 모바일 콘텐츠 초기값
  instance: {
    id: number;
    name: string;
    mid: string;
    browserTitle: string | null;
    layoutId: string | null;
    config: unknown;
  };
}

/**
 * 페이지 본문 편집 폼.
 * Save 버튼 클릭 시 savePageAction Server Action 을 호출한다.
 * Revert 버튼으로 초기 상태로 되돌릴 수 있다 (REQ-ADMIN2-026).
 *
 * REQ-ADMIN2-027: 페이지 설정 필드를 포함 (title, browserTitle, layoutId, grant).
 * REQ-ADMIN2-028: 모바일 콘텐츠 편집 탭 추가.
 * REQ-ADMIN2-029: 삭제 버튼과 확인 다이얼로그.
 */
export function PageEditForm({ instanceId, initialContent, initialMobileContent, instance }: PageEditFormProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState(initialContent);
  const [mobileContent, setMobileContent] = useState(initialMobileContent ?? ''); // REQ-ADMIN2-028
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile'>('desktop'); // REQ-ADMIN2-028
  const [isDirty, setIsDirty] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 페이지 설정 상태 (REQ-ADMIN2-027)
  const [settings, setSettings] = useState({
    title: instance.name,
    browserTitle: instance.browserTitle ?? '',
    layoutId: instance.layoutId ?? '',
    grant: ((instance.config as Record<string, unknown>)?.grant as Record<string, unknown>) || null,
  });

  function handleSettingsSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      await updatePageSettingsAction(instanceId, {
        title: String(data.get('title') ?? ''),
        browserTitle: String(data.get('browserTitle') ?? ''),
        layoutId: String(data.get('layoutId') ?? '') || null,
        grant: settings.grant,
      });
    });
  }

  function handleContentSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const mcontent = String(data.get('mcontent') ?? '');

    startTransition(async () => {
      await savePageAction(instanceId, mcontent);
      setIsDirty(false);
    });
  }

  function handleRevert(): void {
    setContent(initialContent);
    setMobileContent(initialMobileContent ?? '');
    setIsDirty(false);
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    if (activeTab === 'desktop') {
      setContent(event.target.value);
      setIsDirty(event.target.value !== initialContent);
    } else {
      setMobileContent(event.target.value);
      setIsDirty(event.target.value !== (initialMobileContent ?? ''));
    }
  }

  // REQ-ADMIN2-028: 모바일 콘텐츠 저장 핸들러
  function handleMobileSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const mcontent = String(data.get('mcontentMobile') ?? '');

    startTransition(async () => {
      await saveMobilePageAction(instanceId, mcontent);
      setIsDirty(false);
    });
  }

  function handleDelete(): void {
    startTransition(async () => {
      await deletePageAction(instanceId);
      // 삭제 후 리다이렉트는 Server Action에서 처리
    });
  }

  return (
    <div className="space-y-8">
      {/* 페이지 설정 섹션 (REQ-ADMIN2-027) */}
      <section className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold mb-4">페이지 설정</h2>
        <form onSubmit={handleSettingsSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-zinc-700 mb-2">
                페이지 제목
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={settings.title}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                className="w-full border border-zinc-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isPending}
              />
            </div>
            <div>
              <label htmlFor="browserTitle" className="block text-sm font-medium text-zinc-700 mb-2">
                브라우저 제목
              </label>
              <input
                type="text"
                id="browserTitle"
                name="browserTitle"
                value={settings.browserTitle}
                onChange={(e) => setSettings({ ...settings, browserTitle: e.target.value })}
                className="w-full border border-zinc-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isPending}
              />
            </div>
          </div>
          <div>
            <label htmlFor="layoutId" className="block text-sm font-medium text-zinc-700 mb-2">
              레이아웃 ID
            </label>
            <input
              type="text"
              id="layoutId"
              name="layoutId"
              value={settings.layoutId}
              onChange={(e) => setSettings({ ...settings, layoutId: e.target.value })}
              className="w-full border border-zinc-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPending}
              placeholder="레이아웃 ID 입력 (선택)"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </form>
      </section>

      {/* 페이지 본문 편집 섹션 */}
      <section>
        <h2 className="text-lg font-semibold mb-4">페이지 본문</h2>

        {/* REQ-ADMIN2-028: 데스크톱/모바일 탭 */}
        <div className="mb-4 border-b border-zinc-200">
          <nav className="flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab('desktop')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'desktop'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              데스크톱
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mobile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mobile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              모바일
            </button>
          </nav>
        </div>

        {/* 데스크톱 본문 편집 폼 */}
        {activeTab === 'desktop' && (
          <form onSubmit={handleContentSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="mcontent"
                className="block text-sm font-medium text-zinc-700 mb-2"
              >
                페이지 본문 (HTML)
              </label>
              <textarea
                id="mcontent"
                name="mcontent"
                value={content}
                onChange={handleChange}
                rows={20}
                className="w-full font-mono text-sm border border-zinc-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isPending}
                data-testid="mcontent-textarea"
              />
              <p className="text-xs text-zinc-500 mt-2">
                위젯 토큰 ({'{{widget:}}}'})을 사용하여 위젯을 삽입할 수 있습니다.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending || !isDirty}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                data-testid="save-button"
              >
                {isPending ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={handleRevert}
                disabled={isPending || !isDirty}
                className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded hover:bg-zinc-300 disabled:opacity-50"
                data-testid="revert-button"
              >
                되돌리기
              </button>
              {isDirty && (
                <span className="text-xs text-orange-600 self-center">
                  변경사항이 저장되지 않았습니다
                </span>
              )}
            </div>
          </form>
        )}

        {/* REQ-ADMIN2-028: 모바일 본문 편집 폼 */}
        {activeTab === 'mobile' && (
          <form onSubmit={handleMobileSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="mcontentMobile"
                className="block text-sm font-medium text-zinc-700 mb-2"
              >
                모바일 페이지 본문 (HTML)
              </label>
              <textarea
                id="mcontentMobile"
                name="mcontentMobile"
                value={mobileContent}
                onChange={handleChange}
                rows={20}
                className="w-full font-mono text-sm border border-zinc-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isPending}
                data-testid="mcontent-mobile-textarea"
              />
              <p className="text-xs text-zinc-500 mt-2">
                모바일 기기에서 표시할 전용 콘텐츠입니다. 비워두면 데스크톱 콘텐츠를 재사용합니다.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending || !isDirty}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                data-testid="save-mobile-button"
              >
                {isPending ? '저장 중...' : '모바일 저장'}
              </button>
              <button
                type="button"
                onClick={handleRevert}
                disabled={isPending || !isDirty}
                className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded hover:bg-zinc-300 disabled:opacity-50"
              >
                되돌리기
              </button>
              {isDirty && (
                <span className="text-xs text-orange-600 self-center">
                  변경사항이 저장되지 않았습니다
                </span>
              )}
            </div>
          </form>
        )}
      </section>

      {/* 삭제 섹션 (REQ-ADMIN2-029) */}
      <section className="bg-white rounded-lg border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-4">위험 영역</h2>
        <p className="text-sm text-zinc-600 mb-4">
          이 페이지를 삭제하면 되돌릴 수 없습니다.
        </p>
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            disabled={isPending}
          >
            페이지 삭제
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              disabled={isPending}
            >
              {isPending ? '삭제 중...' : '확인 (삭제)'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded hover:bg-zinc-300"
              disabled={isPending}
            >
              취소
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
