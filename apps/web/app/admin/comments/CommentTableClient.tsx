'use client';
/**
 * 댓글 목록 테이블 클라이언트 컴포넌트 — SPEC-CONTENT-PARITY-001 M3 (REQ-CPAR-016~020).
 *
 * design.md D-5: 체크박스 + 일괄 삭제 + 더 보기 페이지네이션. 필터 상태는
 * URL searchParams(page.tsx)가 SSOT — 이 컴포넌트는 선택 체크박스 집합과
 * 다이얼로그 열림 상태만 클라이언트 상태로 갖는다.
 *
 * @MX:SPEC: SPEC-CONTENT-PARITY-001 REQ-CPAR-016~020
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/providers/TRPCProvider';

interface CommentRow {
  id: number;
  content: string;
  nickName: string | null;
  isSecret: boolean;
  regdate: string | Date;
  document: { id: number; title: string; boardId: number };
}

interface CommentTableClientProps {
  comments: { items: CommentRow[]; nextCursor: string | null; total: number };
  searchParams: Record<string, string | undefined>;
}

function buildQuery(
  current: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '?';
}

export function CommentTableClient({ comments, searchParams }: CommentTableClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const bulkDelete = trpc.admin.comment.bulkDelete.useMutation({
    onSuccess: () => {
      setSelectedIds(new Set());
      router.refresh();
    },
  });

  const allSelected = comments.items.length > 0 && comments.items.every((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(comments.items.map((c) => c.id)));
  };

  const toggleRow = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkDeleteConfirm = () => {
    bulkDelete.mutate({ commentIds: Array.from(selectedIds) });
    setIsConfirmOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* 일괄 삭제 바 — REQ-CPAR-018 */}
      {selectedIds.size > 0 && (
        <div className="p-3 border rounded bg-zinc-50 flex items-center gap-2">
          <span className="text-sm text-zinc-600">{selectedIds.size}건 선택됨</span>
          <button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            disabled={bulkDelete.isPending}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            일괄 삭제
          </button>
        </div>
      )}

      <div className="border rounded bg-white overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="전체 선택"
                  className="rounded"
                />
              </th>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">내용</th>
              <th className="px-4 py-2 text-left">문서</th>
              <th className="px-4 py-2 text-left">작성자</th>
              <th className="px-4 py-2 text-left">상태</th>
              <th className="px-4 py-2 text-left">작성일</th>
            </tr>
          </thead>
          <tbody>
            {comments.items.map((comment) => (
              <tr key={comment.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(comment.id)}
                    onChange={() => toggleRow(comment.id)}
                    aria-label={`댓글 ${comment.id} 선택`}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-2">{comment.id}</td>
                <td className="px-4 py-2">
                  <div className="max-w-md truncate">{comment.content}</div>
                </td>
                <td className="px-4 py-2">
                  <a
                    href={`/board/${comment.document.boardId}/${comment.document.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {comment.document.title}
                  </a>
                </td>
                <td className="px-4 py-2">{comment.nickName || '익명'}</td>
                <td className="px-4 py-2">{comment.isSecret ? '비밀' : '공개'}</td>
                <td className="px-4 py-2">{new Date(comment.regdate).toLocaleDateString('ko-KR')}</td>
              </tr>
            ))}
            {comments.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  댓글이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 더 보기 — REQ-CPAR-019 */}
        {comments.nextCursor && (
          <div className="px-4 py-3 border-t">
            <Link
              href={buildQuery(searchParams, { cursor: comments.nextCursor })}
              className="text-blue-600 hover:underline"
            >
              더 보기
            </Link>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600">총 {comments.total}개의 댓글</div>

      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">일괄 삭제 확인</h3>
            <p className="text-sm text-zinc-600 mb-6">
              선택한 {selectedIds.size}건의 댓글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 text-sm border border-zinc-300 rounded hover:bg-zinc-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                disabled={bulkDelete.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300"
              >
                {bulkDelete.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
