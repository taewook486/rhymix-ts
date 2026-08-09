'use client';
/**
 * 휴지통 통합 뷰 클라이언트 컴포넌트 — SPEC-CONTENT-PARITY-001 M2 (REQ-CPAR-003~007).
 *
 * design.md D-3: 문서 휴지통(`Trash` 모델)과 댓글 휴지통(`Comment.deletedAt` 가상 뷰)을
 * 타입 필터(전체/문서/댓글)로 오가는 통합 뷰. 만료일은 문서에만 존재 — 댓글 탭은 "—" 표시.
 *
 * @MX:SPEC: SPEC-CONTENT-PARITY-001 REQ-CPAR-003~007
 */
import { useState } from 'react';
import { trpc } from '@/providers/TRPCProvider';

type TypeFilter = 'all' | 'document' | 'comment';
type EmptyScope = 'all' | 'document' | 'comment';

interface DocumentTrashItem {
  id: number;
  documentId: number;
  expiresAt: string | Date;
  document: { id: number; title: string; nickName?: string | null } | null;
  deletedBy: { id: number; nickName: string } | null;
}

interface CommentTrashItem {
  id: number;
  documentId: number;
  content: string;
  nickName: string | null;
  deletedAt: string | Date | null;
  document: { id: number; title: string } | null;
}

interface TrashRow {
  type: 'document' | 'comment';
  key: string;
  contentId: number;
  summary: string;
  author: string;
  deletedByLabel: string;
  expiresAtLabel: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function toDocumentRow(item: DocumentTrashItem): TrashRow {
  return {
    type: 'document',
    key: `document-${item.documentId}`,
    contentId: item.documentId,
    summary: item.document?.title ?? `문서 #${item.documentId}`,
    author: item.document?.nickName ?? '-',
    deletedByLabel: item.deletedBy?.nickName ?? '-',
    expiresAtLabel: item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('ko-KR') : '-',
  };
}

function toCommentRow(item: CommentTrashItem): TrashRow {
  const summaryText = stripHtml(item.content ?? '');
  return {
    type: 'comment',
    key: `comment-${item.id}`,
    contentId: item.id,
    summary: summaryText.length > 60 ? `${summaryText.slice(0, 60)}...` : summaryText,
    author: item.nickName ?? '-',
    // Comment 모델에는 deletedById가 없음(design.md D-3) — "—"로 표시.
    deletedByLabel: '-',
    // 만료(expiresAt) 개념은 문서 휴지통에만 존재 — 댓글 탭은 "—" 표시.
    expiresAtLabel: '-',
  };
}

interface TrashClientProps {
  initialDocuments: { items: DocumentTrashItem[]; nextCursor: string | null };
  initialComments: { items: CommentTrashItem[]; nextCursor: string | null };
}

export function TrashClient({ initialDocuments, initialComments }: TrashClientProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [emptyScope, setEmptyScope] = useState<EmptyScope>('all');

  const docQuery = trpc.admin.trash.list.useQuery({ limit: 50 });
  const commentQuery = trpc.admin.trash.listComments.useQuery({ limit: 50 });

  const documents = (docQuery.data ?? initialDocuments) as TrashClientProps['initialDocuments'];
  const comments = (commentQuery.data ?? initialComments) as TrashClientProps['initialComments'];

  const restoreDocument = trpc.admin.trash.restore.useMutation({
    onSuccess: () => {
      docQuery.refetch();
    },
  });
  const purgeDocument = trpc.admin.trash.purge.useMutation({
    onSuccess: () => {
      docQuery.refetch();
    },
  });
  const restoreComment = trpc.admin.trash.restoreComment.useMutation({
    onSuccess: () => {
      commentQuery.refetch();
    },
  });
  const purgeComment = trpc.admin.trash.purgeComment.useMutation({
    onSuccess: () => {
      commentQuery.refetch();
    },
  });
  const emptyTrash = trpc.admin.trash.empty.useMutation({
    onSuccess: () => {
      docQuery.refetch();
      commentQuery.refetch();
    },
  });

  const documentRows = documents.items.map(toDocumentRow);
  const commentRows = comments.items.map(toCommentRow);

  const rows: TrashRow[] =
    typeFilter === 'document'
      ? documentRows
      : typeFilter === 'comment'
        ? commentRows
        : [...documentRows, ...commentRows];

  const handleRestore = async (row: TrashRow) => {
    if (row.type === 'document') {
      await restoreDocument.mutateAsync({ documentId: row.contentId });
    } else {
      await restoreComment.mutateAsync({ commentId: row.contentId });
    }
  };

  const handlePurge = async (row: TrashRow) => {
    if (!confirm('이 항목을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    if (row.type === 'document') {
      await purgeDocument.mutateAsync({ documentId: row.contentId });
    } else {
      await purgeComment.mutateAsync({ commentId: row.contentId });
    }
  };

  const handleEmpty = async () => {
    const scopeLabel = { all: '전체', document: '문서', comment: '댓글' }[emptyScope];
    if (
      !confirm(
        `휴지통(${scopeLabel})을 비우시겠습니까? 대상 항목이 모두 영구 삭제되며 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }
    await emptyTrash.mutateAsync({ scope: emptyScope });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 타입 필터 — REQ-CPAR-004 */}
        <div role="tablist" aria-label="휴지통 타입 필터" className="flex gap-1">
          {(
            [
              { value: 'all', label: '전체' },
              { value: 'document', label: '문서' },
              { value: 'comment', label: '댓글' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={typeFilter === tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={
                typeFilter === tab.value
                  ? 'px-3 py-1.5 text-sm rounded bg-zinc-900 text-white'
                  : 'px-3 py-1.5 text-sm rounded border text-zinc-600 hover:bg-zinc-50'
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 휴지통 비우기 — REQ-CPAR-007 */}
        <div className="flex items-center gap-2">
          <select
            aria-label="비우기 범위"
            value={emptyScope}
            onChange={(e) => setEmptyScope(e.target.value as EmptyScope)}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="all">전체</option>
            <option value="document">문서만</option>
            <option value="comment">댓글만</option>
          </select>
          <button
            type="button"
            onClick={handleEmpty}
            disabled={emptyTrash.isPending}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            휴지통 비우기
          </button>
        </div>
      </div>

      <div className="border rounded bg-white overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목/내용</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작성자</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">삭제한 관리자</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">만료일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  휴지통이 비어 있습니다.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{row.type === 'document' ? '문서' : '댓글'}</td>
                <td className="px-4 py-3 text-sm">{row.summary}</td>
                <td className="px-4 py-3 text-sm">{row.author}</td>
                <td className="px-4 py-3 text-sm">{row.deletedByLabel}</td>
                <td className="px-4 py-3 text-sm">{row.expiresAtLabel}</td>
                <td className="px-4 py-3 text-sm space-x-2">
                  <button
                    type="button"
                    onClick={() => handleRestore(row)}
                    className="text-blue-600 hover:underline"
                  >
                    복원
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePurge(row)}
                    className="text-red-600 hover:underline"
                  >
                    영구 삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
