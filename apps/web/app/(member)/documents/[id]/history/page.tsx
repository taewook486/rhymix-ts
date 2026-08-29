/**
 * 문서 수정 이력 페이지 — SPEC-DOCUMENT-001 Slice C.
 *
 * 작성자 본인 또는 관리자만 볼 수 있다. 권한 판정은 도메인 함수
 * getUpdateHistory 가 담당하고(BoardPermissionDeniedError), 페이지는
 * 그 예외를 안내 문구로 바꾼다.
 *
 * @MX:NOTE [AUTO]: Server Component — 도메인 함수를 직접 호출한다.
 *                 (packages/document/src/server 계층은 호출자 0곳이라 제거됐다)
 * @MX:SPEC: SPEC-DOCUMENT-001 Slice C / SPEC-CONTENT-001 REQ-CONTENT-110
 */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { getUpdateHistory, BoardPermissionDeniedError } from '@rhymix-ts/document';

interface DocumentHistoryPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

/** 세션의 user.id 는 string 으로 오므로 숫자로 정규화한다. */
function toUserId(raw: string | number | undefined): number | null {
  if (raw === undefined) return null;
  const id = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw;
  return Number.isFinite(id) ? id : null;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(value);
}

export default async function DocumentHistoryPage({ params }: DocumentHistoryPageProps) {
  const { id } = await params;
  const documentId = Number.parseInt(id, 10);

  if (!Number.isFinite(documentId) || documentId <= 0) {
    notFound();
  }

  const session = await auth();
  const userId = toUserId(session?.user?.id);

  if (userId === null) {
    redirect(`/login?callbackUrl=/documents/${documentId}/history`);
  }

  let logs;
  try {
    logs = await getUpdateHistory(
      {
        documentId,
        actor: {
          userId,
          userGroupSrl: 1,
          isAdmin: Boolean(session?.user?.isAdmin),
        },
      },
      { prisma },
    );
  } catch (err) {
    if (err instanceof BoardPermissionDeniedError) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-2">수정 이력</h1>
          <p className="text-sm text-zinc-500">이 문서의 수정 이력을 볼 권한이 없습니다.</p>
        </div>
      );
    }
    // 문서가 없으면 findUniqueOrThrow 가 P2025 로 던진다.
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025') {
      notFound();
    }
    throw err;
  }

  // 목록으로 돌아갈 주소를 만든다 — 문서는 /{mid}/{id} 에서 보인다.
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { board: { select: { moduleInstance: { select: { mid: true } } } } },
  });
  const mid = doc?.board?.moduleInstance?.mid ?? null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">수정 이력</h1>
      <p className="text-xs text-zinc-400 mb-6">문서 ID: {documentId}</p>

      {logs.length === 0 ? (
        <p className="text-sm text-zinc-500">수정 이력이 없습니다.</p>
      ) : (
        <ol className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg overflow-hidden">
          {logs.map((log) => (
            <li key={log.id} className="px-4 py-3 bg-white">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium text-zinc-800 truncate">
                  {log.prevTitle || '(제목 없음)'}
                </span>
                <time className="shrink-0 text-xs text-zinc-500" dateTime={log.regdate.toISOString()}>
                  {formatDate(log.regdate)}
                </time>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                수정 전 본문 {log.prevContent.length}자
                {log.editorId !== null ? ` · 편집자 #${log.editorId}` : ''}
              </p>
            </li>
          ))}
        </ol>
      )}

      {mid !== null && (
        <div className="mt-6">
          <Link href={`/${mid}/${documentId}`} className="text-sm text-blue-600 hover:underline">
            문서로 돌아가기
          </Link>
        </div>
      )}
    </div>
  );
}
