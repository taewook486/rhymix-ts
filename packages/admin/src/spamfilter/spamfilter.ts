/**
 * spamfilter domain logic — SPEC-ADMIN-002 Slice 2E.
 *
 * 스팸 필터 도메인 함수:
 * - checkSpamViolation: 금지어 검출
 * - checkRateLimit: 제출 속도 제한 확인
 * - checkDeniedIp: 차단 IP 확인
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-120~123
 */

// 스팸 필터 결과 타입
export type SpamFilterResult = {
  isSpam: boolean;
  matchedWord: string | null;
};

// 속도 제한 설정 타입
export type RateLimitConfig = {
  maxSubmissions: number; // N초당 M회
  windowSeconds: number;
};

// 속도 제한 결과 타입
export type RateLimitResult = {
  allowed: boolean;
  retryAfter: number | null; // 초 단위
};

// 인메모리 속도 제한 추적 (production에서는 DB로 대체 필요)
const rateLimitTrackers = new Map<string, { count: number; resetAt: number }>();

/**
 * checkSpamViolation — 금지어 검출
 *
 * @param content - 검사할 내용
 * @param deniedWords - 금지어 목록
 * @returns 스팸 필터 결과
 *
 * @MX:ANCHOR: [AUTO] 공개 submission 경로의 보안 불변식 — 금지어 필터링.
 * @MX:REASON: 이 함수는 document/comment 생성 전에 호출되어 스팸을 차단함.
 *             fan_in >= 3 (document.create, comment.create, 기타 submission).
 */
export async function checkSpamViolation(
  content: string,
  deniedWords: string[],
): Promise<SpamFilterResult> {
  const lowerContent = content.toLowerCase();

  for (const word of deniedWords) {
    const lowerWord = word.toLowerCase();
    if (lowerContent.includes(lowerWord)) {
      return {
        isSpam: true,
        matchedWord: word,
      };
    }
  }

  return {
    isSpam: false,
    matchedWord: null,
  };
}

/**
 * checkRateLimit — 제출 속도 제한 확인
 *
 * @param userId - 사용자 ID
 * @param action - 액션 (예: 'document.create', 'comment.create')
 * @param config - 속도 제한 설정
 * @param ctx - Prisma context
 * @returns 속도 제한 결과
 *
 * NOTE: 현재 인메모리 구현. production에서는 DB 기반 구현으로 변경 필요.
 */
export async function checkRateLimit(
  userId: number,
  action: string,
  config: RateLimitConfig,
  ctx: { prisma: any },
): Promise<RateLimitResult> {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let tracker = rateLimitTrackers.get(key);

  // 초기화 또는 윈도우 만료
  if (!tracker || now > tracker.resetAt) {
    tracker = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitTrackers.set(key, tracker);
    return { allowed: true, retryAfter: null };
  }

  // 카운트 증가
  tracker.count++;

  // 제한 초과 시 차단
  if (tracker.count > config.maxSubmissions) {
    const retryAfter = Math.ceil((tracker.resetAt - now) / 1000);
    return {
      allowed: false,
      retryAfter,
    };
  }

  return { allowed: true, retryAfter: null };
}

/**
 * checkDeniedIp — 차단 IP 확인
 *
 * @param ip - 확인할 IP 주소
 * @param deniedIps - 차단 IP 목록 (parsed)
 * @returns 차단 여부
 *
 * @MX:ANCHOR: [AUTO] 공개 submission 경로의 보안 불변식 — IP 차단 필터링.
 * @MX:REASON: 이 함수는 document/comment 생성 전에 호출되어 차단된 IP를 거부함.
 *             fan_in >= 3 (document.create, comment.create, 기타 submission).
 */
export async function checkDeniedIp(
  ip: string,
  deniedIps: string[],
): Promise<boolean> {
  const { parseIpFilter, matchesIpFilter } = await import('../logs/ip-filter');

  for (const deniedIp of deniedIps) {
    const parsed = parseIpFilter(deniedIp);
    if ('error' in parsed) {
      continue; // 잘못된 IP는 스킵
    }

    if (matchesIpFilter(ip, parsed)) {
      return true;
    }
  }

  return false;
}
