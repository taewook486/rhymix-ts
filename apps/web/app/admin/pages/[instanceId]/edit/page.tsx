/**
 * 페이지 본문 편집 페이지 — SPEC-PAGE-001 Slice C + SPEC-ADMIN-002 Slice 3D.
 *
 * Server Component: 인스턴스 조회 + 현재 mcontent 로드 후
 * PageEditForm (Client Component) 으로 전달한다.
 * REQ-ADMIN2-028: 모바일 콘텐츠도 함께 로드하여 전달.
 *
 * auth 보호: apps/web/app/admin/layout.tsx 에서 이미 처리됨.
 *
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-030, REQ-PAGE-031 + SPEC-ADMIN-002 REQ-ADMIN2-028
 */
import { notFound } from 'next/navigation';
import { prisma } from '@rhymix-ts/db';
import { loadPageContent } from '@rhymix-ts/page';
import { PageEditForm } from './_components/PageEditForm';

export const dynamic = 'force-dynamic';

interface PageEditPageProps {
  params: Promise<{ instanceId: string }>;
}

export default async function PageEditPage({ params }: PageEditPageProps) {
  const { instanceId: instanceIdStr } = await params;
  const instanceId = Number.parseInt(instanceIdStr, 10);

  if (!Number.isFinite(instanceId) || instanceId <= 0) {
    notFound();
  }

  // 인스턴스 조회 및 'page' 모듈 여부 확인
  const instance = await prisma.moduleInstance.findUnique({
    where: { id: instanceId },
    include: { config: true },
  });

  if (!instance || instance.moduleCode !== 'page') {
    notFound();
  }

  // 현재 본문 로드 (없으면 빈 문자열)
  const content = await loadPageContent(instanceId, prisma);
  const currentContent = content?.mcontent ?? '';
  const currentMobileContent = content?.mcontentMobile ?? undefined; // REQ-ADMIN2-028

  return (
    <section className="max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">페이지 편집</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {instance.name} ({instance.mid})
        </p>
      </header>
      <PageEditForm
        instanceId={instanceId}
        initialContent={currentContent}
        initialMobileContent={currentMobileContent}
        instance={instance}
      />
    </section>
  );
}
