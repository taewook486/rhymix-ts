/**
 * Helper Utility Tests
 */

import { cn } from '@/lib/utils'

describe('cn (className utility)', () => {
  it('should merge class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle Tailwind class conflicts', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('should handle conditional classes', () => {
    expect(cn('base-class', true && 'active', false && 'inactive')).toBe(
      'base-class active'
    )
  })

  it('should handle undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })

  it('should handle empty strings', () => {
    expect(cn('base', '', 'end')).toBe('base end')
  })

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('should handle objects with boolean values', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('should combine all input types', () => {
    const result = cn(
      'base',
      ['extra', 'more'],
      { conditional: true, ignored: false },
      undefined,
      'final'
    )
    expect(result).toBe('base extra more conditional final')
  })
})
