/**
 * 대시보드 위젯 컴포넌트들 — SPEC-ADMIN-002 Slice 1A.
 *
 * REQ-ADMIN2-007: 각 위젯은 개별적으로 장애 격리 (graceful degradation)
 * REQ-ADMIN2-010: 인덱스 기반 쿼리 사용 (tRPC 라우터에서 처리)
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-001, REQ-ADMIN2-002, REQ-ADMIN2-003, REQ-ADMIN2-007
 */
'use client';

import Link from 'next/link';

interface VisitStatsWidgetProps {
  stats?: {
    daily: Array<{ date: string; uniqueVisitors: number; pageViews: number }>;
    monthly: Record<string, { uniqueVisitors: number; pageViews: number }>;
  };
  error?: boolean;
}

/**
 * 방문자 통계 위젯
 * - REQ-ADMIN2-001: 일별/월별 방문자 수 차트
 * - REQ-ADMIN2-007: 장애 시 에러 상태 렌더링
 */
export function VisitStatsWidget({ stats, error }: VisitStatsWidgetProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">방문자 통계</h3>
        <p className="text-sm text-red-600">
          ⚠️ 통계 데이터를 불러오지 못했습니다.
        </p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">방문자 통계</h3>
        <p className="text-sm text-zinc-500">로딩 중...</p>
      </div>
    );
  }

  const latestDaily = stats.daily[0];
  const totalVisitors = stats.daily.reduce((sum, day) => sum + day.uniqueVisitors, 0);
  const totalPageViews = stats.daily.reduce((sum, day) => sum + day.pageViews, 0);

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6">
      <h3 className="text-sm font-semibold text-zinc-700 mb-4">방문자 통계</h3>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-zinc-500">오늘 방문자</p>
          <p className="text-2xl font-bold text-zinc-900">
            {latestDaily?.uniqueVisitors || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">총 방문자 (30일)</p>
          <p className="text-lg font-semibold text-zinc-800">{totalVisitors}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">총 페이지뷰 (30일)</p>
          <p className="text-lg font-semibold text-zinc-800">{totalPageViews}</p>
        </div>
      </div>
      <Link
        href="/admin/stats"
        className="mt-4 inline-block text-xs text-blue-600 hover:text-blue-700"
      >
        통계 자세히 보기 →
      </Link>
    </div>
  );
}

interface RecentDocument {
  id: number;
  title: string;
  author: string;
  boardName: string;
  boardMid: string;
  regdate: Date;
}

interface RecentDocumentsWidgetProps {
  documents?: RecentDocument[];
  error?: boolean;
}

/**
 * 최근 문서 위젯
 * - REQ-ADMIN2-002: 최근 문서 10개 (제목, 작성자, 게시판, 시간)
 * - REQ-ADMIN2-010: 인덱스 기반 ORDER BY ... LIMIT 쿼리
 * - REQ-ADMIN2-007: 장애 시 에러 상태 렌더링
 */
export function RecentDocumentsWidget({ documents, error }: RecentDocumentsWidgetProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">최근 문서</h3>
        <p className="text-sm text-red-600">
          ⚠️ 문서 목록을 불러오지 못했습니다.
        </p>
      </div>
    );
  }

  if (!documents) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">최근 문서</h3>
        <p className="text-sm text-zinc-500">로딩 중...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">최근 문서</h3>
        <p className="text-sm text-zinc-500">등록된 문서가 없습니다.</p>
      </div>
    );
  }

  // 상대 시간 계산
  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return '방금 전';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
    return `${Math.floor(seconds / 86400)}일 전`;
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6">
      <h3 className="text-sm font-semibold text-zinc-700 mb-4">최근 문서</h3>
      <ul className="space-y-3">
        {documents.map((doc) => (
          <li key={doc.id} className="border-b border-zinc-100 pb-2 last:border-0">
            <Link
              href={`/${doc.boardMid}/${doc.id}`}
              className="block text-sm font-medium text-zinc-900 hover:text-blue-600 line-clamp-1"
            >
              {doc.title}
            </Link>
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
              <span>{doc.author}</span>
              <span>·</span>
              <span>{doc.boardName}</span>
              <span>·</span>
              <span>{getRelativeTime(doc.regdate)}</span>
            </div>
          </li>
        ))}
      </ul>
      <Link
        href="/admin/documents"
        className="mt-4 inline-block text-xs text-blue-600 hover:text-blue-700"
      >
        문서 관리 →
      </Link>
    </div>
  );
}

interface RecentComment {
  id: number;
  content: string;
  author: string;
  documentId: number;
  documentTitle: string;
  boardMid: string;
  regdate: Date;
}

interface RecentCommentsWidgetProps {
  comments?: RecentComment[];
  error?: boolean;
}

/**
 * 최근 댓글 위젯
 * - REQ-ADMIN2-003: 최근 댓글 10개 (내용, 작성자, 문서 제목, 시간)
 * - REQ-ADMIN2-010: 인덱스 기반 ORDER BY ... LIMIT 쿼리
 * - REQ-ADMIN2-007: 장애 시 에러 상태 렌더링
 */
export function RecentCommentsWidget({ comments, error }: RecentCommentsWidgetProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">최근 댓글</h3>
        <p className="text-sm text-red-600">
          ⚠️ 댓글 목록을 불러오지 못했습니다.
        </p>
      </div>
    );
  }

  if (!comments) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">최근 댓글</h3>
        <p className="text-sm text-zinc-500">로딩 중...</p>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">최근 댓글</h3>
        <p className="text-sm text-zinc-500">등록된 댓글이 없습니다.</p>
      </div>
    );
  }

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return '방금 전';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
    return `${Math.floor(seconds / 86400)}일 전`;
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6">
      <h3 className="text-sm font-semibold text-zinc-700 mb-4">최근 댓글</h3>
      <ul className="space-y-3">
        {comments.map((comment) => (
          <li key={comment.id} className="border-b border-zinc-100 pb-2 last:border-0">
            <p className="text-sm text-zinc-700 line-clamp-2">{comment.content}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
              <span>{comment.author}</span>
              <span>·</span>
              <Link
                href={`/${comment.boardMid}/${comment.documentId}`}
                className="hover:text-blue-600"
              >
                {comment.documentTitle}
              </Link>
              <span>·</span>
              <span>{getRelativeTime(comment.regdate)}</span>
            </div>
          </li>
        ))}
      </ul>
      <Link
        href="/admin/comments"
        className="mt-4 inline-block text-xs text-blue-600 hover:text-blue-700"
      >
        댓글 관리 →
      </Link>
    </div>
  );
}
