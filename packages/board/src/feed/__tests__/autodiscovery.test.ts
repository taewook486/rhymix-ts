/**
 * autodiscovery.test.ts — SPEC-FEED-001 Slice D (T-010)
 *
 * resolveFeedAlternates 함수 단위 테스트.
 */
import { describe, it, expect } from 'vitest';
import { resolveFeedAlternates } from '../autodiscovery';
import type { BoardFeedConfig } from '../config';

describe('resolveFeedAlternates', () => {
  it('REQ-FEED-007: 피드가 활성화되지 않은 경우 null을 반환한다', () => {
    const feedConfig: BoardFeedConfig = {
      enabled: false,
      itemCount: 20,
      fullContent: false,
      excerptLength: 400,
    };

    const result = resolveFeedAlternates(feedConfig, 'freeboard');

    expect(result).toBeNull();
  });

  it('REQ-FEED-007: 피드가 활성화된 경우 RSS와 Atom 링크를 반환한다', () => {
    const feedConfig: BoardFeedConfig = {
      enabled: true,
      itemCount: 20,
      fullContent: false,
      excerptLength: 400,
    };

    const result = resolveFeedAlternates(feedConfig, 'freeboard');

    expect(result).toEqual({
      'application/rss+xml': '/freeboard/rss',
      'application/atom+xml': '/freeboard/atom',
    });
  });

  it('다양한 mid 값에 대해 올바른 URL 경로를 생성한다', () => {
    const feedConfig: BoardFeedConfig = {
      enabled: true,
      itemCount: 10,
      fullContent: true,
      excerptLength: 200,
    };

    const result1 = resolveFeedAlternates(feedConfig, 'qna');
    expect(result1).toEqual({
      'application/rss+xml': '/qna/rss',
      'application/atom+xml': '/qna/atom',
    });

    const result2 = resolveFeedAlternates(feedConfig, 'notice');
    expect(result2).toEqual({
      'application/rss+xml': '/notice/rss',
      'application/atom+xml': '/notice/atom',
    });
  });

  it('feedConfig의 다른 필드(enabled 제외)는 반환 값에 영향을 주지 않는다', () => {
    const config1: BoardFeedConfig = {
      enabled: true,
      itemCount: 100,
      fullContent: true,
      excerptLength: 500,
      description: 'Test feed',
      imageUrl: 'https://example.com/image.png',
      copyright: 'Copyright 2024',
    };

    const config2: BoardFeedConfig = {
      enabled: true,
      itemCount: 5,
      fullContent: false,
      excerptLength: 100,
    };

    const result1 = resolveFeedAlternates(config1, 'board');
    const result2 = resolveFeedAlternates(config2, 'board');

    expect(result1).toEqual(result2);
    expect(result1).toEqual({
      'application/rss+xml': '/board/rss',
      'application/atom+xml': '/board/atom',
    });
  });
});
