'use client';

/**
 * LayoutPreviewDialog.tsx — SPEC-ADMIN-002 REQ-ADMIN2-023.
 *
 * 레이아웃 미리보기 다이얼로그 컴포넌트.
 * layout.preview 쿼리를 호출하여 샘플 콘텐츠로 레이아웃을 렌더링한다.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-023
 */
import React, { useState, useTransition } from 'react';
import { trpc } from '@/providers/TRPCProvider';

interface LayoutPreviewDialogProps {
  layoutId: string;
  layoutName: string;
}

export function LayoutPreviewDialog({
  layoutId,
  layoutName,
}: LayoutPreviewDialogProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [previewData, setPreviewData] = useState<{ layout: unknown; sampleContent: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  function handleOpen(): void {
    setIsOpen(true);
    setError(null);
    setPreviewData(null);

    startTransition(async () => {
      try {
        const data = await utils.admin.layout.preview.fetch({ layoutId });
        setPreviewData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '미리보기 로드 중 오류가 발생했습니다.');
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="text-sm text-blue-600 hover:text-blue-700"
        disabled={isPending}
      >
        미리보기
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            "{layoutName}" 레이아웃 미리보기
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-zinc-500 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>

        {isPending && !previewData && (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-500">로드 중...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {previewData && (
          <div className="space-y-4">
            <div className="bg-zinc-50 border border-zinc-200 rounded p-4">
              <h3 className="text-sm font-medium text-zinc-700 mb-2">레이아웃 정보</h3>
              <pre className="text-xs text-zinc-600 overflow-auto">
                {JSON.stringify(previewData.layout, null, 2)}
              </pre>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded p-4">
              <h3 className="text-sm font-medium text-zinc-700 mb-2">샘플 콘텐츠</h3>
              <div className="prose prose-sm max-w-none">
                {(() => {
                  const sampleContent = previewData.sampleContent;
                  const isObject = sampleContent !== null && typeof sampleContent === 'object';
                  if (!isObject) {
                    return null;
                  }
                  const record = sampleContent as Record<string, unknown>;
                  return (
                    <div>
                      {'title' in record && (
                        <h1 className="text-xl font-bold mb-2">
                          {String(record.title)}
                        </h1>
                      )}
                      {'content' in record && (
                        <div dangerouslySetInnerHTML={{ __html: String(record.content) }} />
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded hover:bg-zinc-300"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
