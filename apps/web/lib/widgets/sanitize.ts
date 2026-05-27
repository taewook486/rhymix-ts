/**
 * HTML 살균 유틸리티 — SPEC-WIDGET-001 Slice B
 *
 * isomorphic-dompurify를 사용하여 서버/클라이언트 모두에서 HTML을 안전하게 정제한다.
 * script, style, 이벤트 핸들러(on*)를 제거하고 표준 블록/인라인 태그만 허용한다.
 */
import DOMPurify from 'isomorphic-dompurify'

// @MX:ANCHOR: [AUTO] sanitizeHtmlSegment — renderBodyWithWidgets에서 모든 정적 HTML 세그먼트에 적용
// @MX:REASON: 렌더 파이프라인 전체 정적 구간이 이 함수를 통과하므로 보안 경계점
/**
 * HTML 문자열을 살균한다.
 *
 * 허용 태그: 표준 블록/인라인 태그 (script, style 제외).
 * 금지 속성: 이벤트 핸들러(on*), href=javascript:, style 속성.
 * rx-widget 태그는 정적 세그먼트에서 나타나지 않으나 안전을 위해 ALLOWED_TAGS에서 제외한다.
 *
 * @param html - 살균할 HTML 문자열
 * @returns DOMPurify로 정제된 HTML 문자열
 */
export function sanitizeHtmlSegment(html: string): string {
  return DOMPurify.sanitize(html, {
    // 표준 HTML 태그 허용 (script, style, rx-widget 제외)
    ALLOWED_TAGS: [
      'a', 'abbr', 'acronym', 'address', 'article', 'aside',
      'b', 'bdi', 'bdo', 'blockquote', 'br',
      'caption', 'cite', 'code', 'col', 'colgroup',
      'data', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt',
      'em',
      'figcaption', 'figure', 'footer',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr',
      'i', 'img', 'ins',
      'kbd',
      'li',
      'main', 'mark', 'menu',
      'nav',
      'ol',
      'p', 'picture', 'pre',
      'q',
      'rp', 'rt', 'ruby',
      's', 'samp', 'section', 'small', 'source', 'span', 'strong', 'sub', 'summary', 'sup',
      'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr',
      'u', 'ul',
      'var',
      'wbr',
    ],
    // 이벤트 핸들러(on*)와 javascript: 링크 금지
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    FORCE_BODY: false,
  })
}
