/**
 * feed/index.ts — SPEC-FEED-001 Slice A
 *
 * 피드 도메인 공개 API. apps/web 라우트 핸들러가 `@rhymix-ts/board/feed` 로 import 한다.
 */
export { boardFeedConfigSchema, type BoardFeedConfig, type BoardFeedConfigInput } from './config';
export { escapeXml, cdataWrap } from './xml';
export { buildFeed, type FeedDocument, type FeedInstance, type FeedBoard, type BuildFeedArgs } from './build-feed';
export { resolveFeedXml, type ResolveFeedXmlArgs, type ResolveFeedXmlResult } from './resolve-feed';
export {
  registerFeedCacheInvalidation,
  type FeedCacheEventBus,
  type FeedCacheInvalidationEmitters,
  type FeedCacheInvalidationContext,
} from './cache-invalidation';
export { resolveFeedAlternates } from './autodiscovery';
