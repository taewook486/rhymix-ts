/**
 * RSS escapeXml utility tests
 */

import { escapeXml } from '@/lib/utils/rss'

describe('escapeXml', () => {
  it('should escape ampersands', () => {
    expect(escapeXml('AT&T')).toBe('AT&amp;T')
    expect(escapeXml('&&&')).toBe('&amp;&amp;&amp;')
  })

  it('should escape less than signs', () => {
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;')
    expect(escapeXml('1 < 2')).toBe('1 &lt; 2')
  })

  it('should escape greater than signs', () => {
    expect(escapeXml('>')).toBe('&gt;')
    expect(escapeXml('2 > 1')).toBe('2 &gt; 1')
  })

  it('should escape double quotes', () => {
    expect(escapeXml('"hello"')).toBe('&quot;hello&quot;')
    expect(escapeXml('""')).toBe('&quot;&quot;')
  })

  it('should escape single quotes', () => {
    expect(escapeXml("'hello'")).toBe('&apos;hello&apos;')
    expect(escapeXml("''")).toBe('&apos;&apos;')
  })

  it('should escape mixed special characters', () => {
    expect(escapeXml('<div class="test">&nbsp;</div>')).toBe(
      '&lt;div class=&quot;test&quot;&gt;&amp;nbsp;&lt;/div&gt;'
    )
  })

  it('should handle empty strings', () => {
    expect(escapeXml('')).toBe('')
  })

  it('should handle strings without special characters', () => {
    expect(escapeXml('hello world')).toBe('hello world')
  })

  it('should handle Unicode characters', () => {
    expect(escapeXml('한글')).toBe('한글')
    expect(escapeXml('🎉')).toBe('🎉')
  })
})
