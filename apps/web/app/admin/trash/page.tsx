/**
 * 관리자 휴지통 관리 페이지 — SPEC-DOCUMENT-001 Slice C + SPEC-CONTENT-PARITY-001 M2.
 *
 * design.md D-3: 문서 휴지통(`Trash` 모델)과 댓글 휴지통(`Comment.deletedAt` 가상 뷰)을
 * 하나의 통합 뷰로 제공한다. 타입 필터/복원/개별 영구 삭제/비우기는 TrashClient가 담당.
 *
 * @MX:SPEC: SPEC-DOCUMENT-001 Slice C, SPEC-CONTENT-PARITY-001 REQ-CPAR-003~008
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { TrashClient } from './TrashClient';

export const dynamic = 'force-dynamic';

export default async function AdminTrashPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const [documents, comments] = await Promise.all([
    caller.admin.trash.list({ limit: 50 }),
    caller.admin.trash.listComments({ limit: 50 }),
  ]);

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">휴지통 관리</h1>
      <p className="text-sm text-zinc-500 mb-6">
        삭제된 문서와 댓글을 조회하고 복원하거나 영구 삭제합니다.
      </p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <TrashClient initialDocuments={documents as any} initialComments={comments as any} />
    </section>
  );
}
