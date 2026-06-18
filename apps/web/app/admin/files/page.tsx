/**
 * 파일 관리 페이지 — SPEC-ADMIN-002 Slice 2B (REQ-ADMIN2-078, REQ-ADMIN2-079).
 *
 * 파일 목록 + 고아 파일 정리.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-078, REQ-ADMIN2-079
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { FileManagementClient } from './FileManagementClient';

export const dynamic = 'force-dynamic';

export default async function AdminFilesPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();

  // 초기 데이터 로드
  const [files, orphans] = await Promise.all([
    caller.admin.file.list({ limit: 20 }),
    caller.admin.file.listOrphans({ limit: 10 }),
  ]);

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">파일 관리</h1>
      <FileManagementClient initialFiles={files} initialOrphans={orphans} />
    </section>
  );
}
