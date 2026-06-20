/**
 * config.test.ts — SPEC-FEED-001 Slice A (T-002)
 *
 * boardFeedConfigSchema 검증 — REQ-FEED-050.
 */
import { describe, it, expect } from 'vitest';
import { boardFeedConfigSchema } from '../config.js';

describe('boardFeedConfigSchema (SPEC-FEED-001 T-002)', () => {
  it('CFG-1: 빈 객체 {} 가 모든 필드 기본값으로 채워진다', () => {
    const result = boardFeedConfigSchema.parse({});
    expect(result).toEqual({
      enabled: false,
      itemCount: 20,
      fullContent: false,
      excerptLength: 400,
    });
  });

  it('CFG-2: enabled/itemCount/fullContent/excerptLength 가 명시적으로 파싱된다', () => {
    const result = boardFeedConfigSchema.parse({
      enabled: true,
      itemCount: 50,
      fullContent: true,
      excerptLength: 200,
    });
    expect(result.enabled).toBe(true);
    expect(result.itemCount).toBe(50);
    expect(result.fullContent).toBe(true);
    expect(result.excerptLength).toBe(200);
  });

  it('CFG-3: optional 필드(description/imageUrl/copyright) 가 없으면 undefined', () => {
    const result = boardFeedConfigSchema.parse({});
    expect(result.description).toBeUndefined();
    expect(result.imageUrl).toBeUndefined();
    expect(result.copyright).toBeUndefined();
  });

  it('CFG-4: optional 필드가 제공되면 그대로 파싱된다', () => {
    const result = boardFeedConfigSchema.parse({
      description: '게시판 피드 설명',
      imageUrl: 'https://example.com/feed.png',
      copyright: '(c) 2026 example',
    });
    expect(result.description).toBe('게시판 피드 설명');
    expect(result.imageUrl).toBe('https://example.com/feed.png');
    expect(result.copyright).toBe('(c) 2026 example');
  });

  it('CFG-5: itemCount 가 1 미만이면 거부된다', () => {
    expect(() => boardFeedConfigSchema.parse({ itemCount: 0 })).toThrow();
  });

  it('CFG-6: itemCount 가 1000 초과면 거부된다', () => {
    expect(() => boardFeedConfigSchema.parse({ itemCount: 1001 })).toThrow();
  });

  it('CFG-7: itemCount 가 1..1000 경계값은 허용된다', () => {
    expect(() => boardFeedConfigSchema.parse({ itemCount: 1 })).not.toThrow();
    expect(() => boardFeedConfigSchema.parse({ itemCount: 1000 })).not.toThrow();
  });

  it('CFG-8: imageUrl 이 유효한 URL 형식이 아니면 거부된다', () => {
    expect(() => boardFeedConfigSchema.parse({ imageUrl: 'not-a-url' })).toThrow();
  });

  it('CFG-9: itemCount 가 정수가 아니면 거부된다', () => {
    expect(() => boardFeedConfigSchema.parse({ itemCount: 1.5 })).toThrow();
  });
});
