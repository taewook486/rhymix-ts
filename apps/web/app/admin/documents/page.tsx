/**
 * 전체 문서 관리 페이지 — SPEC-ADMIN-002 Slice 1E (REQ-ADMIN2-070, REQ-ADMIN2-071)
 *
 * Cross-board document list with filters and bulk actions.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-070, REQ-ADMIN2-071
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export const dynamic = 'force-dynamic';

export default async function AdminDocumentsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  // Initial data fetch - list documents with default filters
  const caller = await getServerCaller();
  const documents = await caller.admin.document.listAcrossAllBoards({
    limit: 50,
  });

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">전체 문서 관리</h1>

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
            <label htmlFor="status-filter" className="block text-sm font-medium mb-1">
              상태
            </label>
            <select id="status-filter" className="w-full border rounded px-3 py-2">
              <option value="">전체</option>
              <option value="PUBLIC">공개</option>
              <option value="SECRET">비밀</option>
              <option value="TEMP">임시</option>
              <option value="DECLARED">신고</option>
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="search-input" className="block text-sm font-medium mb-1">
              검색
            </label>
            <input
              id="search-input"
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="제목 또는 내용 검색"
            />
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="border rounded bg-white">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">제목</th>
              <th className="px-4 py-2 text-left">게시판</th>
              <th className="px-4 py-2 text-left">작성자</th>
              <th className="px-4 py-2 text-left">상태</th>
              <th className="px-4 py-2 text-left">작성일</th>
            </tr>
          </thead>
          <tbody>
            {documents.items.map((doc: any) => (
              <tr key={doc.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">
                  <input type="checkbox" className="rounded" value={doc.id} />
                </td>
                <td className="px-4 py-2">{doc.id}</td>
                <td className="px-4 py-2">
                  <a
                    href={`/board/${doc.board.mid}/${doc.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {doc.title}
                  </a>
                </td>
                <td className="px-4 py-2">{doc.board.name}</td>
                <td className="px-4 py-2">{doc.nickName || '익명'}</td>
                <td className="px-4 py-2">{doc.status}</td>
                <td className="px-4 py-2">
                  {new Date(doc.regdate).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {documents.nextCursor && (
          <div className="px-4 py-3 border-t">
            <button className="text-blue-600 hover:underline">더 보기</button>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      <div className="mt-4 flex gap-2">
        <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          삭제
        </button>
        <button className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
          휴지통 이동
        </button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          이동
        </button>
        <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
          상태 변경
        </button>
      </div>

      {/* Total Count */}
      <div className="mt-4 text-sm text-gray-600">
        총 {documents.total}개의 문서
      </div>
    </section>
  );
}
