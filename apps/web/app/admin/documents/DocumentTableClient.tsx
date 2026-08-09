'use client';
/**
 * 문서 목록 테이블 클라이언트 컴포넌트 — SPEC-CONTENT-PARITY-001 M3 (REQ-CPAR-009~015).
 *
 * design.md D-5: 체크박스 + 일괄 작업 + TEMP 복구/삭제 + IP 클릭 필터 + 더 보기 페이지네이션.
 * 필터 상태는 URL searchParams(page.tsx)가 SSOT이며, 이 컴포넌트는 선택 체크박스 집합과
 * 다이얼로그 열림 상태만 클라이언트 상태로 갖는다.
 *
 * @MX:SPEC: SPEC-CONTENT-PARITY-001 REQ-CPAR-009~015
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/providers/TRPCProvider';

type BulkAction = 'delete' | 'trash' | 'move' | 'status';

interface DocumentRow {
  id: number;
  title: string;
  status: string;
  nickName: string | null;
  ipAddress: string | null;
  regdate: string | Date;
  board: { mid: string; name: string };
}

interface BoardOption {
  id: number;
  name: string;
}

interface DocumentTableClientProps {
  documents: { items: DocumentRow[]; nextCursor: string | null; total: number };
  boards: BoardOption[];
  searchParams: Record<string, string | undefined>;
}

const STATUS_LABELS: Record<string, string> = {
  PUBLIC: '공개',
  SECRET: '비밀',
  TEMP: '임시',
  DECLARED: '신고',
};

const ACTION_LABELS: Record<BulkAction, string> = {
  trash: '휴지통 이동',
  delete: '삭제',
  move: '이동',
  status: '상태 변경',
};

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

export function DocumentTableClient({ documents, boards, searchParams }: DocumentTableClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>('trash');
  const [targetBoardId, setTargetBoardId] = useState('');
  const [targetStatus, setTargetStatus] = useState<'PUBLIC' | 'SECRET' | 'TEMP'>('PUBLIC');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const bulkUpdate = trpc.admin.document.bulkUpdate.useMutation({
    onSuccess: () => {
      setSelectedIds(new Set());
      router.refresh();
    },
  });
  const recoverTemp = trpc.admin.document.recoverTemp.useMutation({
    onSuccess: () => router.refresh(),
  });
  const deleteTemp = trpc.admin.document.deleteTemp.useMutation({
    onSuccess: () => router.refresh(),
  });

  const allSelected = documents.items.length > 0 && documents.items.every((doc) => selectedIds.has(doc.id));

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(documents.items.map((doc) => doc.id)));
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

  const handleBulkConfirm = () => {
    bulkUpdate.mutate({
      documentIds: Array.from(selectedIds),
      action: bulkAction,
      targetBoardId: bulkAction === 'move' && targetBoardId ? Number(targetBoardId) : undefined,
      targetStatus: bulkAction === 'status' ? targetStatus : undefined,
    });
    setIsConfirmOpen(false);
  };

  const handleDeleteTemp = (documentId: number) => {
    if (!confirm('이 임시 문서를 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    deleteTemp.mutate({ documentId });
  };

  return (
    <div className="space-y-4">
      {/* 일괄 작업 바 — REQ-CPAR-011 */}
      {selectedIds.size > 0 && (
        <div className="p-3 border rounded bg-zinc-50 flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-600">{selectedIds.size}건 선택됨</span>
          <select
            aria-label="일괄 작업"
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as BulkAction)}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="trash">휴지통 이동</option>
            <option value="delete">삭제</option>
            <option value="move">이동</option>
            <option value="status">상태 변경</option>
          </select>
          {bulkAction === 'move' && (
            <select
              aria-label="대상 게시판"
              value={targetBoardId}
              onChange={(e) => setTargetBoardId(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            >
              <option value="">대상 게시판 선택</option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          )}
          {bulkAction === 'status' && (
            <select
              aria-label="대상 상태"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as 'PUBLIC' | 'SECRET' | 'TEMP')}
              className="border rounded px-2 py-1.5 text-sm"
            >
              <option value="PUBLIC">공개</option>
              <option value="SECRET">비밀</option>
              <option value="TEMP">임시</option>
            </select>
          )}
          <button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            disabled={bulkUpdate.isPending}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            실행
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
              <th className="px-4 py-2 text-left">제목</th>
              <th className="px-4 py-2 text-left">게시판</th>
              <th className="px-4 py-2 text-left">작성자</th>
              <th className="px-4 py-2 text-left">IP</th>
              <th className="px-4 py-2 text-left">상태</th>
              <th className="px-4 py-2 text-left">작성일</th>
              <th className="px-4 py-2 text-left">작업</th>
            </tr>
          </thead>
          <tbody>
            {documents.items.map((doc) => (
              <tr key={doc.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(doc.id)}
                    onChange={() => toggleRow(doc.id)}
                    aria-label={`문서 ${doc.id} 선택`}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-2">{doc.id}</td>
                <td className="px-4 py-2">
                  <a href={`/board/${doc.board.mid}/${doc.id}`} className="text-blue-600 hover:underline">
                    {doc.title}
                  </a>
                </td>
                <td className="px-4 py-2">{doc.board.name}</td>
                <td className="px-4 py-2">{doc.nickName || '익명'}</td>
                <td className="px-4 py-2">
                  {doc.ipAddress ? (
                    // REQ-CPAR-014b: IP 클릭 → 해당 IP로 필터링된 목록
                    <Link
                      href={buildQuery(searchParams, { ip: doc.ipAddress, cursor: undefined })}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      {doc.ipAddress}
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2">{STATUS_LABELS[doc.status] ?? doc.status}</td>
                <td className="px-4 py-2">{new Date(doc.regdate).toLocaleDateString('ko-KR')}</td>
                <td className="px-4 py-2">
                  {doc.status === 'TEMP' ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => recoverTemp.mutate({ documentId: doc.id })}
                        disabled={recoverTemp.isPending}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        복구
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemp(doc.id)}
                        disabled={deleteTemp.isPending}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {documents.items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                  문서가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 더 보기 — REQ-CPAR-013 */}
        {documents.nextCursor && (
          <div className="px-4 py-3 border-t">
            <Link
              href={buildQuery(searchParams, { cursor: documents.nextCursor })}
              className="text-blue-600 hover:underline"
            >
              더 보기
            </Link>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600">총 {documents.total}개의 문서</div>

      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{ACTION_LABELS[bulkAction]} 확인</h3>
            <p className="text-sm text-zinc-600 mb-6">
              선택한 {selectedIds.size}건의 문서를 {ACTION_LABELS[bulkAction]}하시겠습니까? 이 작업은 되돌릴 수
              없는 경우가 있습니다.
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
                onClick={handleBulkConfirm}
                disabled={bulkUpdate.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300"
              >
                {bulkUpdate.isPending ? '처리 중...' : '실행'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
