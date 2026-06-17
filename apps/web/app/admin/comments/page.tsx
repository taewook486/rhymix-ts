/**
 * 전체 댓글 관리 페이지 — SPEC-ADMIN-002 Slice 1E (REQ-ADMIN2-075, REQ-ADMIN2-076)
 *
 * Cross-board comment list with filters and bulk delete.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-075, REQ-ADMIN2-076
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export const dynamic = 'force-dynamic';

export default async function AdminCommentsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  // Initial data fetch - list comments with default filters
  const caller = await getServerCaller();
  const comments = await caller.admin.comment.listAcrossAllBoards({
    limit: 50,
  });

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">전체 댓글 관리</h1>

      {/* Filters */}
      <div className="mb-4 p-4 border rounded bg-white">
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="module-filter" className="block text-sm font-medium mb-1">
              게시판
            </label>
            <select id="module-filter" className="w-full border rounded px-3 py-2">
              <option value="">전체</option>
              {/* Dynamic board options will be populated here */}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="author-filter" className="block text-sm font-medium mb-1">
              작성자
            </label>
            <input
              id="author-filter"
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="작성자 검색"
            />
          </div>

          <div className="flex-1">
            <label htmlFor="search-input" className="block text-sm font-medium mb-1">
              검색
            </label>
            <input
              id="search-input"
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="댓글 내용 검색"
            />
          </div>
        </div>
      </div>

      {/* Comment List */}
      <div className="border rounded bg-white">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">내용</th>
              <th className="px-4 py-2 text-left">게시판</th>
              <th className="px-4 py-2 text-left">문서</th>
              <th className="px-4 py-2 text-left">작성자</th>
              <th className="px-4 py-2 text-left">작성일</th>
            </tr>
          </thead>
          <tbody>
            {comments.items.map((comment: any) => (
              <tr key={comment.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">
                  <input type="checkbox" className="rounded" value={comment.id} />
                </td>
                <td className="px-4 py-2">{comment.id}</td>
                <td className="px-4 py-2">
                  <div className="max-w-md truncate">{comment.content}</div>
                </td>
                <td className="px-4 py-2">
                  <a
                    href={`/admin/boards/${comment.document.boardId}`}
                    className="text-blue-600 hover:underline"
                  >
                    게시판 #{comment.document.boardId}
                  </a>
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
                <td className="px-4 py-2">
                  {new Date(comment.regdate).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {comments.nextCursor && (
          <div className="px-4 py-3 border-t">
            <button className="text-blue-600 hover:underline">더 보기</button>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      <div className="mt-4 flex gap-2">
        <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          일괄 삭제
        </button>
      </div>

      {/* Total Count */}
      <div className="mt-4 text-sm text-gray-600">
        총 {comments.total}개의 댓글
      </div>
    </section>
  );
}
