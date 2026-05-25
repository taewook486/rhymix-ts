'use client';

/**
 * CommentList.tsx — SPEC-CONTENT-001 Comment UI
 *
 * CommentItem + CommentForm 을 조합하는 클라이언트 컴포넌트.
 * - 최상위 댓글 목록 렌더 (자식은 CommentItem 내부에서 재귀)
 * - replyToId 상태로 답글 폼 토글
 * - 하단에 최상위 댓글 작성 폼 상시 표시
 *
 * @MX:SPEC: SPEC-CONTENT-001
 */
import React, { useState } from 'react';
import { CommentItem } from './CommentItem.js';
import type { CommentItemProps } from './CommentItem.js';
import { CommentForm } from './CommentForm.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type CommentData = CommentItemProps['comment'];

export interface CommentListProps {
  documentId: number;
  initialComments: CommentData[];
  onSubmit: (content: string, parentId: number | null) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  currentUserId?: number | null;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
}

// ---------------------------------------------------------------------------
// CommentList
// ---------------------------------------------------------------------------

/**
 * 댓글 목록 + 작성 폼 오케스트레이터.
 *
 * @MX:ANCHOR [AUTO]: apps/web page.tsx 에서 직접 마운트되는 댓글 UI 진입점.
 * @MX:REASON: fan_in >= 3 — BoardViewPage 통합, apps/web route, 테스트.
 * @MX:SPEC: SPEC-CONTENT-001
 */
export function CommentList({
  documentId,
  initialComments,
  onSubmit,
  onDelete,
  currentUserId,
  isAdmin = false,
  isLoggedIn = false,
}: CommentListProps): React.ReactElement {
  const [replyToId, setReplyToId] = useState<number | null>(null);

  // 최상위 댓글만 렌더 (parentId === null)
  const topLevelComments = initialComments.filter((c) => c.parentId === null);

  function handleReply(parentId: number) {
    setReplyToId(parentId);
  }

  function handleCancelReply() {
    setReplyToId(null);
  }

  async function handleSubmitReply(content: string) {
    await onSubmit(content, replyToId);
    setReplyToId(null);
  }

  async function handleSubmitNew(content: string) {
    await onSubmit(content, null);
  }

  return (
    <div className="comment-list">
      {topLevelComments.map((comment) => (
        <React.Fragment key={comment.id}>
          <CommentItem
            comment={comment}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onReply={handleReply}
            onDelete={onDelete}
            depth={0}
          />
          {/* 이 댓글에 대한 답글 폼 */}
          {replyToId === comment.id && (
            <div style={{ paddingLeft: '24px' }}>
              <CommentForm
                documentId={documentId}
                parentId={comment.id}
                onSubmit={handleSubmitReply}
                onCancel={handleCancelReply}
                isLoggedIn={isLoggedIn}
                placeholder="답글을 입력하세요."
                submitLabel="답글 등록"
              />
            </div>
          )}
        </React.Fragment>
      ))}

      {/* 최상위 댓글 작성 폼 */}
      <div className="mt-4">
        <CommentForm
          documentId={documentId}
          parentId={null}
          onSubmit={handleSubmitNew}
          isLoggedIn={isLoggedIn}
        />
      </div>
    </div>
  );
}
