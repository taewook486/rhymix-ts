// SPEC-NOTIFICATION-001 Slice B REQ-NOTIF-007: extractMentionCandidates 단위 테스트
import { describe, it, expect } from 'vitest';
import { extractMentionCandidates } from './mention';

describe('extractMentionCandidates', () => {
  it('extracts multiple distinct mentions in first-seen order', () => {
    const content = '안녕하세요 @alice 그리고 @bob 확인해주세요';

    const result = extractMentionCandidates(content);

    expect(result).toEqual(['alice', 'bob']);
  });

  it('dedupes the same nickname case-insensitively, preserving first-seen casing', () => {
    const content = '@bob 확인해주세요 @Bob 다시 확인';

    const result = extractMentionCandidates(content);

    expect(result).toEqual(['bob']);
  });

  it('returns an empty array when there is no "@" in the content', () => {
    const content = '멘션이 전혀 없는 일반 댓글입니다';

    const result = extractMentionCandidates(content);

    expect(result).toEqual([]);
  });

  it('extracts a mention immediately followed by an HTML closing tag with no whitespace', () => {
    const content = '<p>hi @bob</p>';

    const result = extractMentionCandidates(content);

    expect(result).toEqual(['bob']);
  });
});
