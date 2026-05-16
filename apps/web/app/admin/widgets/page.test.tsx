// @vitest-environment jsdom
/**
 * G-3: Admin 위젯 페이지 단위 테스트 — TDD RED 페이즈
 * SPEC-ADMIN-001 Slice G
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

describe('AdminWidgetsPage (Slice G-3)', () => {
  it('G-3-1: "위젯 시스템" 헤딩 렌더', async () => {
    const { default: Page } = await import('./page')
    const { getByText } = render(React.createElement(Page))
    expect(getByText('위젯 시스템')).toBeTruthy()
  })
})
