/**
 * Layout 인스턴스 관리 페이지 — SPEC-ADMIN-002 Slice 2A + Slice 3D.
 *
 * Layout 인스턴스(ThemeAssignment) 목록을 표시하고 생성을 지원한다 (REQ-ADMIN2-021).
 * REQ-ADMIN2-024: 인스턴스 복제 기능 추가.
 * Server Component: getServerCaller().admin.layout.listInstances() 호출.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-021, REQ-ADMIN2-024
 */
import Link from 'next/link';
import { getServerCaller } from '@/lib/trpc/server';
import { Button } from '@rhymix-ts/ui/components';
import { LayoutInstanceForm } from './_components/LayoutInstanceForm';
import { DuplicateInstanceDialog } from './_components/DuplicateInstanceDialog';

export const dynamic = 'force-dynamic';

export default async function LayoutInstancesPage() {
  const caller = await getServerCaller();
  const instances = await caller.admin.layout.listInstances();
  const layouts = await caller.admin.layout.list();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">레이아웃 인스턴스 관리</h1>
          <p className="text-sm text-zinc-500 mt-1">
            레이아웃 인스턴스(ThemeAssignment)를 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/site/layouts">레이아웃 목록</Link>
        </Button>
      </div>

      <div className="mb-8">
        <LayoutInstanceForm layouts={layouts} />
      </div>

      {instances.length === 0 ? (
        <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center">
          <p className="text-zinc-500 mb-4">생성된 인스턴스가 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-zinc-200">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  범위
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  레이아웃 이름
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Ref ID
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
              {instances.map((instance) => (
                <tr key={instance.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-600">{instance.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {instance.scope}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-zinc-900">
                      {instance.layoutName}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-600">{instance.refId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-600">
                      {new Date(instance.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/site/layouts/${instance.id}`}>편집</Link>
                    </Button>
                    <DuplicateInstanceDialog
                      instanceId={instance.id}
                      instanceName={instance.layoutName}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
