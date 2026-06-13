/**
 * PageBody.tsx — SPEC-PAGE-001 Slice B
 *
 * 페이지 본문을 렌더링하는 Server Component.
 * mcontent 가 없으면 빈 div 를 렌더링한다.
 *
 * @MX:NOTE [AUTO]: dangerouslySetInnerHTML 사용 전 sanitizePageBody 로 XSS 필터링 필수.
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-005
 */
import React from 'react'
import { sanitizePageBody } from '../service'

interface PageBodyProps {
  mcontent: string | null
}

/**
 * 페이지 본문 렌더러.
 * mcontent 가 null 이거나 빈 문자열이면 빈 플레이스홀더를 반환한다.
 */
export async function PageBody({ mcontent }: PageBodyProps): Promise<React.ReactElement> {
  // 빈 콘텐츠 처리
  if (!mcontent) {
    return (
      <div
        className="page-body"
        data-page-body="true"
        data-page-empty="true"
      />
    )
  }

  // XSS 필터링 후 HTML 삽입
  const sanitized = await sanitizePageBody(mcontent)

  return (
    <div
      className="page-body"
      data-page-body="true"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
