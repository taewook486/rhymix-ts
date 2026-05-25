/**
 * apps/web/app/[mid]/[id]/page.tsx — SPEC-CONTENT-001 View Page Route
 *
 * 게시판 문서 상세 보기 라우트.
 * siteId → getModuleInstanceByMid → board 조회 → BoardViewPage 위임.
 *
 * @MX:NOTE [AUTO]: apps/web 레이어에서 prisma + auth 를 주입하는 패턴 (write/page.tsx 와 동일).
 * @MX:SPEC: SPEC-CONTENT-001
 */
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import { getModuleDefinition } from '@/lib/modules/registry';

interface ViewPageProps {
  params: Promise<{ mid: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ViewPage({ params, searchParams }: ViewPageProps) {
  const { mid, id } = await params;
  const resolvedSearchParams = await searchParams;

  // id가 유효한 정수인지 먼저 검사
  const documentId = Number(id);
  if (!Number.isInteger(documentId) || documentId <= 0) {
    notFound();
  }

  const h = await headers();
  const siteIdStr = h.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;

  if (!Number.isFinite(siteId) || siteId <= 0) {
    notFound();
  }

  const instance = await getModuleInstanceByMid(siteId, mid, { prisma });
  if (!instance) {
    notFound();
  }

  const def = getModuleDefinition(instance.moduleCode);
  if (!def?.routes?.view) {
    notFound();
  }

  // board 인스턴스 확인
  const board = await prisma.board.findUnique({
    where: { moduleInstanceId: instance.id },
  });
  if (!board) {
    notFound();
  }

  const session = await auth();
  const sessionUser = session?.user as { id?: string | number; isAdmin?: boolean } | null | undefined;

  const typedSession =
    sessionUser?.id != null
      ? { user: { id: Number(sessionUser.id), isAdmin: !!sessionUser.isAdmin } }
      : null;

  return def.routes.view({
    instance,
    params: { mid, id },
    searchParams: resolvedSearchParams,
    prisma,
    documentId,
    session: typedSession,
  } as Parameters<typeof def.routes.view>[0]);
}
