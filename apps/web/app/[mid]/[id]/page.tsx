/**
 * apps/web/app/[mid]/[id]/page.tsx — SPEC-CONTENT-001 View Page Route
 *
 * 게시판 문서 상세 보기 라우트.
 * siteId → getModuleInstanceByMid → board 조회 → BoardViewPage 위임.
 *
 * @MX:NOTE [AUTO]: apps/web 레이어에서 prisma + auth 를 주입하는 패턴 (write/page.tsx 와 동일).
 * @MX:SPEC: SPEC-CONTENT-001
 */
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import { getModuleDefinition } from '@/lib/modules/registry';
import { boardFeedConfigSchema, resolveFeedAlternates } from '@rhymix-ts/board/feed';
import { SendMessageButton } from '@/components/message/SendMessageButton';
import { PollWidget } from '@/components/poll/PollWidget';

interface ViewPageProps {
  params: Promise<{ mid: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * REQ-FEED-007: 게시판 피드 자동 검출을 위한 메타데이터 생성.
 * 문서 상세 페이지에서도 피드 링크를 제공한다 (피드는 게시판 단위, 문서 단위 아님).
 *
 * @MX:SPEC: SPEC-FEED-001 REQ-FEED-007
 */
export async function generateMetadata({ params }: ViewPageProps): Promise<Metadata> {
  const { mid } = await params;
  const h = await headers();
  const siteIdStr = h.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;

  // siteId가 유효하지 않은 경우 빈 메타데이터 반환
  if (!Number.isFinite(siteId) || siteId <= 0) {
    return {};
  }

  const instance = await getModuleInstanceByMid(siteId, mid, { prisma });
  if (!instance || instance.moduleCode !== 'board') {
    return {};
  }

  const board = await prisma.board.findUnique({
    where: { moduleInstanceId: instance.id },
  });
  if (!board) {
    return {};
  }

  const feedConfig = boardFeedConfigSchema.parse(board.feedConfig ?? {});
  const alternates = resolveFeedAlternates(feedConfig, mid);

  if (!alternates) {
    return {};
  }

  return {
    alternates: {
      types: alternates,
    },
  };
}

export default async function ViewPage({ params, searchParams }: ViewPageProps) {
  const { mid, id } = await params;
  const resolvedSearchParams = await searchParams;

  // id가 유효한 정수인지 먼저 검사
  const documentId = Number(id);
  if (!Number.isInteger(documentId) || documentId <= 0) {
    notFound();
  }

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

  const def = getModuleDefinition(instance.moduleCode);
  if (!def?.routes?.view) {
    notFound();
  }

  // board 인스턴스 확인
  const board = await prisma.board.findUnique({
    where: { moduleInstanceId: instance.id },
  });
  if (!board) {
    notFound();
  }

  const session = await auth();
  const sessionUser = session?.user as { id?: string | number; isAdmin?: boolean } | null | undefined;

  const typedSession =
    sessionUser?.id != null
      ? { user: { id: Number(sessionUser.id), isAdmin: !!sessionUser.isAdmin } }
      : null;

  // SPEC-POLL-001 REQ-POLL-001~003: 이 게시물에 연결된 설문이 있는지 조회
  const documentPoll = await prisma.documentPoll.findFirst({
    where: { documentId },
    orderBy: { sortKey: 'asc' },
  });

  return def.routes.view({
    instance,
    params: { mid, id },
    searchParams: resolvedSearchParams,
    prisma,
    documentId,
    session: typedSession,
    // SPEC-MESSAGE-001 REQ-MSG-001: 작성자 닉네임 옆 "쪽지 보내기" 액션 주입
    renderSendMessageAction: (receiverId: number, receiverNickname: string) => (
      <SendMessageButton
        receiverId={receiverId}
        receiverNickname={receiverNickname}
        currentUserId={typedSession?.user.id ?? null}
      />
    ),
    // SPEC-POLL-001 REQ-POLL-001~003: 연결된 설문이 있을 때만 렌더
    renderPoll: documentPoll
      ? () => <PollWidget pollId={documentPoll.pollId} memberId={typedSession?.user.id ?? null} />
      : undefined,
  } as Parameters<typeof def.routes.view>[0]);
}
