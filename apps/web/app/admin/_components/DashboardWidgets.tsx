/**
 * 대시보드 위젯 컴포넌트들 — SPEC-ADMIN-002 Slice 1A + Slice 2F.
 *
 * REQ-ADMIN2-007: 각 위젯은 개별적으로 장애 격리 (graceful degradation)
 * REQ-ADMIN2-010: 인덱스 기반 쿼리 사용 (tRPC 라우터에서 처리)
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-001, REQ-ADMIN2-002, REQ-ADMIN2-003, REQ-ADMIN2-004, REQ-ADMIN2-005, REQ-ADMIN2-006, REQ-ADMIN2-007
 */
'use client';

import Link from 'next/link';
import { Checkbox } from '@rhymix-ts/ui/components';

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

interface UpdateNotificationWidgetProps {
  hasUpdate?: boolean;
  currentVersion?: string;
  latestVersion?: string;
  error?: boolean;
}

/**
 * 업데이트 알림 위젯
 * - REQ-ADMIN2-004: Dashboard update notification widget
 * - REQ-ADMIN2-005: "최신 버전" status when no update available
 * - REQ-ADMIN2-007: 장애 시 에러 상태 렌더링
 */
export function UpdateNotificationWidget({
  hasUpdate = false,
  currentVersion = '0.0.0',
  latestVersion,
  error,
}: UpdateNotificationWidgetProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">업데이트 알림</h3>
        <p className="text-sm text-red-600">
          ⚠️ 업데이트 정보를 불러오지 못했습니다.
        </p>
      </div>
    );
  }

  // REQ-ADMIN2-005: If no manifest source configured, show stub "최신 버전" status
  if (!latestVersion) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">업데이트 알림</h3>
        <div className="space-y-2">
          <p className="text-sm text-zinc-600">현재 버전: {currentVersion}</p>
          <p className="text-sm text-green-600 font-medium">✓ 최신 버전</p>
          <p className="text-xs text-zinc-500 mt-2">
            업데이트 매니페스트 소스가 설정되지 않았습니다.
          </p>
        </div>
      </div>
    );
  }

  if (hasUpdate) {
    return (
      <div className="bg-white rounded-lg border border-blue-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">업데이트 알림</h3>
        <div className="space-y-2">
          <p className="text-sm text-zinc-600">현재 버전: {currentVersion}</p>
          <p className="text-sm text-blue-600 font-medium">
            새 버전 사용 가능: {latestVersion}
          </p>
          <Link
            href="/admin/settings/advanced"
            className="inline-block text-xs text-blue-600 hover:text-blue-700"
          >
            업데이트 설정 →
          </Link>
        </div>
      </div>
    );
  }

  // REQ-ADMIN2-005: "최신 버전" status without making admin believe action is required
  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6">
      <h3 className="text-sm font-semibold text-zinc-700 mb-4">업데이트 알림</h3>
      <div className="space-y-2">
        <p className="text-sm text-zinc-600">현재 버전: {currentVersion}</p>
        <p className="text-sm text-green-600 font-medium">✓ 최신 버전</p>
      </div>
    </div>
  );
}

interface SummaryCounts {
  members: number;
  documents: number;
  comments: number;
  files: number;
}

interface SummaryCounterStripProps {
  counts?: SummaryCounts;
  error?: boolean;
}

/**
 * 요약 카운터 스트립 위젯
 * - REQ-ADMIN2-006: Summary counter strip showing total member/document/comment/file counts
 * - REQ-ADMIN2-007: 장애 시 에러 상태 렌더링
 */
export function SummaryCounterStrip({
  counts,
  error,
}: SummaryCounterStripProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6 col-span-full">
        <p className="text-sm text-red-600">
          ⚠️ 요약 데이터를 불러오지 못했습니다.
        </p>
      </div>
    );
  }

  if (!counts) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6 col-span-full">
        <p className="text-sm text-zinc-500">요약 데이터 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6 col-span-full">
      <h3 className="text-sm font-semibold text-zinc-700 mb-4">사이트 현황</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-zinc-500">총 회원 수</p>
          <p className="text-2xl font-bold text-zinc-900">
            {counts.members.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">총 문서 수</p>
          <p className="text-2xl font-bold text-zinc-900">
            {counts.documents.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">총 댓글 수</p>
          <p className="text-2xl font-bold text-zinc-900">
            {counts.comments.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">총 파일 수</p>
          <p className="text-2xl font-bold text-zinc-900">
            {counts.files.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
