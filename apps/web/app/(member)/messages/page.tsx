/**
 * 쪽지함 페이지 — SPEC-MESSAGE-001 REQ-MSG-002.
 *
 * /messages 라우트. 받은쪽지함/보낸쪽지함 탭, 목록, 상세 패널을 제공한다.
 * 받은 쪽지를 열람하면 읽음 상태로 변경한다 (REQ-MSG-002, REQ-MSG-003).
 *
 * @MX:NOTE [AUTO]: Server Component — 목록 조회 + 열람 시 읽음 처리(mutation)를
 * 같은 렌더에서 수행한다. Link prefetch로 인한 의도치 않은 읽음 처리를 막기 위해
 * 쪽지 목록/삭제 링크는 모두 prefetch={false} 로 표시한다.
 * @MX:SPEC: SPEC-MESSAGE-001 REQ-MSG-002, REQ-MSG-003
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/config';
import { getServerCaller } from '@/lib/trpc/server';
import { deleteMessageAction, deleteMessagesAction } from './actions';

export const dynamic = 'force-dynamic';

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return d.toLocaleDateString('ko-KR');
}

interface MessagesPageProps {
  searchParams: Promise<{ folder?: string; id?: string }>;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/messages');
  }

  const { folder: folderParam, id: idParam } = await searchParams;
  const folder: 'inbox' | 'sent' = folderParam === 'sent' ? 'sent' : 'inbox';
  const selectedId = idParam ? Number(idParam) : null;

  const caller = await getServerCaller();
  const { messages } = await caller.content.message.list({ folder, limit: 50 });

  let selected =
    selectedId != null ? (messages.find((m: any) => m.id === selectedId) ?? null) : null;

  // REQ-MSG-002: 받은 쪽지를 클릭해 상세를 열람하면 읽음 상태로 변경한다.
  if (selected && folder === 'inbox' && !selected.readAt) {
    await caller.content.message.read({ id: selected.id });
    selected = { ...selected, readAt: new Date() };
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">쪽지함</h1>

      <div className="flex gap-2 mb-4 border-b border-zinc-200">
        <Link
          href="/messages?folder=inbox"
          prefetch={false}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            folder === 'inbox'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          받은 쪽지함
        </Link>
        <Link
          href="/messages?folder=sent"
          prefetch={false}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            folder === 'sent'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          보낸 쪽지함
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 목록 */}
        <div>
          {messages.length === 0 ? (
            <p className="text-zinc-500 text-sm py-8 text-center">쪽지가 없습니다.</p>
          ) : (
            <form action={deleteMessagesAction}>
              <div className="flex justify-end mb-2">
                <button
                  type="submit"
                  className="text-xs px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded hover:bg-zinc-200"
                >
                  선택 삭제
                </button>
              </div>
              <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg overflow-hidden">
                {messages.map((msg: any) => {
                  const counterpart = folder === 'inbox' ? msg.sender : msg.receiver;
                  const isUnread = folder === 'inbox' && !msg.readAt;
                  const isSelected = selected?.id === msg.id;

                  return (
                    <li
                      key={msg.id}
                      className={`px-3 py-2 ${isSelected ? 'bg-blue-50' : 'hover:bg-zinc-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="messageIds"
                          value={msg.id}
                          className="shrink-0"
                          aria-label="쪽지 선택"
                        />
                        <Link
                          href={`/messages?folder=${folder}&id=${msg.id}`}
                          prefetch={false}
                          className="flex-1 min-w-0"
                        >
                          <div className={`text-sm truncate ${isUnread ? 'font-bold' : 'font-normal'}`}>
                            {counterpart?.nickName ?? '알 수 없음'} — {msg.subject}
                          </div>
                          <div className="text-xs text-zinc-500">{formatRelativeTime(msg.createdAt)}</div>
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </form>
          )}
        </div>

        {/* 상세 */}
        <div className="border border-zinc-200 rounded-lg p-4">
          {selected ? (
            <div>
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="font-bold truncate">{selected.subject}</h2>
                  <p className="text-xs text-zinc-500">
                    {(folder === 'inbox' ? selected.sender : selected.receiver)?.nickName ?? '알 수 없음'}
                    {' · '}
                    {formatRelativeTime(selected.createdAt)}
                  </p>
                </div>
                <form action={deleteMessageAction.bind(null, selected.id)}>
                  <button
                    type="submit"
                    className="shrink-0 text-xs px-3 py-1.5 bg-white border border-zinc-300 text-zinc-700 rounded hover:bg-zinc-50"
                  >
                    삭제
                  </button>
                </form>
              </div>
              <p className="text-sm whitespace-pre-wrap">{selected.content}</p>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm text-center py-8">쪽지를 선택하세요.</p>
          )}
        </div>
      </div>
    </main>
  );
}
