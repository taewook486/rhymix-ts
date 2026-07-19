/**
 * 이메일 호스트 관리 페이지 — SPEC-MEMBER-ADMIN-001 Slice E.
 *
 * Server Component. `admin.user.emailHost.list`/`add`/`remove` 를 그대로 사용하는
 * CRUD 화면. `groups/forms.tsx` 패턴(Server Actions + useActionState) 재사용.
 * 신규 백엔드 프로시저를 추가하지 않는다.
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-029~031
 */
import { getServerCaller } from '@/lib/trpc/server';
import { AddEmailHostForm } from './forms';
import { removeEmailHostFormAction } from './actions';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ policy?: 'ALLOW' | 'DENY' }>;
}

const POLICY_LABELS: Record<string, string> = {
  ALLOW: '허용',
  DENY: '차단',
};

export default async function AdminEmailHostsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const caller = await getServerCaller();

  const items = await caller.admin.user.emailHost.list({ policy: sp.policy });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">이메일 호스트 관리</h1>

      <AddEmailHostForm />

      {/* 정책별 필터 (REQ-MADM-029) */}
      <div className="border-b border-zinc-200 mb-4">
        <nav className="-mb-px flex gap-4">
          <a
            href="/admin/members/email-hosts"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              !sp.policy ? 'border-zinc-800 text-zinc-900' : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            전체
          </a>
          <a
            href="/admin/members/email-hosts?policy=ALLOW"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              sp.policy === 'ALLOW' ? 'border-zinc-800 text-zinc-900' : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            허용
          </a>
          <a
            href="/admin/members/email-hosts?policy=DENY"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              sp.policy === 'DENY' ? 'border-zinc-800 text-zinc-900' : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            차단
          </a>
        </nav>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-100">
            <th className="text-left px-3 py-2 font-medium">정책</th>
            <th className="text-left px-3 py-2 font-medium">호스트</th>
            <th className="text-left px-3 py-2 font-medium">사유</th>
            <th className="text-left px-3 py-2 font-medium">등록일</th>
            <th className="text-left px-3 py-2 font-medium">관리</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-zinc-200 hover:bg-zinc-50">
              <td className="px-3 py-2">{POLICY_LABELS[item.policy] ?? item.policy}</td>
              <td className="px-3 py-2 font-mono text-xs">{item.host}</td>
              <td className="px-3 py-2 text-zinc-600">{item.reason ?? '—'}</td>
              <td className="px-3 py-2 text-zinc-400">
                {new Date(item.createdAt).toLocaleDateString('ko-KR')}
              </td>
              <td className="px-3 py-2">
                <form action={removeEmailHostFormAction.bind(null, item.id)}>
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
                등록된 이메일 호스트가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
