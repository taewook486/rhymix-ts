/**
 * 관리자 휴지통 관리 페이지 — SPEC-DOCUMENT-001 Slice C.
 *
 * isAdmin 세션 검사 후 비관리자는 / 로 리다이렉트한다.
 * Prisma 연동 전 플레이스홀더 UI 를 표시한다.
 *
 * @MX:NOTE [AUTO]: 실제 데이터 표시는 Prisma 연동 완료 후 활성화 예정.
 * @MX:SPEC: SPEC-DOCUMENT-001 Slice C
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';

export const dynamic = 'force-dynamic';

export default async function AdminTrashPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">휴지통 관리</h1>
      <p className="text-sm text-zinc-500">
        구현 예정 — Prisma 연동 후 활성화
      </p>
    </section>
  );
}
