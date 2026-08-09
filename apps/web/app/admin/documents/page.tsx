/**
 * 전체 문서 관리 페이지 — SPEC-ADMIN-002 Slice 1E (REQ-ADMIN2-070, REQ-ADMIN2-071)
 *                     SPEC-ADMIN-002 Slice 2C (REQ-ADMIN2-153, REQ-ADMIN2-074)
 *                     SPEC-CONTENT-PARITY-001 M3 (REQ-CPAR-009~015)
 *
 * Cross-board document list with filters and bulk actions.
 *
 * design.md D-5: 필터 상태는 URL searchParams가 SSOT — 서버 컴포넌트가 매 요청마다
 * admin.document.listAcrossAllBoards / admin.board.list 를 재조회한다. 체크박스 선택과
 * 다이얼로그 상태만 DocumentTableClient의 클라이언트 상태로 관리한다.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-070, REQ-ADMIN2-071, REQ-ADMIN2-153, REQ-ADMIN2-074,
 *           SPEC-CONTENT-PARITY-001 REQ-CPAR-009~015
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import Link from 'next/link';
import { DocumentTableClient } from './DocumentTableClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    status?: string
    boardId?: string
    authorId?: string
    ip?: string
    search?: string
    cursor?: string
  }>
}

export default async function AdminDocumentsPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const sp = await searchParams;
  const caller = await getServerCaller();

  const boardId = sp.boardId ? Number(sp.boardId) : undefined;
  const authorId = sp.authorId ? Number(sp.authorId) : undefined;

  const [documents, boards] = await Promise.all([
    caller.admin.document.listAcrossAllBoards({
      moduleInstanceId: boardId,
      authorId,
      status: sp.status as 'PUBLIC' | 'SECRET' | 'TEMP' | 'DECLARED' | undefined,
      search: sp.search,
      ip: sp.ip,
      cursor: sp.cursor,
      limit: 50,
    }),
    caller.admin.board.list(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boardOptions = (boards as any[]).map((board) => ({ id: board.id, name: board.name }));

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">전체 문서 관리</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/admin/documents/declared" className="text-blue-600 hover:underline">
            신고 문서 →
          </Link>
          <Link href="/admin/documents/config" className="text-blue-600 hover:underline">
            문서 설정 →
          </Link>
        </div>
      </div>

      {/* Filters — URL searchParams SSOT (design.md D-5, REQ-CPAR-009~010) */}
      <form method="GET" className="mb-4 p-4 border rounded bg-white">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label htmlFor="boardId-filter" className="block text-sm font-medium mb-1">
              게시판
            </label>
            <select
              id="boardId-filter"
              name="boardId"
              defaultValue={sp.boardId ?? ''}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">전체</option>
              {boardOptions.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label htmlFor="authorId-filter" className="block text-sm font-medium mb-1">
              작성자 ID
            </label>
            <input
              id="authorId-filter"
              name="authorId"
              type="number"
              defaultValue={sp.authorId ?? ''}
              className="w-full border rounded px-3 py-2"
              placeholder="작성자 회원 ID"
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <label htmlFor="status-filter" className="block text-sm font-medium mb-1">
              상태
            </label>
            <select
              id="status-filter"
              name="status"
              defaultValue={sp.status ?? ''}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">전체</option>
              <option value="PUBLIC">공개</option>
              <option value="SECRET">비밀</option>
              <option value="TEMP">임시</option>
              <option value="DECLARED">신고</option>
            </select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <label htmlFor="search-input" className="block text-sm font-medium mb-1">
              검색
            </label>
            <input
              id="search-input"
              name="search"
              type="text"
              defaultValue={sp.search ?? ''}
              className="w-full border rounded px-3 py-2"
              placeholder="제목 또는 내용 검색"
            />
          </div>

          {sp.ip && <input type="hidden" name="ip" value={sp.ip} />}

          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-800 text-white rounded hover:bg-zinc-700 text-sm"
            >
              검색
            </button>
          </div>
        </div>

        {sp.ip && (
          <div className="mt-2 text-xs text-zinc-500">
            IP 필터: {sp.ip}{' '}
            <Link
              href={`?${new URLSearchParams({
                ...(sp.status ? { status: sp.status } : {}),
                ...(sp.boardId ? { boardId: sp.boardId } : {}),
                ...(sp.authorId ? { authorId: sp.authorId } : {}),
                ...(sp.search ? { search: sp.search } : {}),
              }).toString()}`}
              className="text-blue-600 hover:underline"
            >
              해제
            </Link>
          </div>
        )}
      </form>

      <DocumentTableClient documents={documents} boards={boardOptions} searchParams={sp} />
    </section>
  );
}
