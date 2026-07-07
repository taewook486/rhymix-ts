/**
 * Page view logger for statistics collection (SPEC-STATS-001 REQ-STATS-001)
 *
 * REQ-STATS-001: Next.js middleware에서 모든 페이지 요청을 인터셉트하여 저장
 * - date, hour, path, visitorId, isMobile 수집
 * - /api/*, /admin/* 경로는 제외
 * - 봇 User-Agent는 제외
 *
 * @MX:NOTE: [AUTO] logPageView는 비동기 함수이지만 호출자는 await하지 않음
 * @MX:REASON: middleware 성능 저하 방지를 위해 파이어 앤 포겟 패턴 사용
 */

import { prisma } from '@/lib/db/prisma';
import { isBot, isMobile } from './bot-detector';

/**
 * Page view logging data
 */
export interface PageViewLog {
  date: Date;
  hour: number;
  path: string;
  visitorId: string;
  isMobile: boolean;
}

/**
 * Log page view asynchronously
 *
 * This function performs async database operations to log page views.
 * It uses fire-and-forget pattern to avoid blocking the middleware.
 *
 * @param logData - Page view logging data
 *
 * @MX:ANCHOR: [AUTO] logPageView — 모든 페이지 뷰 로깅의 진입점
 * @MX:REASON: 비동기 로깅을 통해 미들웨어 성능 저하 방지
 */
export async function logPageView(logData: PageViewLog): Promise<void> {
  try {
    await prisma.pageView.create({
      data: {
        date: logData.date,
        hour: logData.hour,
        path: logData.path,
        visitorId: logData.visitorId,
        isMobile: logData.isMobile,
      },
    });
  } catch (error) {
    // Silently fail to avoid breaking user experience
    // In production, this should be logged to error tracking service
    console.error('[stats] Failed to log page view:', error);
  }
}

/**
 * Check if path should be excluded from logging
 *
 * @param pathname - Request pathname
 * @returns true if path should be excluded
 */
export function shouldExcludePath(pathname: string): boolean {
  // Exclude API routes
  if (pathname.startsWith('/api/')) {
    return true;
  }

  // Exclude admin routes (they have their own analytics)
  if (pathname.startsWith('/admin')) {
    return true;
  }

  // Exclude install routes
  if (pathname.startsWith('/install')) {
    return true;
  }

  return false;
}

/**
 * Check if request should be logged based on user-agent
 *
 * @param userAgent - User-Agent header value
 * @returns true if request should be logged (not a bot)
 */
export function shouldLogRequest(userAgent: string): boolean {
  // Exclude bots
  return !isBot(userAgent);
}

/**
 * Extract current date and hour for logging
 *
 * @returns date and hour in UTC
 */
export function getCurrentDateTime(): { date: Date; hour: number } {
  // Date.now()를 명시적으로 호출하여 테스트에서 vi.spyOn(Date, 'now')로 시간 제어 가능.
  // new Date()는 V8 내부에서 Date.now()를 거치지 않아 mock이 적용되지 않는다.
  const now = new Date(Date.now());
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const hour = now.getUTCHours();

  return { date, hour };
}
