/**
 * PollDisplay — 설문 표시 컴포넌트 (SPEC-POLL-001)
 *
 * 설문 질문과 선택지를 표시하고, 투표 후 실시간 결과 바 차트를 보여준다.
 * REQ-POLL-003: 투표 결과 시각화 (바 차트)
 */
'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/providers/TRPCProvider';
import { toast } from 'sonner';

interface PollDisplayProps {
  pollId: number;
  memberId?: number | null;
  voterIp?: string | null;
}

interface PollOption {
  id: number;
  label: string;
}

interface Poll {
  id: number;
  title: string;
  description?: string;
  allowMultipleChoice: boolean;
  allowGuestVote: boolean;
  startAt: Date;
  endAt: Date;
  options: PollOption[];
}

interface PollResults {
  totalVotes: number;
  options: Array<{
    id: number;
    label: string;
    voteCount: number;
    percentage: number;
  }>;
}

export function PollDisplay({ pollId, memberId, voterIp }: PollDisplayProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);

  // 설문 조회
  const { data: poll, isLoading: pollLoading } = trpc.public.poll.get.useQuery(
    { id: pollId },
  );

  // 투표 가능 여부 확인 (중복 투표 체크 포함)
  const { data: canVoteData } = trpc.public.poll.canVote.useQuery({
    pollId,
    memberId: memberId ?? null,
    voterIp: voterIp ?? null,
  });

  // 이미 투표했는지 확인
  useEffect(() => {
    if (canVoteData?.reason === 'already_voted') {
      setHasVoted(true);
    }
  }, [canVoteData]);

  // 투표 결과 조회
  const { data: results, refetch: refetchResults } = trpc.public.poll.results.useQuery(
    { id: pollId },
    { enabled: hasVoted || !canVoteData?.canVote },
  );

  // 투표 제출
  const voteMutation = trpc.content.poll.vote.useMutation({
    onSuccess: () => {
      setHasVoted(true);
      toast.success('투표가 완료되었습니다.');
      refetchResults();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleVote = () => {
    if (selectedOptions.length === 0) {
      toast.error('선택지를 선택해주세요.');
      return;
    }
    voteMutation.mutate({
      pollId,
      pollOptionIds: selectedOptions,
    });
  };

  const handleOptionClick = (optionId: number) => {
    if (!poll) return;

    if (poll.allowMultipleChoice) {
      setSelectedOptions((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  if (pollLoading) {
    return <div className="p-4 border rounded-lg animate-pulse">로딩 중...</div>;
  }

  if (!poll) {
    return <div className="p-4 border rounded-lg text-red-500">설문을 찾을 수 없습니다.</div>;
  }

  const canUserVote = canVoteData?.canVote;
  const voteReason = canVoteData?.reason;
  const pollData = poll;
  const resultsData = results;

  const now = new Date();
  const isExpired = pollData.endAt && new Date(pollData.endAt) < now;
  const isNotStarted = pollData.startAt && new Date(pollData.startAt) > now;

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-lg font-semibold mb-2">{pollData.title}</h3>
      {pollData.description && <p className="text-sm text-gray-600 mb-4">{pollData.description}</p>}

      {/* 투표 폼 */}
      {!hasVoted && canUserVote && !isExpired && !isNotStarted && (
        <div className="space-y-2">
          {pollData.options.map((option) => (
            <label
              key={option.id}
              className={`flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                pollData.allowMultipleChoice ? 'checkbox' : 'radio'
              }`}
            >
              <input
                type={pollData.allowMultipleChoice ? 'checkbox' : 'radio'}
                name={`poll-${pollId}`}
                value={option.id}
                checked={selectedOptions.includes(option.id)}
                onChange={() => handleOptionClick(option.id)}
                className="mr-3"
              />
              <span>{option.label}</span>
            </label>
          ))}
          <button
            onClick={handleVote}
            disabled={voteMutation.isPending || selectedOptions.length === 0}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {voteMutation.isPending ? '투표 중...' : '투표'}
          </button>
        </div>
      )}

      {/* 투표 결과 또는 비활성 상태 */}
      {(hasVoted || !canUserVote || isExpired || isNotStarted) && resultsData && (
        <div className="space-y-3">
          {isExpired && <p className="text-sm text-gray-500 mb-2">투표가 마감되었습니다.</p>}
          {isNotStarted && <p className="text-sm text-gray-500 mb-2">투표가 아직 시작되지 않았습니다.</p>}
          {!canUserVote && voteReason === 'already_voted' && (
            <p className="text-sm text-gray-500 mb-2">이미 투표하셨습니다.</p>
          )}
          {!canUserVote && voteReason === 'not_allowed' && (
            <p className="text-sm text-gray-500 mb-2">투표 권한이 없습니다.</p>
          )}

          <p className="text-sm font-medium">총 투표수: {resultsData.totalVotes}표</p>

          {resultsData.options.map((option) => (
            <div key={option.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{option.label}</span>
                <span>
                  {option.voteCount}표 ({option.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${option.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
