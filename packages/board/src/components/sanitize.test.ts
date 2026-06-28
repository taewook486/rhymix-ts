/**
 * sanitize.test.ts — SPEC-EDITOR-001 REQ-EDITOR-004
 *
 * DOMPurify 기반 HTML 위생처리(sanitize) 유틸 검증.
 * isomorphic-dompurify 는 node 환경에서도 jsdom 을 내장하므로 mock 없이 직접 사용한다.
 *
 * @MX:SPEC: SPEC-EDITOR-001 REQ-EDITOR-004
 */
import { describe, it, expect } from 'vitest';
import { sanitize } from './sanitize';

describe('sanitize (SPEC-EDITOR-001 REQ-EDITOR-004)', () => {
  // SAN-1: <script> 태그는 완전히 제거된다 (AC-EDITOR-004)
  it('SAN-1: removes <script> tags entirely', () => {
    const out = sanitize('<script>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
  });

  // SAN-2: 이벤트 핸들러 속성(onclick 등)은 제거되고 본문은 보존된다
  it('SAN-2: strips event-handler attributes but keeps text', () => {
    const out = sanitize('<p onclick="evil()">text</p>');
    expect(out).toContain('text');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('evil');
  });

  // SAN-3: data:text/html 류 위험한 data URI 는 제거된다
  it('SAN-3: removes dangerous data: URIs', () => {
    const out = sanitize('<img src="data:text/html,<script>evil()</script>">');
    expect(out).not.toContain('data:text/html');
    expect(out).not.toContain('<script');
  });

  // SAN-4: 안전한 서식 태그(strong/em 등)는 그대로 보존된다
  it('SAN-4: preserves safe formatting tags', () => {
    const out = sanitize('<p><strong>bold</strong></p>');
    expect(out).toContain('<strong>bold</strong>');
  });

  // SAN-5: 안전한 링크는 href 를 유지한다
  it('SAN-5: keeps href on safe anchor links', () => {
    const out = sanitize('<a href="https://example.com">link</a>');
    expect(out).toContain('href="https://example.com"');
  });
});
