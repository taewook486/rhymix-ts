/**
 * build-feed.ts — SPEC-FEED-001 Slice A (T-004)
 *
 * RSS 2.0 / Atom 1.0 공유 피드 빌더. 두 라우트 핸들러(rss/atom)는 format 인자만
 * 다르게 호출한다(REQ-FEED-006).
 *
 * 레거시 매핑 근거: research.md §1.3(RSS20), §1.4(Atom10).
 *
 * @MX:ANCHOR [AUTO]: buildFeed — RSS/Atom 라우트 핸들러 양쪽의 공통 직렬화 진입점.
 * @MX:REASON: fan_in >= 2 (app/[mid]/rss/route.ts, app/[mid]/atom/route.ts) + 향후 admin
 *             설정 미리보기 등에서도 재사용 가능. 빌더 변경 시 두 포맷이 동시에 영향받는다.
 * @MX:SPEC: SPEC-FEED-001 REQ-FEED-006, REQ-FEED-010, REQ-FEED-011, REQ-FEED-012,
 *           REQ-FEED-013, REQ-FEED-014, REQ-FEED-015, REQ-FEED-016, REQ-FEED-017,
 *           REQ-FEED-018, REQ-FEED-021
 */
import { escapeXml, cdataWrap } from './xml.js';
import type { BoardFeedConfig } from './config.js';

/**
 * 피드 빌더가 요구하는 문서 형태 — Document 모델의 일부만 발췌.
 * (listDocuments/getDocument 가 반환하는 Document 와 호환되도록 최소 필드만 정의)
 */
export interface FeedDocument {
  id: number;
  title: string;
  content: string;
  contentText: string | null;
  regdate: Date;
  lastUpdate: Date;
  authorNickName: string | null;
  commentCount: number;
  categoryTitle: string | null;
  tags: string[];
}

export interface FeedInstance {
  mid: string;
  browserTitle: string | null;
}

export interface FeedBoard {
  name: string;
  description: string | null;
}

export interface BuildFeedArgs {
  format: 'rss' | 'atom';
  instance: FeedInstance;
  board: FeedBoard;
  feedConfig: BoardFeedConfig;
  documents: FeedDocument[];
  baseUrl: string;
}

// ---------------------------------------------------------------------------
// 날짜 포맷 헬퍼
// ---------------------------------------------------------------------------

/** RSS pubDate — RFC-822 (예: "Mon, 01 Jun 2026 00:00:00 GMT") */
function toRfc822(date: Date): string {
  return date.toUTCString();
}

/** Atom published/updated — RFC-3339 (ISO 8601, Date#toISOString 과 동등) */
function toRfc3339(date: Date): string {
  return date.toISOString();
}

// ---------------------------------------------------------------------------
// 공통 헬퍼
// ---------------------------------------------------------------------------

function canonicalUrl(baseUrl: string, mid: string, documentId: number): string {
  return `${baseUrl}/${mid}/${documentId}`;
}

function resolveAuthorName(doc: FeedDocument): string {
  return doc.authorNickName ?? '익명';
}

/** category 목록: board.name + categoryTitle + tags[] (REQ-FEED-015) */
function resolveCategories(board: FeedBoard, doc: FeedDocument): string[] {
  const categories = [board.name];
  if (doc.categoryTitle) categories.push(doc.categoryTitle);
  categories.push(...doc.tags);
  return categories;
}

/** full content vs excerpt 본문 선택 (REQ-FEED-014) */
function resolveBody(feedConfig: BoardFeedConfig, doc: FeedDocument): string {
  if (feedConfig.fullContent) {
    return doc.content;
  }
  const text = doc.contentText ?? '';
  return text.slice(0, feedConfig.excerptLength);
}

function resolveChannelTitle(instance: FeedInstance, board: FeedBoard): string {
  return instance.browserTitle ?? board.name;
}

function resolveChannelDescription(board: FeedBoard, feedConfig: BoardFeedConfig): string {
  return feedConfig.description ?? board.description ?? '';
}

function resolveChannelUpdated(documents: FeedDocument[]): Date {
  if (documents.length === 0) return new Date();
  return documents.reduce(
    (latest, doc) => (doc.lastUpdate > latest ? doc.lastUpdate : latest),
    documents[0]!.lastUpdate,
  );
}

// ---------------------------------------------------------------------------
// RSS 2.0
// ---------------------------------------------------------------------------

function buildRssItem(args: BuildFeedArgs, doc: FeedDocument): string {
  const { board, feedConfig, baseUrl, instance } = args;
  const url = canonicalUrl(baseUrl, instance.mid, doc.id);
  const categories = resolveCategories(board, doc)
    .map((c) => `      <category>${escapeXml(c)}</category>`)
    .join('\n');
  const commentsLine =
    doc.commentCount > 0 ? `      <comments>${url}#comment</comments>\n` : '';

  return [
    '    <item>',
    `      <title>${escapeXml(doc.title)}</title>`,
    `      <link>${url}</link>`,
    `      <guid isPermaLink="true">${url}</guid>`,
    `      <pubDate>${toRfc822(doc.regdate)}</pubDate>`,
    `      <dc:creator>${escapeXml(resolveAuthorName(doc))}</dc:creator>`,
    `      <description>${cdataWrap(resolveBody(feedConfig, doc))}</description>`,
    categories,
    commentsLine.trimEnd(),
    '    </item>',
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}

function buildRss(args: BuildFeedArgs): string {
  const { instance, board, feedConfig, documents, baseUrl } = args;
  const channelLink = `${baseUrl}/${instance.mid}`;
  const imageLine = feedConfig.imageUrl
    ? `    <image><url>${escapeXml(feedConfig.imageUrl)}</url></image>\n`
    : '';
  const copyrightLine = feedConfig.copyright
    ? `    <copyright>${escapeXml(feedConfig.copyright)}</copyright>\n`
    : '';
  const items = documents.map((doc) => buildRssItem(args, doc)).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${escapeXml(resolveChannelTitle(instance, board))}</title>`,
    `    <link>${channelLink}</link>`,
    `    <description>${escapeXml(resolveChannelDescription(board, feedConfig))}</description>`,
    imageLine.trimEnd(),
    copyrightLine.trimEnd(),
    items,
    '  </channel>',
    '</rss>',
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Atom 1.0
// ---------------------------------------------------------------------------

function buildAtomEntry(args: BuildFeedArgs, doc: FeedDocument): string {
  const { board, feedConfig, baseUrl, instance } = args;
  const url = canonicalUrl(baseUrl, instance.mid, doc.id);
  const categories = resolveCategories(board, doc)
    .map((c) => `      <category term="${escapeXml(c)}"/>`)
    .join('\n');
  const repliesLine =
    doc.commentCount > 0
      ? `      <link rel="replies" href="${url}#comment"/>\n`
      : '';

  const text = doc.contentText ?? '';
  const summary = text.slice(0, feedConfig.excerptLength);
  const bodyLines = feedConfig.fullContent
    ? `      <summary type="text">${cdataWrap(summary)}</summary>\n      <content type="html">${cdataWrap(doc.content)}</content>`
    : `      <summary type="text">${cdataWrap(summary)}</summary>`;

  return [
    '    <entry>',
    `      <title>${escapeXml(doc.title)}</title>`,
    `      <link rel="alternate" href="${url}"/>`,
    repliesLine.trimEnd(),
    `      <id>${url}</id>`,
    `      <published>${toRfc3339(doc.regdate)}</published>`,
    `      <updated>${toRfc3339(doc.lastUpdate)}</updated>`,
    `      <author><name>${escapeXml(resolveAuthorName(doc))}</name></author>`,
    bodyLines,
    categories,
    '    </entry>',
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}

function buildAtom(args: BuildFeedArgs): string {
  const { instance, board, feedConfig, documents, baseUrl } = args;
  const channelLink = `${baseUrl}/${instance.mid}`;
  const rightsLine = feedConfig.copyright
    ? `  <rights>${escapeXml(feedConfig.copyright)}</rights>\n`
    : '';
  const entries = documents.map((doc) => buildAtomEntry(args, doc)).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <title>${escapeXml(resolveChannelTitle(instance, board))}</title>`,
    `  <subtitle>${escapeXml(resolveChannelDescription(board, feedConfig))}</subtitle>`,
    `  <id>${channelLink}</id>`,
    `  <link rel="alternate" href="${channelLink}"/>`,
    `  <updated>${toRfc3339(resolveChannelUpdated(documents))}</updated>`,
    rightsLine.trimEnd(),
    entries,
    '</feed>',
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

/**
 * RSS 2.0 또는 Atom 1.0 XML 문자열을 생성한다.
 * 두 라우트 핸들러는 `format` 인자만 다르게 호출한다(REQ-FEED-006).
 */
export function buildFeed(args: BuildFeedArgs): string {
  return args.format === 'rss' ? buildRss(args) : buildAtom(args);
}
