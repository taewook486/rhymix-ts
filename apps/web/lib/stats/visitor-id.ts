/**
 * Visitor ID generation for page view statistics (SPEC-STATS-001)
 *
 * REQ-STATS-001: 세션 기반 해시를 사용하여 UV(Unique Visitor) 중복 제거
 *
 * @MX:NOTE: [AUTO] visitorId는 방문자를 식별하기 위한 해시값
 * @MX:REASON: 일일 방문자 수(UV)를 정확하게 집계하기 위해 세션/쿠키 기반 식별자 사용
 */

import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';

/**
 * Visitor ID cookie name
 */
const VISITOR_COOKIE_NAME = 'rhymix_visitor_id';
const VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Generate or retrieve visitor ID from session/cookie
 *
 * Strategy:
 * 1. Check existing visitor_id cookie
 * 2. If not exists, generate new ID from IP + User-Agent + timestamp
 * 3. Store in cookie for 1 year
 *
 * @param ip - Client IP address
 * @param userAgent - User-Agent string
 * @returns Visitor ID hash
 *
 * @MX:ANCHOR: [AUTO] getVisitorId — UV 중복 제거를 위한 핵심 visitor ID 생성 함수
 * @MX:REASON: 일일 순방문자 수(UV) 집계의 정확성을 보장
 */
export async function getVisitorId(
  ip: string,
  userAgent: string,
): Promise<string> {
  const cookieStore = await cookies();

  // 기존 visitor ID 쿠키 확인
  const existingVisitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
  if (existingVisitorId) {
    return existingVisitorId;
  }

  // 새 visitor ID 생성: IP + User-Agent + timestamp + random salt
  const timestamp = Date.now();
  const salt = Math.random().toString(36);
  const rawId = `${ip}:${userAgent}:${timestamp}:${salt}`;

  // SHA-256 해싱
  const visitorId = createHash('sha256').update(rawId).digest('hex').substring(0, 32);

  // 쿠키 설정 (1년 유효)
  cookieStore.set(VISITOR_COOKIE_NAME, visitorId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: '/',
  });

  return visitorId;
}

/**
 * Extract client IP from request headers
 *
 * @param headers - Request headers
 * @returns Client IP address
 */
export function extractClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0]?.trim() || '0.0.0.0';
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  return '0.0.0.0';
}

/**
 * Next.js proxy(middleware) 컨텍스트에서 visitor ID를 결정론적으로 도출한다.
 *
 * proxy.ts는 Server Component가 아니므로 next/headers의 cookies()를 사용할 수 없다.
 * 대신 request 객체에서 직접 쿠키/헤더를 읽어 해시한다.
 *
 * 우선순위:
 *  1. visitor_id 쿠키 (기존 방문자 식별용)
 *  2. session 쿠키 (로그인 세션 기반 UV 중복 제거)
 *  3. IP + User-Agent (미인증 방문자 fallback)
 *
 * @param request - Next.js proxy 요청 객체
 * @returns visitor ID 해시 (32 hex chars)
 *
 * @MX:ANCHOR: [AUTO] getVisitorIdFromRequest — 모든 페이지 뷰 로깅의 UV 식별 진입점 (proxy 컨텍스트)
 * @MX:REASON: next/headers cookies()는 proxy에서 동작하지 않으므로 request 기반 별도 함수 필요. 동일 입력에 대해 동일 해시를 반환해야 UV 중복 제거가 가능하다.
 */
export function getVisitorIdFromRequest(request: NextRequest): string {
  // 1. 전용 visitor_id 쿠키
  const visitorCookie = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
  if (visitorCookie) {
    return visitorCookie;
  }

  // 2. 세션 쿠키 기반 해시 (동일 세션 = 동일 visitorId)
  const sessionCookie = request.cookies.get('session')?.value;
  if (sessionCookie) {
    return createHash('sha256')
      .update(sessionCookie)
      .digest('hex')
      .substring(0, 32);
  }

  // 3. IP + User-Agent fallback
  const ip = extractClientIp(request.headers);
  const ua = request.headers.get('user-agent') ?? '';
  return createHash('sha256')
    .update(`${ip}:${ua}`)
    .digest('hex')
    .substring(0, 32);
}
