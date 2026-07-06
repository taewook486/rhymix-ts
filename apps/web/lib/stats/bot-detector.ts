/**
 * Bot detection utilities for page view statistics (SPEC-STATS-001)
 *
 * REQ-STATS-001: 봇 User-Agent는 통계 수집에서 제외
 */

/**
 * Common bot user-agent patterns
 *
 * @MX:NOTE: [AUTO] botPatterns는 일반적인 검색엔진/크롤러 User-Agent를 포함
 * @MX:REASON: 정확한 봇 탐지를 위해 주요 검색엔진과 크롤러 패턴을 포함
 */
const botPatterns = [
  // Search engines
  /googlebot/i,
  /bingbot/i,
  /slurp/i, // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /naverbot/i,
  /daumoa/i,

  // Social media crawlers
  /twitterbot/i,
  /linkedinbot/i,
  /facebookexternalhit/i,
  /pinterest/i,
  /slackbot/i,
  /discordbot/i,

  // SEO tools and monitoring
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /screaming frog/i,
  /seocheck/i,

  // Generic bot patterns
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /go-http-client/i,
  /java/i,
  /node/i,
];

/**
 * Detect if user-agent is a bot
 *
 * @param userAgent - User-Agent header value
 * @returns true if the user-agent matches bot patterns
 *
 * @MX:ANCHOR: [AUTO] isBot — 모든 페이지 뷰 로깅에서 호출되는 핵심 봇 탐지 함수
 * @MX:REASON: 정확한 봇 탐지는 통계 데이터 무결성을 보장
 */
export function isBot(userAgent: string): boolean {
  if (!userAgent) {
    return false;
  }

  const lowerUA = userAgent.toLowerCase();
  return botPatterns.some((pattern) => pattern.test(lowerUA));
}

/**
 * Mobile device detection patterns
 */
const mobilePatterns = [
  /mobile/i,
  /android/i,
  /iphone/i,
  /ipad/i,
  /ipod/i,
  /blackberry/i,
  /windows phone/i,
  /webos/i,
];

/**
 * Detect if user-agent is mobile device
 *
 * @param userAgent - User-Agent header value
 * @returns true if the user-agent matches mobile patterns
 */
export function isMobile(userAgent: string): boolean {
  if (!userAgent) {
    return false;
  }

  const lowerUA = userAgent.toLowerCase();
  return mobilePatterns.some((pattern) => pattern.test(lowerUA));
}
