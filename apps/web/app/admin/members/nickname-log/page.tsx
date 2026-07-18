/**
 * 닉네임 변경 기록 조회 페이지 — SPEC-MEMBER-ADMIN-001 Slice A.
 *
 * Server Component. `admin.user.nicknameLog.list` 를 그대로 사용하는
 * 읽기 전용 페이지네이션 테이블. 신규 백엔드 프로시저를 추가하지 않는다.
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-001, REQ-MADM-002, REQ-MADM-003
 */
import { getServerCaller } from '@/lib/trpc/server';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 50;

export default async function AdminNicknameLogPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = sp.page ? Number(sp.page) : 1;
  const caller = await getServerCaller();

  const data = await caller.admin.user.nicknameLog.list({
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">닉네임 변경 기록</h1>

      <div className="text-sm text-zinc-500 mb-2">총 {data.total}건</div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-100">
            <th className="text-left px-3 py-2 font-medium">회원 아이디</th>
            <th className="text-left px-3 py-2 font-medium">닉네임</th>
            <th className="text-left px-3 py-2 font-medium">변경 전</th>
            <th className="text-left px-3 py-2 font-medium">변경 후</th>
            <th className="text-left px-3 py-2 font-medium">변경 일시</th>
            <th className="text-left px-3 py-2 font-medium">변경자</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.id} className="border-t border-zinc-200 hover:bg-zinc-50">
              <td className="px-3 py-2 font-mono text-xs">{item.user?.userId ?? item.userId}</td>
              <td className="px-3 py-2">{item.user?.nickName ?? '—'}</td>
              <td className="px-3 py-2 text-zinc-600">{item.oldNickName}</td>
              <td className="px-3 py-2 text-zinc-900">{item.newNickName}</td>
              <td className="px-3 py-2 text-zinc-400">
                {new Date(item.changedAt).toLocaleString('ko-KR')}
              </td>
              <td className="px-3 py-2">
                {item.changedByAdminId ? (
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    관리자 변경
                  </span>
                ) : (
                  '본인'
                )}
              </td>
            </tr>
          ))}
          {data.items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-zinc-400">
                기록이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* REQ-MADM-003: 1페이지 초과 시 page/pageSize 파라미터로 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`?page=${p}`}
              className={`px-3 py-1 rounded border ${
                p === data.page
                  ? 'bg-zinc-800 text-white border-zinc-800'
                  : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
