/**
 * autodiscovery.ts — SPEC-FEED-001 Slice D (T-010) REQ-FEED-007
 *
 * 게시판 피드 자동 검출 기능. RSS/Atom 피드가 활성화된 경우
 * `<link rel="alternate" type="application/rss+xml">` 태그를 생성한다.
 *
 * @MX:SPEC: SPEC-FEED-001 REQ-FEED-007
 */
import type { BoardFeedConfig } from './config.js';

/**
 * 피드 자동 검출을 위한 링크 타입과 URL을 생성한다.
 *
 * @param feedConfig - 게시판 피드 설정
 * @param mid - 모듈 인스턴스 식별자
 * @returns 피드가 비활성화된 경우 null, 활성화된 경우 `{ [mimeType]: url }` 레코드
 *
 * @example
 * ```ts
 * const alternates = resolveFeedAlternates({ enabled: true, itemCount: 20 }, 'freeboard');
 * // => { 'application/rss+xml': '/freeboard/rss', 'application/atom+xml': '/freeboard/atom' }
 *
 * const disabled = resolveFeedAlternates({ enabled: false }, 'freeboard');
 * // => null
 * ```
 */
export function resolveFeedAlternates(
  feedConfig: BoardFeedConfig,
  mid: string,
): Record<string, string> | null {
  // REQ-FEED-007: 피드가 비활성화된 경우 null을 반환하여 <link> 태그를 생성하지 않는다
  if (!feedConfig.enabled) {
    return null;
  }

  // RSS 2.0, Atom 1.0 피드 경로를 반환한다
  return {
    'application/rss+xml': `/${mid}/rss`,
    'application/atom+xml': `/${mid}/atom`,
  };
}
