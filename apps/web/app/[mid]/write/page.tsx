/**
 * [mid]/write/page.tsx — SPEC-CONTENT-001 Slice B (T-013)
 *
 * 글쓰기 진입점. Server Action 정의 + BoardWritePage 렌더.
 * Server Action 은 apps/web 레이어에서만 prisma + auth 에 접근 가능하므로 여기서 정의.
 *
 * @MX:NOTE [AUTO]: apps/web 레이어에서 prisma + auth 를 주입하는 Server Action 위임 패턴.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-010
 */
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import { getModuleDefinition } from '@/lib/modules/registry';
import { handleCreateDocumentForm } from '@rhymix-ts/board/actions';

interface WritePageProps {
  params: Promise<{ mid: string }>;
}

export default async function WritePage({ params }: WritePageProps) {
  const { mid } = await params;
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

  // 해당 모듈이 write 라우트를 지원하지 않으면 404
  const def = getModuleDefinition(instance.moduleCode);
  if (!def) {
    notFound();
  }

  const session = await auth();

  async function createDocumentAction(formData: FormData) {
    'use server';
    const user = session?.user as { id?: string | number; isAdmin?: boolean } | null | undefined;
    const actor = {
      userGroupSrl: user ? 1 : 0,
      isAdmin: !!user?.isAdmin,
    };
    const result = await handleCreateDocumentForm(formData, {
      prisma,
      authorId: user?.id != null ? Number(user.id) : null,
      actor,
    });
    if (result.success && result.documentId != null) {
      redirect(`/${mid}/${result.documentId}`);
    }
  }

  return (
    <main>
      <h1>{instance.name} — 글쓰기</h1>
      <form action={createDocumentAction}>
        <input type="hidden" name="moduleInstanceId" value={instance.id} />
        <div>
          <label htmlFor="title">제목</label>
          <input id="title" name="title" type="text" required maxLength={200} />
        </div>
        <div>
          <label htmlFor="content">내용</label>
          <textarea id="content" name="content" required rows={10} />
        </div>
        <button type="submit">작성</button>
        <a href={`/${mid}`}>취소</a>
      </form>
    </main>
  );
}
