/**
 * config.ts — SPEC-FEED-001 Slice A (T-002)
 *
 * 게시판별 RSS/Atom 피드 설정 Zod 스키마.
 * `Board.feedConfig Json` 컬럼에 저장되는 값을 검증/기본값 처리한다.
 *
 * 레거시 `open_rss` 단일 enum(Y/H/N)을 enabled + fullContent 두 boolean 으로 분리한다
 * (가독성 — research.md §1.5 참조).
 *
 * @MX:SPEC: SPEC-FEED-001 REQ-FEED-050
 */
import { z } from 'zod';

/**
 * 게시판 피드 설정 스키마.
 *
 * - enabled: 피드 활성화 여부 (기본 false — 명시적으로 켜야 함).
 * - itemCount: 피드 항목 수 (1..1000, 레거시 feed_document_count 와 동일 범위).
 *   라우트 레이어에서 Math.min(itemCount, 100) 으로 추가 clamp 한다(F1 결정, listDocuments
 *   의 limit.max(100) 제약과는 별개의 책임).
 * - fullContent: true 면 본문 전체, false 면 excerptLength 발췌.
 * - excerptLength: 발췌 길이(기본 400, 레거시 getSummary(400) 과 동일).
 */
export const boardFeedConfigSchema = z.object({
  enabled: z.boolean().default(false),
  itemCount: z.number().int().min(1).max(1000).default(20),
  fullContent: z.boolean().default(false),
  excerptLength: z.number().int().positive().default(400),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  copyright: z.string().optional(),
});

export type BoardFeedConfig = z.infer<typeof boardFeedConfigSchema>;
export type BoardFeedConfigInput = z.input<typeof boardFeedConfigSchema>;
