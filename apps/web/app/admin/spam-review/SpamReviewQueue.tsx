'use client';

/**
 * 스팸 검토 큐 Component — SPEC-SPAM-001 REQ-SPAM-005
 *
 * @MX:SPEC: SPEC-SPAM-001 REQ-SPAM-005
 */

import { useState } from 'react';
import { trpc } from '@/providers/TRPCProvider';

interface ReviewQueueItem {
  id: number;
  type: 'document' | 'comment';
  contentId: number;
  reason: string;
  status: 'pending' | 'approved' | 'deleted' | 'banned';
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewerId: number | null;
}

interface SpamReviewQueueProps {
  initialData: {
    items: ReviewQueueItem[];
    total: number;
    hasMore: boolean;
  };
}

export function SpamReviewQueue({ initialData }: SpamReviewQueueProps) {
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'deleted' | 'banned' | undefined>(undefined);
  const [filterType, setFilterType] = useState<'document' | 'comment' | undefined>(undefined);

  // Query for fetching review queue
  const query = trpc.admin.spamfilter.reviewQueue.list.useQuery({
    limit: 20,
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterType ? { type: filterType } : {}),
  });
  const data = query.data ?? initialData;
  const refetch = query.refetch;

  // Mutation for reviewing queue items
  const reviewMutation = trpc.admin.spamfilter.reviewQueue.review.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleReview = async (id: number, action: 'approve' | 'delete' | 'ban') => {
    const actionText = {
      approve: '승인',
      delete: '삭제',
      ban: '차단',
    }[action];

    if (!confirm(`이 콘텐츠를 ${actionText} 처리하시겠습니까?`)) return;

    try {
      await reviewMutation.mutateAsync({ id, action });
    } catch (error) {
      console.error('Failed to review queue item:', error);
      alert('검토 처리에 실패했습니다.');
    }
  };

  const getReasonText = (reason: string) => {
    const reasonMap: Record<string, string> = {
      forbidden_word: '금지어 포함',
      blacklist_url: '차단 도메인 URL',
      report_threshold: '신고 임계치 초과',
      akismet: 'Akismet 스팸 판정',
      duplicate_content: '중복 콘텐츠',
    };
    return reasonMap[reason] || reason;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      pending: { text: '대기', className: 'bg-yellow-100 text-yellow-800' },
      approved: { text: '승인', className: 'bg-green-100 text-green-800' },
      deleted: { text: '삭제', className: 'bg-red-100 text-red-800' },
      banned: { text: '차단', className: 'bg-purple-100 text-purple-800' },
    };
    const badge = statusMap[status] || { text: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badge.className}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <div>
          <label htmlFor="statusFilter" className="block text-sm font-medium mb-1">
            상태
          </label>
          <select
            id="statusFilter"
            value={filterStatus || ''}
            onChange={(e) => setFilterStatus(e.target.value as any || undefined)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">전체</option>
            <option value="pending">대기</option>
            <option value="approved">승인</option>
            <option value="deleted">삭제</option>
            <option value="banned">차단</option>
          </select>
        </div>

        <div>
          <label htmlFor="typeFilter" className="block text-sm font-medium mb-1">
            유형
          </label>
          <select
            id="typeFilter"
            value={filterType || ''}
            onChange={(e) => setFilterType(e.target.value as any || undefined)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">전체</option>
            <option value="document">문서</option>
            <option value="comment">댓글</option>
          </select>
        </div>
      </div>

      {/* Queue List */}
      <div className="border rounded-md">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">유형</th>
              <th className="px-4 py-2 text-left">콘텐츠 ID</th>
              <th className="px-4 py-2 text-left">사유</th>
              <th className="px-4 py-2 text-left">상태</th>
              <th className="px-4 py-2 text-left">생성일</th>
              <th className="px-4 py-2 text-left">작업</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2">{item.id}</td>
                <td className="px-4 py-2">
                  {item.type === 'document' ? '문서' : '댓글'}
                </td>
                <td className="px-4 py-2">{item.contentId}</td>
                <td className="px-4 py-2">
                  {getReasonText(item.reason)}
                  {item.metadata && (
                    <div className="text-xs text-gray-500 mt-1">
                      {(item.metadata as any).matchedWord && `매칭: ${(item.metadata as any).matchedWord}`}
                      {(item.metadata as any).matchedDomain && `도메인: ${(item.metadata as any).matchedDomain}`}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">{getStatusBadge(item.status)}</td>
                <td className="px-4 py-2 text-sm">
                  {new Date(item.createdAt).toLocaleString('ko-KR')}
                </td>
                <td className="px-4 py-2">
                  {item.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(item.id, 'approve')}
                        disabled={reviewMutation.isPending}
                        className="px-2 py-1 text-green-600 hover:text-green-800 text-sm"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => handleReview(item.id, 'delete')}
                        disabled={reviewMutation.isPending}
                        className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                      >
                        삭제
                      </button>
                      <button
                        onClick={() => handleReview(item.id, 'ban')}
                        disabled={reviewMutation.isPending}
                        className="px-2 py-1 text-purple-600 hover:text-purple-800 text-sm"
                      >
                        차단
                      </button>
                    </div>
                  )}
                  {item.status !== 'pending' && (
                    <span className="text-sm text-gray-500">
                      {item.reviewedAt
                        ? new Date(item.reviewedAt).toLocaleString('ko-KR')
                        : '-'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  검토 대기 항목이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {data.hasMore && (
          <div className="p-4 text-center">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              더 불러오기
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-md">
        <p className="text-sm">
          총 <strong>{data.total}</strong>개 항목 (
          대기: {data.items.filter((i) => i.status === 'pending').length},
          승인: {data.items.filter((i) => i.status === 'approved').length},
          삭제: {data.items.filter((i) => i.status === 'deleted').length},
          차단: {data.items.filter((i) => i.status === 'banned').length})
        </p>
      </div>
    </div>
  );
}
