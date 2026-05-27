/**
 * login_info 빌트인 위젯 — SPEC-WIDGET-001 Slice C
 *
 * 인증 상태(isAuthenticated, nickname)를 props로 받아 로그인/로그아웃 UI를 렌더링한다.
 * packages/core는 Next.js 서버 API 의존성이 없으므로 auth 상태는 외부에서 주입된다.
 * 실제 auth() 호출은 apps/web의 렌더 파이프라인(renderBodyWithWidgets)이 담당한다.
 */
import React from 'react'
import { z } from 'zod'
import type { WidgetDefinition } from '../../types'

// 위젯 props 스키마
const loginInfoSchema = z.object({
  /** 프로필 이미지 표시 여부 */
  showProfileImage: z.boolean().default(false),
  /** 로그인 후 리다이렉트 경로 */
  redirectAfterLogin: z.string().default('/'),
  /** 인증 상태 — 렌더 파이프라인에서 ctx.user 기반으로 주입 */
  isAuthenticated: z.boolean().default(false),
  /** 닉네임 — 로그인 상태일 때 표시 */
  nickname: z.string().default(''),
})

type LoginInfoProps = z.infer<typeof loginInfoSchema>

/**
 * 로그인 정보 위젯 컴포넌트.
 *
 * - isAuthenticated=true: 닉네임과 로그아웃 링크 표시
 * - isAuthenticated=false: 로그인 링크 표시 (/login?redirect=redirectAfterLogin)
 */
function LoginInfoWidget({
  showProfileImage,
  redirectAfterLogin,
  isAuthenticated,
  nickname,
}: LoginInfoProps) {
  if (isAuthenticated) {
    return (
      <div data-widget="login_info" data-state="authenticated">
        {showProfileImage && (
          <span className="widget-profile-image" aria-hidden="true" />
        )}
        <span className="widget-nickname">{nickname}</span>
        <a href="/logout" className="widget-logout-link">
          로그아웃
        </a>
      </div>
    )
  }

  const loginHref = redirectAfterLogin
    ? `/login?redirect=${encodeURIComponent(redirectAfterLogin)}`
    : '/login'

  return (
    <div data-widget="login_info" data-state="unauthenticated">
      <a href={loginHref} className="widget-login-link">
        로그인
      </a>
    </div>
  )
}

// @MX:ANCHOR: [AUTO] loginInfoWidget — 빌트인 등록 배럴, 렌더 파이프라인에서 fan_in >= 3
// @MX:REASON: registerBuiltinWidgets, 렌더 파이프라인, 테스트에서 참조
export const loginInfoWidget: WidgetDefinition<LoginInfoProps> = {
  name: 'login_info',
  displayName: '로그인 정보',
  description: '로그인/로그아웃 상태에 따라 다른 UI를 표시한다.',
  category: '인증',
  propsSchema: loginInfoSchema,
  Component: LoginInfoWidget,
  defaultProps: {
    showProfileImage: false,
    redirectAfterLogin: '/',
    isAuthenticated: false,
    nickname: '',
  },
}
