/**
 * 전체 댓글 관리 페이지 — SPEC-ADMIN-002 Slice 1E (REQ-ADMIN2-075, REQ-ADMIN2-076)
 *                     SPEC-CONTENT-PARITY-001 M3 (REQ-CPAR-016~020)
 *
 * Cross-board comment list with filters and bulk delete.
 *
 * design.md D-5: 필터 상태는 URL searchParams가 SSOT — 서버 컴포넌트가 매 요청마다
 * admin.comment.listAcrossAllBoards / admin.board.list 를 재조회한다.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-075, REQ-ADMIN2-076,
 *           SPEC-CONTENT-PARITY-001 REQ-CPAR-016~020
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import Link from 'next/link';
import { CommentTableClient } from './CommentTableClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    boardId?: string
    authorId?: string
    isSecret?: string
    search?: string
    cursor?: string
  }>
}

export default async function AdminCommentsPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const sp = await searchParams;
  const caller = await getServerCaller();

  const boardId = sp.boardId ? Number(sp.boardId) : undefined;
  const authorId = sp.authorId ? Number(sp.authorId) : undefined;
  const isSecret = sp.isSecret === 'true' ? true : sp.isSecret === 'false' ? false : undefined;

  const [comments, boards] = await Promise.all([
    caller.admin.comment.listAcrossAllBoards({
      moduleInstanceId: boardId,
      authorId,
      isSecret,
      search: sp.search,
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
        <h1 className="text-2xl font-bold">전체 댓글 관리</h1>
        <Link href="/admin/comments/declared" className="text-sm text-blue-600 hover:underline">
          신고 댓글 →
        </Link>
      </div>

      {/* Filters — URL searchParams SSOT (design.md D-5, REQ-CPAR-016~017) */}
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
            <label htmlFor="isSecret-filter" className="block text-sm font-medium mb-1">
              상태
            </label>
            <select
              id="isSecret-filter"
              name="isSecret"
              defaultValue={sp.isSecret ?? ''}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">전체</option>
              <option value="false">공개</option>
              <option value="true">비밀</option>
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
              placeholder="댓글 내용 검색"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-800 text-white rounded hover:bg-zinc-700 text-sm"
            >
              검색
            </button>
          </div>
        </div>
      </form>

      <CommentTableClient comments={comments} searchParams={sp} />
    </section>
  );
}
