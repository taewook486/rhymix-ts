/**
 * feed/index.ts — SPEC-FEED-001 Slice A
 *
 * 피드 도메인 공개 API. apps/web 라우트 핸들러가 `@rhymix-ts/board/feed` 로 import 한다.
 */
export { boardFeedConfigSchema, type BoardFeedConfig, type BoardFeedConfigInput } from './config.js';
export { escapeXml, cdataWrap } from './xml.js';
export { buildFeed, type FeedDocument, type FeedInstance, type FeedBoard, type BuildFeedArgs } from './build-feed.js';
export { resolveFeedXml, type ResolveFeedXmlArgs, type ResolveFeedXmlResult } from './resolve-feed.js';
export {
  registerFeedCacheInvalidation,
  type FeedCacheEventBus,
  type FeedCacheInvalidationEmitters,
  type FeedCacheInvalidationContext,
} from './cache-invalidation.js';
export { resolveFeedAlternates } from './autodiscovery.js';
