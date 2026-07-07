/**
 * admin/tags/page.tsx — SPEC-TAG-001 (REQ-TAG-006)
 *
 * 관리자 태그 관리 페이지
 * 태그 목록 (이름, 사용 횟수, 생성일), 삭제, 병합, 이름 변경
 *
 * @MX:SPEC: SPEC-TAG-001 REQ-TAG-006
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

interface Tag {
  id: number;
  name: string;
  count: number;
  createdAt: Date;
}

/**
 * REQ-TAG-006: 관리자 태그 관리 페이지
 * - 태그 목록 (이름, 사용 횟수, 생성일)
 * - 태그 삭제 (연결된 게시물에서 자동 제거)
 * - 태그 병합 (A→B 병합 시 A가 붙은 게시물이 B 태그로 변경됨)
 * - 태그 이름 변경
 */
export default async function AdminTagsPage() {
  const session = await auth();
  const sessionUser = session?.user as { id?: string | number; isAdmin?: boolean } | null | undefined;

  // 관리자 권한 확인
  if (!sessionUser?.isAdmin) {
    redirect('/login?callbackUrl=/admin/tags');
  }

  // 태그 목록 조회
  const tags = await prisma.tag.findMany({
    orderBy: [
      { count: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 100, // 최대 100개 표시
  });

  return (
    <main className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">태그 관리</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
          <p className="text-sm text-gray-600 dark:text-gray-400">전체 태그 수</p>
          <p className="text-2xl font-bold">{tags.length}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded">
          <p className="text-sm text-gray-600 dark:text-gray-400">사용 중인 태그</p>
          <p className="text-2xl font-bold">
            {tags.filter((t) => t.count > 0).length}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded">
          <p className="text-sm text-gray-600 dark:text-gray-400">총 사용 횟수</p>
          <p className="text-2xl font-bold">
            {tags.reduce((sum, t) => sum + t.count, 0)}
          </p>
        </div>
      </div>

      {/* 태그 목록 테이블 */}
      <div className="bg-white dark:bg-gray-800 rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">태그 이름</th>
              <th className="px-4 py-2 text-left">사용 횟수</th>
              <th className="px-4 py-2 text-left">생성일</th>
              <th className="px-4 py-2 text-left">작업</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-2">{tag.id}</td>
                <td className="px-4 py-2 font-medium">{tag.name}</td>
                <td className="px-4 py-2">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded text-sm">
                    {tag.count}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {tag.createdAt.toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    {/* 이름 변경 버튼 */}
                    <button
                      type="button"
                      className="px-2 py-1 text-sm bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800"
                      onClick={() => {
                        // TODO: 이름 변경 모달 열기
                        alert('이름 변경 기능 구현 예정');
                      }}
                    >
                      이름 변경
                    </button>

                    {/* 병합 버튼 */}
                    <button
                      type="button"
                      className="px-2 py-1 text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                      onClick={() => {
                        // TODO: 병합 모달 열기
                        alert('병합 기능 구현 예정');
                      }}
                    >
                      병합
                    </button>

                    {/* 삭제 버튼 */}
                    <button
                      type="button"
                      className="px-2 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded hover:bg-red-200 dark:hover:bg-red-800"
                      onClick={() => {
                        // TODO: 삭제 확인 모달
                        if (confirm(`태그 "${tag.name}"을(를) 삭제하시겠습니까?\n연결된 모든 게시물에서 이 태그가 제거됩니다.`)) {
                          alert('삭제 기능 구현 예정');
                        }
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tags.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            등록된 태그가 없습니다.
          </div>
        )}
      </div>

      {/* 태그 목록으로 돌아가기 */}
      <div className="mt-6">
        <a href="/tags" className="text-sm text-blue-600 hover:underline">
          ← 태그 클라우드 보기
        </a>
      </div>
    </main>
  );
}
