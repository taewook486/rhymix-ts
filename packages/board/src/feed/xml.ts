/**
 * xml.ts — SPEC-FEED-001 Slice A (T-003)
 *
 * RSS 2.0 / Atom 1.0 출력에서 사용자 입력(title, content, nickname, tags 등)을
 * 안전하게 XML 에 삽입하기 위한 헬퍼.
 *
 * @MX:SPEC: SPEC-FEED-001 REQ-FEED-017, REQ-FEED-063
 */

/**
 * 평문 XML 컨텍스트(엘리먼트 텍스트/속성값)에 삽입할 문자열을 엔티티 이스케이프한다.
 * `&` 를 가장 먼저 치환해야 다른 엔티티가 이중 이스케이프되지 않는다.
 */
export function escapeXml(value: string | null | undefined): string {
  if (value == null) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * HTML 본문을 CDATA 섹션으로 감싼다.
 *
 * CDATA 섹션은 `]]>` 시퀀스로 종료되므로, 본문에 동일한 시퀀스가 포함되면
 * 의도치 않게 CDATA 가 조기 종료되어 이후 내용이 평문 XML 로 해석되는 인젝션이
 * 발생할 수 있다. 이를 막기 위해 `]]>` 를 `]]]]><![CDATA[>` 로 분리-재결합한다:
 * 이렇게 하면 첫 CDATA 섹션이 `]]` 까지만 담고, 새 CDATA 섹션이 `>` 부터 이어받아
 * 전체적으로는 하나의 논리적 CDATA 처럼 파싱되면서도 종료 시퀀스가 노출되지 않는다.
 */
export function cdataWrap(value: string | null | undefined): string {
  const safe = value == null ? '' : value.replace(/]]>/g, ']]]]><![CDATA[>');
  return `<![CDATA[${safe}]]>`;
}
