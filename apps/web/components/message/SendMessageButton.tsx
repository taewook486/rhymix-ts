/**
 * 쪽지 보내기 버튼 + 작성 모달 — SPEC-MESSAGE-001 REQ-MSG-001.
 *
 * 다른 회원 닉네임 옆에 배치하는 Client Component.
 * 로그인하지 않았거나 receiverId 가 본인이면 아무것도 렌더링하지 않는다.
 *
 * @MX:SPEC: SPEC-MESSAGE-001 REQ-MSG-001
 */
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/providers/TRPCProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@rhymix-ts/ui/components';

// packages/message/src/errors.ts 의 Error.message 를 사용자 안내 문구로 매핑한다.
const ERROR_MESSAGE_MAP: Record<string, string> = {
  'Cannot send message: receiver has blocked messages': '해당 회원에게 쪽지를 보낼 수 없습니다.',
  'Cannot send message to yourself': '자기 자신에게는 쪽지를 보낼 수 없습니다.',
  'Message system is disabled by admin': '현재 쪽지 시스템이 비활성화되어 있습니다.',
};

function translateError(message: string): string {
  if (ERROR_MESSAGE_MAP[message]) return ERROR_MESSAGE_MAP[message];
  if (message.startsWith('Receiver not found')) return '수신자를 찾을 수 없습니다.';
  return '쪽지 발송에 실패했습니다.';
}

export interface SendMessageButtonProps {
  receiverId: number;
  receiverNickname: string;
  currentUserId?: number | null;
}

export function SendMessageButton({
  receiverId,
  receiverNickname,
  currentUserId,
}: SendMessageButtonProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const sendMutation = trpc.content.message.send.useMutation({
    onSuccess: () => {
      toast.success('쪽지를 보냈습니다.');
      setOpen(false);
      setSubject('');
      setContent('');
    },
    onError: (error) => {
      toast.error(translateError(error.message));
    },
  });

  // 비로그인이거나 자기 자신에게는 버튼을 표시하지 않는다 (REQ-MSG-001).
  if (currentUserId == null || currentUserId === receiverId) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) return;
    sendMutation.mutate({ receiverId, subject: subject.trim(), content: content.trim() });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-0.5 rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
      >
        쪽지 보내기
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{receiverNickname}님에게 쪽지 보내기</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="send-message-subject" className="block text-sm font-medium mb-1">
                제목
              </label>
              <input
                id="send-message-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                required
                className="w-full border border-zinc-300 rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="send-message-content" className="block text-sm font-medium mb-1">
                내용
              </label>
              <textarea
                id="send-message-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={2000}
                required
                rows={5}
                className="w-full border border-zinc-300 rounded px-3 py-2 text-sm"
              />
              <p className="text-xs text-zinc-500 mt-1 text-right">{content.length} / 2000</p>
            </div>

            <DialogFooter>
              <button
                type="submit"
                disabled={sendMutation.isPending}
                className="px-4 py-2 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
              >
                {sendMutation.isPending ? '보내는 중...' : '보내기'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
