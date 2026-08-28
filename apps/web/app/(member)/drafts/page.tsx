/**
 * 내 임시글 목록 페이지 — SPEC-DOCUMENT-001 Slice C.
 *
 * 현재 로그인 사용자의 TEMP 상태 문서를 나열한다.
 * 각 행에 "발행" 버튼이 있으며, publishDraft 도메인 함수를 호출한다.
 *
 * @MX:NOTE [AUTO]: Server Component — 세션 검사 후 auth() 결과를 props 없이 직접 사용.
 * @MX:WARN: publishDraft 는 packages/document/src/server/actions.ts 의 동명 스텁이 아니라
 *           도메인 함수(../draft.ts)를 직접 호출한다. 스텁은 항상 ok:false 를 반환해
 *           발행 버튼이 조용히 무시됐다.
 * @MX:SPEC: SPEC-DOCUMENT-001 Slice C
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { listDrafts, publishDraft } from '@rhymix-ts/document';

export const dynamic = 'force-dynamic';

/** 세션의 user.id 는 string 으로 오므로 숫자로 정규화한다. */
function toUserId(raw: string | number | undefined): number | null {
  if (raw === undefined) return null;
  const id = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw;
  return Number.isFinite(id) ? id : null;
}

export default async function DraftsPage() {
  const session = await auth();
  const userId = toUserId(session?.user?.id);

  if (userId === null) {
    redirect('/login?callbackUrl=/drafts');
  }

  const result = await listDrafts(
    { authorId: userId },
    { prisma },
  );

  const drafts = result.items;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">내 임시글</h1>

      {drafts.length === 0 ? (
        <p className="text-zinc-500 text-sm">임시글이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg overflow-hidden">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className="flex items-center justify-between px-4 py-3 bg-white hover:bg-zinc-50"
            >
              <span className="text-sm text-zinc-800 truncate flex-1 mr-4">
                {draft.title || '(제목 없음)'}
              </span>

              {/* publishDraft 에 documentId 를 바인딩하는 Server Action form */}
              <form
                action={async () => {
                  'use server';
                  // Server Action 은 별도 요청이므로 세션을 다시 확인한다.
                  const actionSession = await auth();
                  const actorId = toUserId(actionSession?.user?.id);
                  if (actorId === null) {
                    redirect('/login?callbackUrl=/drafts');
                  }

                  await publishDraft(
                    {
                      documentId: draft.id,
                      actor: {
                        userId: actorId,
                        isAdmin: Boolean(actionSession?.user?.isAdmin),
                      },
                    },
                    { prisma },
                  );

                  revalidatePath('/drafts');
                }}
              >
                <button
                  type="submit"
                  className="shrink-0 text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  발행
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
