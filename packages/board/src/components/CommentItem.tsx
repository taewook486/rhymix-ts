'use client';

/**
 * CommentItem.tsx — SPEC-CONTENT-001 Comment UI
 *
 * 단일 댓글을 렌더하는 클라이언트 컴포넌트.
 * - 비밀 댓글: 작성자/admin 아닐 시 플레이스홀더 표시
 * - depth 기반 들여쓰기 (max 5)
 * - 자식 댓글 재귀 렌더
 *
 * @MX:SPEC: SPEC-CONTENT-001
 */
import React from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CommentItemProps {
  comment: {
    id: number;
    /** 서버에서 이미 sanitize된 HTML */
    content: string;
    nickName: string | null;
    authorId: number | null;
    isSecret: boolean;
    createdAt: Date | string;
    parentId: number | null;
    children?: CommentItemProps['comment'][];
  };
  currentUserId?: number | null;
  isAdmin?: boolean;
  onReply?: (parentId: number) => void;
  onDelete?: (commentId: number) => void;
  /** 들여쓰기 depth (최대 시각적 depth = 5) */
  depth?: number;
}

// ---------------------------------------------------------------------------
// 날짜 포맷 헬퍼
// ---------------------------------------------------------------------------

function formatDate(createdAt: Date | string): string {
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// CommentItem
// ---------------------------------------------------------------------------

/**
 * 단일 댓글 렌더 컴포넌트.
 *
 * @MX:ANCHOR [AUTO]: CommentList, view-page, apps/web 에서 호출되는 댓글 렌더 단위.
 * @MX:REASON: fan_in >= 3 — CommentList, BoardViewPage 통합, 재귀 자식 렌더.
 * @MX:SPEC: SPEC-CONTENT-001
 */
export function CommentItem({
  comment,
  currentUserId,
  isAdmin = false,
  onReply,
  onDelete,
  depth = 0,
}: CommentItemProps): React.ReactElement {
  const effectiveDepth = Math.min(depth, 5);
  const paddingLeft = effectiveDepth * 24;

  // 비밀 댓글 접근 판단
  const canViewSecret =
    isAdmin ||
    (currentUserId !== undefined &&
      currentUserId !== null &&
      comment.authorId !== null &&
      currentUserId === comment.authorId);

  // 삭제 버튼 표시 판단
  const canDelete =
    isAdmin ||
    (currentUserId !== undefined &&
      currentUserId !== null &&
      comment.authorId !== null &&
      currentUserId === comment.authorId);

  // 답글 버튼 표시 판단 (depth < 5)
  const canReply = depth < 5;

  const displayNick = comment.nickName ?? '익명';
  const dateStr = formatDate(comment.createdAt);

  return (
    <div style={{ paddingLeft: `${paddingLeft}px` }} className="comment-item py-2 border-b border-gray-100">
      {/* 메타 정보 */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
        <span className="font-medium">{displayNick}</span>
        <span className="text-gray-400">{dateStr}</span>
      </div>

      {/* 본문 */}
      {comment.isSecret && !canViewSecret ? (
        <p className="text-gray-400 italic text-sm">비밀 댓글입니다.</p>
      ) : (
        /* eslint-disable-next-line react/no-danger */
        <div
          className="comment-content text-sm"
          dangerouslySetInnerHTML={{ __html: comment.content }}
        />
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2 mt-1">
        {canReply && onReply && (
          <button
            type="button"
            data-testid="reply-btn"
            className="text-xs text-blue-500 hover:underline"
            onClick={() => onReply(comment.id)}
          >
            답글
          </button>
        )}
        {canDelete && onDelete && (
          <button
            type="button"
            data-testid="delete-btn"
            className="text-xs text-red-500 hover:underline"
            onClick={() => onDelete(comment.id)}
          >
            삭제
          </button>
        )}
      </div>

      {/* 자식 댓글 재귀 렌더 */}
      {Array.isArray(comment.children) && comment.children.length > 0 && (
        <div className="children mt-2">
          {comment.children.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onReply={onReply}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
