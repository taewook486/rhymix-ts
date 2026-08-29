/**
 * 아이디/닉네임 차단 관리 페이지 — SPEC-MEMBER-ADMIN-001 Slice B.
 *
 * Server Component. `admin.user.deniedList.list`/`add`/`remove` 를 그대로 사용하는
 * CRUD 화면. `groups/forms.tsx` 패턴(Server Actions + useActionState) 재사용.
 * 신규 백엔드 프로시저를 추가하지 않는다.
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-004~008
 */
import Link from 'next/link'
import { getServerCaller } from '@/lib/trpc/server';
import { AddDeniedForm } from './forms';
import { removeDeniedFormAction } from './actions';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ type?: 'USER_ID' | 'NICK_NAME' }>;
}

const TYPE_LABELS: Record<string, string> = {
  USER_ID: '아이디',
  NICK_NAME: '닉네임',
};

export default async function AdminDeniedListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const caller = await getServerCaller();

  const items = await caller.admin.user.deniedList.list({ type: sp.type });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">아이디/닉네임 차단 관리</h1>

      <AddDeniedForm />

      {/* 종류별 필터 (REQ-MADM-004) */}
      <div className="border-b border-zinc-200 mb-4">
        <nav className="-mb-px flex gap-4">
          <Link
            href="/admin/members/denied-list"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              !sp.type ? 'border-zinc-800 text-zinc-900' : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            전체
          </Link>
          <Link
            href="/admin/members/denied-list?type=USER_ID"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              sp.type === 'USER_ID' ? 'border-zinc-800 text-zinc-900' : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            아이디
          </Link>
          <Link
            href="/admin/members/denied-list?type=NICK_NAME"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              sp.type === 'NICK_NAME' ? 'border-zinc-800 text-zinc-900' : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            닉네임
          </Link>
        </nav>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-100">
            <th className="text-left px-3 py-2 font-medium">종류</th>
            <th className="text-left px-3 py-2 font-medium">패턴</th>
            <th className="text-left px-3 py-2 font-medium">사유</th>
            <th className="text-left px-3 py-2 font-medium">등록일</th>
            <th className="text-left px-3 py-2 font-medium">관리</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-zinc-200 hover:bg-zinc-50">
              <td className="px-3 py-2">{TYPE_LABELS[item.kind] ?? item.kind}</td>
              <td className="px-3 py-2 font-mono text-xs">{item.pattern}</td>
              <td className="px-3 py-2 text-zinc-600">{item.reason ?? '—'}</td>
              <td className="px-3 py-2 text-zinc-400">
                {new Date(item.createdAt).toLocaleDateString('ko-KR')}
              </td>
              <td className="px-3 py-2">
                <form action={removeDeniedFormAction.bind(null, item.id)}>
                  <button type="submit" className="text-red-600 hover:text-red-900">
                    삭제
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-zinc-400">
                등록된 차단 항목이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
