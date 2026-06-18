/**
 * Layout 변수 편집 페이지 — SPEC-ADMIN-002 Slice 2A.
 *
 * ThemeAssignment.tokensOverride(JSON) 편집 폼 (REQ-ADMIN2-022).
 * Server Component: 인스턴스 조회 후 클라이언트 편집 폼으로 전달.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-022
 */
import { notFound } from 'next/navigation';
import { getServerCaller } from '@/lib/trpc/server';
import { LayoutVariablesForm } from './_components/LayoutVariablesForm';

export const dynamic = 'force-dynamic';

interface LayoutEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function LayoutEditPage({ params }: LayoutEditPageProps) {
  const { id } = await params;
  const caller = await getServerCaller();

  // 인스턴스 조회
  const instance = await caller.admin.layout.getInstance({ id }).catch(() => null);

  if (!instance) {
    notFound();
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">레이아웃 변수 편집</h1>
        <p className="text-sm text-zinc-500 mt-1">
          인스턴스: {instance.layoutName}
        </p>
      </div>
      <LayoutVariablesForm instanceId={instance.id} tokensOverride={instance.tokensOverride} />
    </div>
  );
}
