/**
 * 파일 설정 페이지 — SPEC-ADMIN-002 Slice 2B + Slice 3E (REQ-ADMIN2-080, REQ-ADMIN2-081, REQ-ADMIN2-082).
 *
 * 파일 업로드/다운로드/기타 설정.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-080, REQ-ADMIN2-081, REQ-ADMIN2-082
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { FileSettingsForm } from './FileSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminFileSettingsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();

  const [uploadSettings, downloadSettings, otherSettings] = await Promise.all([
    caller.admin.file.getUploadSettings(),
    caller.admin.file.getDownloadSettings(),
    caller.admin.file.getOtherSettings(),
  ]);

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">파일 설정</h1>
      <FileSettingsForm
        initialUpload={uploadSettings}
        initialDownload={downloadSettings}
        initialOther={otherSettings}
      />
    </section>
  );
}
