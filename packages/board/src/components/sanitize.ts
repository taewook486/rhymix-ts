/**
 * sanitize.ts — SPEC-EDITOR-001 REQ-EDITOR-004
 *
 * DOMPurify(isomorphic-dompurify) 기반 HTML 위생처리 유틸.
 * 에디터로 작성된 본문 HTML 을 화면에 출력하기 직전에 호출하여
 * <script>, 이벤트 핸들러(onclick 등), 위험한 data: URI 를 제거한다.
 *
 * - 서버(RSC)와 클라이언트 모두에서 동작 (isomorphic).
 * - ALLOWED_TAGS 화이트리스트 외 태그는 모두 제거된다.
 *
 * @MX:ANCHOR [AUTO]: 사용자 작성 HTML 의 단일 출력 위생처리 경계.
 * @MX:REASON: view-page 등 사용자 HTML 을 dangerouslySetInnerHTML 로 렌더하는 모든 지점이 이 함수를 경유해야 XSS 를 차단할 수 있다 (fan_in >= 2, 증가 예상).
 * @MX:SPEC: SPEC-EDITOR-001 REQ-EDITOR-004
 */
import DOMPurify from 'isomorphic-dompurify';

/**
 * 허용 태그 화이트리스트 — 에디터가 생성하는 서식 태그 집합.
 * 목록 외 태그(script, iframe, object 등)는 제거된다.
 */
const ALLOWED_TAGS = [
  'a', 'b', 'blockquote', 'br', 'caption', 'cite', 'code', 'col', 'colgroup',
  'dd', 'div', 'dl', 'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
  'i', 'img', 'li', 'mark', 'ol', 'p', 'pre', 'q', 's', 'small', 'span',
  'strike', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'tr', 'u', 'ul',
];

/**
 * 허용 속성 화이트리스트.
 * onclick 등 이벤트 핸들러는 목록에 없으므로 자동 제거된다.
 * (style 은 DOMPurify 가 내부적으로 CSS 위생처리하므로 색상/하이라이트 유지 목적상 허용)
 */
const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'target', 'rel',
  'colspan', 'rowspan', 'width', 'height', 'style', 'data-language',
];

/**
 * 사용자 작성 HTML 을 위생처리한다.
 *
 * @param dirty 위생처리 전 HTML 문자열
 * @returns XSS 위험 요소가 제거된 안전한 HTML 문자열
 */
export function sanitize(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // 외부 링크 새 창 등 정상 data 속성은 유지하되 위험 data: URI 는 기본 정책으로 차단됨
    ADD_ATTR: ['target'],
  });
}
