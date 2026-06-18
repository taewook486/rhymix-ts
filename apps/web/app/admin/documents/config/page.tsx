/**
 * 문서 설정 페이지 — SPEC-ADMIN-002 Slice 2C (REQ-ADMIN2-074)
 *
 * Global document defaults (sort order, page size, guest write permission).
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-074
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { DocumentConfigForm } from './DocumentConfigForm';

export const dynamic = 'force-dynamic';

export default async function AdminDocumentConfigPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const config = await caller.admin.document.getConfig();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">문서 설정</h1>

      <DocumentConfigForm initial={config} />
    </section>
  );
}
