// SPEC-NOTIFICATION-001 Slice B REQ-NOTIF-007: 댓글 본문에서 @nickname 멘션 후보 추출
// @MX:NOTE [AUTO]: 순수 문자열 함수 — DB 접근 없음. 닉네임 해석은 hooks.ts의 onMentionDetected에서 수행.

/**
 * 댓글 본문에서 `@nickname` 형태의 멘션 후보 닉네임 목록을 추출한다.
 *
 * - 정규식 `/@([\p{L}\p{N}_-]{1,80})/gu`: 유니코드 문자/숫자/언더스코어/하이픈만 허용,
 *   `<`, `>`, 공백, 구두점은 제외하므로 `@bob</p>` 같은 HTML 인접 멘션도
 *   `bob</p>`가 아닌 `bob`만 정확히 추출된다.
 * - 대소문자 구분 없이 중복을 제거하되, 처음 등장한 표기(casing)를 보존한다.
 * - DB 조회 없는 순수 함수 — 닉네임 실존 여부 확인은 호출자(hooks.ts) 책임.
 *
 * @param content 댓글 본문(HTML sanitize 이후 텍스트)
 * @returns 처음 등장 순서를 보존한, 대소문자 무시 중복 제거된 멘션 후보 닉네임 배열
 */
export function extractMentionCandidates(content: string): string[] {
  const MENTION_PATTERN = /@([\p{L}\p{N}_-]{1,80})/gu;

  const seen = new Set<string>();
  const result: string[] = [];

  for (const match of content.matchAll(MENTION_PATTERN)) {
    const candidate = match[1];
    if (!candidate) continue;

    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(candidate);
  }

  return result;
}
