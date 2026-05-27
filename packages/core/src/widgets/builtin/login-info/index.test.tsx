// @vitest-environment jsdom
/**
 * login_info 빌트인 위젯 테스트 — SPEC-WIDGET-001 Slice C
 */
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { resetWidgetRegistry } from '../../registry'
import { validateWidgetProps } from '../../validate'
import { loginInfoWidget } from './index'

// 컴포넌트 편의 렌더 헬퍼
function renderLoginInfo(props: Record<string, unknown>) {
  const Component = loginInfoWidget.Component as React.ComponentType<Record<string, unknown>>
  return render(React.createElement(Component, props))
}

describe('login_info 위젯 — Slice C', () => {
  beforeEach(() => {
    resetWidgetRegistry()
  })

  it('C-LOGIN-1: isAuthenticated=false → 로그인 링크 표시', () => {
    const { container } = renderLoginInfo({
      isAuthenticated: false,
      nickname: '',
      showProfileImage: false,
      redirectAfterLogin: '/',
    })
    const link = container.querySelector('.widget-login-link')
    expect(link).not.toBeNull()
    expect(link?.textContent).toContain('로그인')
  })

  it('C-LOGIN-2: isAuthenticated=true, nickname="홍길동" → 닉네임과 로그아웃 링크 표시', () => {
    const { container } = renderLoginInfo({
      isAuthenticated: true,
      nickname: '홍길동',
      showProfileImage: false,
      redirectAfterLogin: '/',
    })
    const nickname = container.querySelector('.widget-nickname')
    const logoutLink = container.querySelector('.widget-logout-link')
    expect(nickname?.textContent).toBe('홍길동')
    expect(logoutLink).not.toBeNull()
  })

  it('C-LOGIN-3: defaultProps로 기본값 검증 성공', () => {
    const result = validateWidgetProps(loginInfoWidget, {})
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.props.showProfileImage).toBe(false)
      expect(result.props.redirectAfterLogin).toBe('/')
      expect(result.props.isAuthenticated).toBe(false)
      expect(result.props.nickname).toBe('')
    }
  })

  it('C-LOGIN-4: isAuthenticated=false + redirectAfterLogin="/board" → 리다이렉트 경로 포함', () => {
    const { container } = renderLoginInfo({
      isAuthenticated: false,
      nickname: '',
      showProfileImage: false,
      redirectAfterLogin: '/board',
    })
    const link = container.querySelector('.widget-login-link') as HTMLAnchorElement | null
    expect(link?.href).toContain('%2Fboard')
  })

  it('C-LOGIN-5: showProfileImage=true + 인증됨 → 프로필 이미지 요소 표시', () => {
    const { container } = renderLoginInfo({
      isAuthenticated: true,
      nickname: '테스터',
      showProfileImage: true,
      redirectAfterLogin: '/',
    })
    const profileEl = container.querySelector('.widget-profile-image')
    expect(profileEl).not.toBeNull()
  })

  it('C-LOGIN-6: propsSchema — isAuthenticated가 boolean 타입 검증', () => {
    const result = validateWidgetProps(loginInfoWidget, { isAuthenticated: 'yes' })
    // boolean이 아닌 string → 검증 실패
    expect(result.ok).toBe(false)
  })

  it('C-LOGIN-7: 위젯 name이 "login_info"', () => {
    expect(loginInfoWidget.name).toBe('login_info')
  })
})
