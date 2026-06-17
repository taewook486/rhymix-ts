/**
 * 페이지 모듈 관리 목록 — SPEC-ADMIN-002 Slice 1B (REQ-ADMIN2-025).
 *
 * 페이지 모듈 인스턴스 목록을 표시 ("준비중" placeholder 제거).
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-025
 */
import Link from 'next/link';
import { getServerCaller } from '@/lib/trpc/server';
import { getCurrentSiteId } from '@/lib/admin/site-context';
import { Button } from '@rhymix-ts/ui/components';

export const dynamic = 'force-dynamic';

export default async function PagesPage() {
  const siteId = await getCurrentSiteId();
  const caller = await getServerCaller();

  // 페이지 모듈 인스턴스만 조회
  const instances = await caller.admin.module.list({ siteId });

  const pageInstances = instances.filter((instance) => instance.moduleCode === 'page');

  return (
    <section>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">페이지 관리</h1>
          <p className="text-sm text-zinc-500 mt-1">
            사이트의 페이지 모듈 인스턴스를 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/modules/new">새 페이지</Link>
        </Button>
      </header>

      {pageInstances.length === 0 ? (
        <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center">
          <p className="text-zinc-500 mb-4">등록된 페이지가 없습니다.</p>
          <Button asChild variant="outline">
            <Link href="/admin/modules/new">첫 페이지 만들기</Link>
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-zinc-200">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  제목
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  MID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  브라우저 제목
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  생성일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {pageInstances.map((instance) => (
                <tr key={instance.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-zinc-900">{instance.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-600">{instance.mid}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-600">{instance.browserTitle || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-600">
                      {new Date(instance.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/pages/${instance.id}/edit`}>편집</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
