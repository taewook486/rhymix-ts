/**
 * 대시보드 위젯 설정 컴포넌트 — SPEC-ADMIN-002 Slice 3E (REQ-ADMIN2-008).
 *
 * 위젯 표시 여부를 토글하는 설정 UI.
 */
'use client';

import { useState } from 'react';
import { getServerCaller } from '@/lib/trpc/server';

interface WidgetPrefs {
  visitStats: boolean;
  recentDocuments: boolean;
  recentComments: boolean;
  updateNotification: boolean;
  summaryCounterStrip: boolean;
}

export function WidgetSettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [prefs, setPrefs] = useState<WidgetPrefs>({
    visitStats: true,
    recentDocuments: true,
    recentComments: true,
    updateNotification: true,
    summaryCounterStrip: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggle = async (key: keyof WidgetPrefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    setIsSaving(true);
    setMessage(null);

    try {
      const caller = await getServerCaller();
      await caller.admin.dashboard.updateWidgetPrefs({ [key]: newPrefs[key] });
      setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '설정 저장 중 오류가 발생했습니다.' });
      // Revert on error
      setPrefs(prefs);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="위젯 설정"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed bottom-16 right-4 bg-white rounded-lg shadow-xl p-6 w-80 z-50">
            <h3 className="text-lg font-semibold mb-4">위젯 표시 설정</h3>

            {message && (
              <div className={`mb-4 p-2 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {message.text}
              </div>
            )}

            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">요약 카운터</span>
                <input
                  type="checkbox"
                  checked={prefs.summaryCounterStrip}
                  onChange={() => handleToggle('summaryCounterStrip')}
                  disabled={isSaving}
                  className="rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">업데이트 알림</span>
                <input
                  type="checkbox"
                  checked={prefs.updateNotification}
                  onChange={() => handleToggle('updateNotification')}
                  disabled={isSaving}
                  className="rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">방문자 통계</span>
                <input
                  type="checkbox"
                  checked={prefs.visitStats}
                  onChange={() => handleToggle('visitStats')}
                  disabled={isSaving}
                  className="rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">최근 문서</span>
                <input
                  type="checkbox"
                  checked={prefs.recentDocuments}
                  onChange={() => handleToggle('recentDocuments')}
                  disabled={isSaving}
                  className="rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">최근 댓글</span>
                <input
                  type="checkbox"
                  checked={prefs.recentComments}
                  onChange={() => handleToggle('recentComments')}
                  disabled={isSaving}
                  className="rounded"
                />
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
