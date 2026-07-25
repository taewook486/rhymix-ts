/**
 * 게시물 신고 버튼 + 사유 입력 모달 — SPEC-SPAM-001 REQ-SPAM-003.
 *
 * 게시물 상세 페이지 액션바에 배치하는 Client Component.
 * 로그인하지 않았거나 본인 글이면 아무것도 렌더링하지 않는다.
 *
 * @MX:SPEC: SPEC-SPAM-001 REQ-SPAM-003
 */
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/providers/TRPCProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@rhymix-ts/ui/components';

function translateError(message: string): string {
  if (message.includes('already reported') || message.includes('DuplicateReport')) {
    return '이미 신고한 게시물입니다.';
  }
  return '신고 접수에 실패했습니다.';
}

export interface ReportButtonProps {
  documentId: number;
  authorId?: number | null;
  currentUserId?: number | null;
}

export function ReportButton({ documentId, authorId, currentUserId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const reportMutation = trpc.content.report.create.useMutation({
    onSuccess: () => {
      toast.success('신고가 접수되었습니다.');
      setOpen(false);
      setReason('');
    },
    onError: (error) => {
      toast.error(translateError(error.message));
    },
  });

  // 비로그인이거나 본인 글에는 신고 버튼을 표시하지 않는다.
  if (currentUserId == null || (authorId != null && currentUserId === authorId)) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    reportMutation.mutate({ documentId, reason: reason.trim() });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 hover:underline"
      >
        신고
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>게시물 신고</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="report-reason" className="block text-sm font-medium mb-1">
                신고 사유
              </label>
              <textarea
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                required
                rows={4}
                className="w-full border border-zinc-300 rounded px-3 py-2 text-sm"
              />
              <p className="text-xs text-zinc-500 mt-1 text-right">{reason.length} / 500</p>
            </div>

            <DialogFooter>
              <button
                type="submit"
                disabled={reportMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {reportMutation.isPending ? '접수 중...' : '신고하기'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
