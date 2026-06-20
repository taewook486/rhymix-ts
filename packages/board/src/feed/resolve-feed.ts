/**
 * resolve-feed.ts — SPEC-FEED-001 Slice A (T-005/T-006 공통 로직)
 *
 * RSS/Atom 라우트 핸들러가 공유하는 게이트 + 데이터 조회 + 빌더 호출 로직.
 * Route Handler(apps/web/app/[mid]/rss/route.ts, .../atom/route.ts)는 이 함수를
 * 호출하고 Content-Type 만 다르게 설정한다(REQ-FEED-006).
 *
 * 게이트 순서: 인스턴스 미존재 → 404 / feedConfig.enabled=false → 404 /
 *             guest 의 list·view 권한 없음 → 404 (REQ-FEED-032/033, Q4 판단: 404 로 통일).
 *
 * 피드는 익명(guest) 출력이므로 항상 userGroupSrl: 0, isAdmin: false 컨텍스트로
 * 권한을 평가한다 — 요청자의 실제 로그인 여부와 무관하게 "게스트가 읽을 수 있는 것만"
 * 노출해야 한다는 REQ-FEED-032 의도를 그대로 구현한다.
 *
 * @MX:ANCHOR [AUTO]: resolveFeedXml — rss/atom 두 라우트 핸들러의 공통 진입점.
 * @MX:REASON: fan_in = 2 (rss/route.ts, atom/route.ts). 게이트 로직이 한 곳에만 존재해야
 *             보안 회귀(비공개 게시판 노출)를 방지할 수 있다.
 * @MX:SPEC: SPEC-FEED-001 REQ-FEED-001~006, REQ-FEED-020, REQ-FEED-022, REQ-FEED-030~034
 */
import type { PrismaClient } from '@prisma/client';
import { listDocuments } from '@rhymix-ts/document';
import { canPerformAction } from '../permissions.js';
import { boardFeedConfigSchema } from './config.js';
import { buildFeed, type FeedDocument } from './build-feed.js';

/** F1 결정: 라우트 레이어에서 itemCount 를 100 으로 추가 clamp (listDocuments 의
 *  자체 limit.max(100) 제약과는 별개의 책임 — 변경하지 않는다). */
const ROUTE_ITEM_COUNT_CAP = 100;

interface FeedInstanceLike {
  id: number;
  mid: string;
  moduleCode: string;
  browserTitle: string | null;
}

interface FeedBoardLike {
  id: number;
  name: string;
  description: string | null;
  // Prisma 의 Json 컬럼 타입(JsonValue)을 그대로 받는다 — canPerformAction 이
  // 런타임에 typeof === 'object' 가드를 수행하므로 여기서는 unknown 으로 느슨하게 받는다.
  permissions: unknown;
  feedConfig: unknown;
}

export interface ResolveFeedXmlArgs {
  format: 'rss' | 'atom';
  siteId: number;
  mid: string;
  baseUrl: string;
  prisma: PrismaClient;
  /** 테스트 주입을 위해 분리 — 운영 코드는 getModuleInstanceByMid 를 넘긴다. */
  loadInstance: (siteId: number, mid: string, ctx: { prisma: PrismaClient }) => Promise<FeedInstanceLike | null>;
  /** 테스트 주입을 위해 분리 — 운영 코드는 prisma.board.findUnique 래퍼를 넘긴다. */
  loadBoard: (moduleInstanceId: number, ctx: { prisma: PrismaClient }) => Promise<FeedBoardLike | null>;
}

export type ResolveFeedXmlResult =
  | { status: 200; xml: string }
  | { status: 404 };

/** Document(Prisma) 레코드 → FeedDocument 매핑 — author nickname fallback 포함 (REQ-FEED-013). */
function toFeedDocument(doc: {
  id: number;
  title: string;
  content: string;
  contentText: string | null;
  regdate: Date;
  lastUpdate: Date;
  commentCount: number;
  tags: string[];
  category?: { title: string } | null;
  author?: { nickName: string } | null;
  nickName?: string | null;
}): FeedDocument {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    contentText: doc.contentText,
    regdate: doc.regdate,
    lastUpdate: doc.lastUpdate,
    authorNickName: doc.author?.nickName ?? doc.nickName ?? null,
    commentCount: doc.commentCount,
    categoryTitle: doc.category?.title ?? null,
    tags: doc.tags,
  };
}

export async function resolveFeedXml(args: ResolveFeedXmlArgs): Promise<ResolveFeedXmlResult> {
  const { format, siteId, mid, baseUrl, prisma, loadInstance, loadBoard } = args;

  // 1. 인스턴스 resolve (REQ-FEED-004)
  const instance = await loadInstance(siteId, mid, { prisma });
  if (!instance) {
    return { status: 404 };
  }

  // 2. board resolve
  const board = await loadBoard(instance.id, { prisma });
  if (!board) {
    return { status: 404 };
  }

  // 3. feedConfig 게이트 (REQ-FEED-033)
  const feedConfig = boardFeedConfigSchema.parse(board.feedConfig ?? {});
  if (!feedConfig.enabled) {
    return { status: 404 };
  }

  // 4. guest 권한 게이트 (REQ-FEED-032) — 피드는 항상 익명 컨텍스트로 평가한다.
  const guestContext = { userGroupSrl: 0, isAdmin: false };
  const permissions = board.permissions as Record<string, number[]> | null | undefined;
  const canList = canPerformAction({ permissions }, 'list', guestContext);
  const canView = canPerformAction({ permissions }, 'view', guestContext);
  if (!canList || !canView) {
    return { status: 404 };
  }

  // 5. 문서 조회 (REQ-FEED-020/021/022, F1 itemCount clamp)
  const limit = Math.min(feedConfig.itemCount, ROUTE_ITEM_COUNT_CAP);
  const { items } = await listDocuments(
    { moduleInstanceId: instance.id, status: 'PUBLIC', limit },
    { prisma },
  );

  // 6. 빌더 호출 (REQ-FEED-006)
  const xml = buildFeed({
    format,
    instance: { mid: instance.mid, browserTitle: instance.browserTitle },
    board: { name: board.name, description: board.description },
    feedConfig,
    documents: items.map((doc) =>
      toFeedDocument(doc as unknown as Parameters<typeof toFeedDocument>[0]),
    ),
    baseUrl,
  });

  return { status: 200, xml };
}
