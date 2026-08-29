/**
 * PollForm — 글쓰기 폼 설문 첨부 컴포넌트 (SPEC-POLL-001)
 *
 * REQ-POLL-001: 글쓰기 폼에서 설문 추가 및 게시물 첨부
 */
'use client';

import Link from 'next/link'
import { useState } from 'react';
import { trpc } from '@/providers/TRPCProvider';
import { toast } from 'sonner';

interface PollFormProps {
  documentId?: number;
  onPollAttached?: (pollId: number) => void;
}

interface Poll {
  id: number;
  title: string;
  status: 'draft' | 'open' | 'closed';
  voteCount: number;
  startAt: Date;
  endAt: Date;
}

interface PollOption {
  id: number;
  label: string;
}

export function PollForm({ documentId, onPollAttached }: PollFormProps) {
  const [showPollSelector, setShowPollSelector] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<number | null>(null);

  // 관리자가 생성한 설문 목록 조회
  const { data: polls, isLoading } = trpc.admin.poll.list.useQuery(
    undefined,
    { enabled: showPollSelector },
  );

  // 게시물에 설문 첨부
  const attachMutation = trpc.content.poll.attachToDocument.useMutation({
    onSuccess: (_, variables) => {
      toast.success('설문이 첨부되었습니다.');
      setShowPollSelector(false);
      setSelectedPollId(null);
      onPollAttached?.(variables.pollId);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAttachPoll = () => {
    if (!selectedPollId || !documentId) {
      toast.error('설문을 선택해주세요.');
      return;
    }
    attachMutation.mutate({
      documentId,
      pollId: selectedPollId,
    });
  };

  if (!showPollSelector) {
    return (
      <button
        type="button"
        onClick={() => setShowPollSelector(true)}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
      >
        + 설문 추가
      </button>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold">설문 선택</h4>
        <button
          type="button"
          onClick={() => setShowPollSelector(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          × 닫기
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">로딩 중...</div>
      ) : (
        <div className="space-y-3">
          {polls?.map((poll) => (
            <label
              key={poll.id}
              className={`flex items-center p-3 border rounded cursor-pointer hover:bg-white ${
                selectedPollId === poll.id ? 'bg-blue-50 border-blue-500' : 'bg-white'
              }`}
            >
              <input
                type="radio"
                name="poll-selector"
                value={poll.id}
                checked={selectedPollId === poll.id}
                onChange={() => setSelectedPollId(poll.id)}
                className="mr-3"
              />
              <div className="flex-1">
                <div className="font-medium">{poll.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(poll.startAt).toLocaleDateString()} ~ {new Date(poll.endAt).toLocaleDateString()}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {poll.status === 'open' && '진행중'}
                {poll.status === 'draft' && '예정'}
                {poll.status === 'closed' && '종료'}
                {' | '}투표 {poll.voteCount}표
              </div>
            </label>
          ))}

          {polls && polls.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              사용 가능한 설문이 없습니다.
              <br />
              <Link href="/admin/polls" className="text-blue-600 hover:underline">
                관리자 페이지에서 설문을 생성해주세요.
              </Link>
            </div>
          )}

          {selectedPollId && (
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleAttachPoll}
                disabled={attachMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {attachMutation.isPending ? '첨부 중...' : '설문 첨부'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedPollId(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
