/**
 * xml.test.ts — SPEC-FEED-001 Slice A (T-003)
 *
 * XML 안전 헬퍼 검증 — escapeXml / cdataWrap. REQ-FEED-017, 063.
 */
import { describe, it, expect } from 'vitest';
import { escapeXml, cdataWrap } from '../xml.js';

describe('escapeXml (SPEC-FEED-001 T-003)', () => {
  it('XML-1: &, <, >, ", \' 를 엔티티로 치환한다', () => {
    expect(escapeXml('&')).toBe('&amp;');
    expect(escapeXml('<')).toBe('&lt;');
    expect(escapeXml('>')).toBe('&gt;');
    expect(escapeXml('"')).toBe('&quot;');
    expect(escapeXml("'")).toBe('&apos;');
  });

  it('XML-2: 여러 특수문자가 섞인 문자열을 한 번에 이스케이프한다', () => {
    expect(escapeXml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  it('XML-3: 특수문자가 없는 평문은 그대로 반환한다', () => {
    expect(escapeXml('일반 텍스트 hello 123')).toBe('일반 텍스트 hello 123');
  });

  it('XML-4: null/undefined 입력은 빈 문자열을 반환한다', () => {
    expect(escapeXml(null)).toBe('');
    expect(escapeXml(undefined)).toBe('');
  });

  it('XML-5: & 가 먼저 치환되어 이중 이스케이프가 발생하지 않는다', () => {
    // "&lt;" 를 escapeXml 에 통과시켰을 때 "&amp;lt;" 가 되어야 한다(원본 텍스트로 취급).
    expect(escapeXml('&lt;')).toBe('&amp;lt;');
  });
});

describe('cdataWrap (SPEC-FEED-001 T-003)', () => {
  it('CDATA-1: 일반 HTML 문자열을 CDATA 섹션으로 감싼다', () => {
    const result = cdataWrap('<p>hello</p>');
    expect(result).toBe('<![CDATA[<p>hello</p>]]>');
  });

  it('CDATA-2: 본문에 ]]> 시퀀스가 있으면 CDATA 종료를 방어한다 (injection 케이스)', () => {
    const malicious = 'before ]]> <script>alert(1)</script> after';
    const result = cdataWrap(malicious);

    // 1) 전체가 <![CDATA[ 로 시작하고 ]]> 로 끝난다.
    expect(result.startsWith('<![CDATA[')).toBe(true);
    expect(result.endsWith(']]>')).toBe(true);

    // 2) 원본의 ']]>' 시퀀스는 split-rejoin 기법(']]>' -> ']]]]><![CDATA[>')으로
    //    안전하게 변환되어, "의도치 않은 조기 종료"가 발생하지 않는다.
    //    재결합된 구조를 검증: 원본의 모든 ']]>' 위치가 ']]]]><![CDATA[>' 로 대체되어 있다.
    const expectedInner = malicious.replace(/]]>/g, ']]]]><![CDATA[>');
    expect(result).toBe(`<![CDATA[${expectedInner}]]>`);

    // 3) 그럼에도 의미상 내용은 보존된다(스크립트 텍스트 자체는 남아있음 - CDATA 라서 이스케이프 불필요).
    expect(result).toContain('script');
  });

  it('CDATA-3: 빈 문자열은 빈 CDATA 섹션을 반환한다', () => {
    expect(cdataWrap('')).toBe('<![CDATA[]]>');
  });

  it('CDATA-4: null/undefined 입력은 빈 CDATA 섹션을 반환한다', () => {
    expect(cdataWrap(null)).toBe('<![CDATA[]]>');
    expect(cdataWrap(undefined)).toBe('<![CDATA[]]>');
  });

  it('CDATA-5: 여러 개의 ]]> 시퀀스가 있어도 안전하게 처리된다', () => {
    const malicious = ']]>]]>]]>';
    const result = cdataWrap(malicious);
    const expectedInner = malicious.replace(/]]>/g, ']]]]><![CDATA[>');
    expect(result).toBe(`<![CDATA[${expectedInner}]]>`);
  });
});
