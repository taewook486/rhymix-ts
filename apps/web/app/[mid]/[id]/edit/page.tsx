/**
 * apps/web/app/[mid]/[id]/edit/page.tsx — SPEC-BOARD-CRUD-001 (REQ-BOARD-053, REQ-BOARD-054)
 *
 * 게시판 문서 수정 라우트.
 * BoardEditPage 컴포넌트에 prisma, session, updateAction 주입.
 *
 * @MX:NOTE [AUTO]: [id]/page.tsx (view) 와 동일한 사이트/모듈 해석 패턴.
 * @MX:SPEC: SPEC-BOARD-CRUD-001 REQ-BOARD-053, REQ-BOARD-054
 */
'use server';

import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import { updateDocument } from '@rhymix-ts/document';
import { BoardEditPage } from '@rhymix-ts/board';

interface EditPageProps {
  params: Promise<{ mid: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EditPage({ params }: EditPageProps) {
  const { mid, id } = await params;
  const documentId = Number(id);
  if (!Number.isInteger(documentId) || documentId <= 0) notFound();

  const h = await headers();
  const siteIdStr = h.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;
  if (!Number.isFinite(siteId) || siteId <= 0) notFound();

  const instance = await getModuleInstanceByMid(siteId, mid, { prisma });
  if (!instance) notFound();

  const session = await auth();
  const sessionUser = session?.user as { id?: string | number; isAdmin?: boolean } | null | undefined;
  const typedSession =
    sessionUser?.id != null
      ? { user: { id: Number(sessionUser.id), isAdmin: !!sessionUser.isAdmin } }
      : null;

  // Server Action: 수정 완료 후 상세 페이지로 redirect
  async function updateAction(formData: FormData) {
    'use server';
    const docId = Number(formData.get('documentId'));
    const title = String(formData.get('title') ?? '');
    const content = String(formData.get('content') ?? '');
    const userId = typedSession?.user.id;
    if (!userId) redirect(`/login?callbackUrl=/${mid}/${id}/edit`);

    // updateDocument에 actor 인자로 userId와 userGroupSrl 전달
    await updateDocument(
      {
        id: docId,
        title,
        content,
        actor: {
          userId,
          userGroupSrl: 1, // 기본 회원 그룹 (TODO: 실제 그룹 조회로 대체)
          isAdmin: !!typedSession?.user.isAdmin,
        },
      },
      { prisma },
    );
    redirect(`/${mid}/${id}`);
  }

  return (
    <BoardEditPage
      instance={instance}
      params={{ mid, id }}
      searchParams={{}}
      prisma={prisma}
      documentId={documentId}
      session={typedSession}
      updateAction={updateAction}
    />
  );
}
