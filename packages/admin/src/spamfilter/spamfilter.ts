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

/**
 * checkRateLimit 가 사용하는 Prisma 최소 인터페이스.
 * content_rate_limits 테이블(ContentRateLimit 모델)을 sliding-window ledger 로 재사용한다.
 * packages/document/src/rate-limit.ts 와 동일한 패턴.
 */
interface PrismaWithRateLimit {
  contentRateLimit: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    findFirst(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, string>;
    }): Promise<{ createdAt: Date } | null>;
  };
}

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
 * checkRateLimit — 제출 속도 제한 확인 (DB 기반 sliding window)
 *
 * @param userId - 사용자 ID
 * @param action - 액션 (예: 'document.create', 'comment.create')
 * @param config - 속도 제한 설정
 * @param ctx - Prisma context
 * @returns 속도 제한 결과
 *
 * 구현: content_rate_limits 테이블(ContentRateLimit)을 ledger 로 재사용한다.
 * 이전 인메모리 Map 구현은 (1) 인스턴스 간 카운트가 공유되지 않아 멀티 인스턴스에서
 * fail-open 되고 (2) 키가 무한히 누적되어 메모리 누수가 발생하는 문제가 있었다.
 * DB 카운트로 대체하여 분산 환경에서도 정확하며 영속 ledger 의 만료 row 는 윈도우
 * 밖으로 자연히 제외된다.
 *
 * windowStart 이내의 (identifier, endpoint) row 수를 센 뒤, 임계 미만이면 허용하고
 * 시도 row 1개를 기록한다. 임계 이상이면 가장 오래된 row 기준으로 retryAfter 를 계산한다.
 *
 * @MX:NOTE [AUTO]: identifier 는 `${userId}` 문자열을 사용하며 endpoint 차원으로 action 을
 * 사용해 ContentRateLimit ledger 와 키 충돌 없이 공존한다.
 */
export async function checkRateLimit(
  userId: number,
  action: string,
  config: RateLimitConfig,
  ctx: { prisma: any; now?: () => Date },
): Promise<RateLimitResult> {
  const prisma = ctx.prisma as unknown as PrismaWithRateLimit;
  const identifier = String(userId);
  const now = ctx.now ? ctx.now() : new Date();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = new Date(now.getTime() - windowMs);

  const where = {
    identifier,
    endpoint: action,
    createdAt: { gt: windowStart },
  };

  const count = await prisma.contentRateLimit.count({ where });

  // 제한 초과 시 차단 — row 를 기록하지 않는다.
  if (count >= config.maxSubmissions) {
    const oldest = await prisma.contentRateLimit.findFirst({
      where,
      orderBy: { createdAt: 'asc' },
    });

    let retryAfter = config.windowSeconds;
    if (oldest?.createdAt) {
      const expireAt = new Date(oldest.createdAt.getTime() + windowMs);
      retryAfter = Math.max(0, Math.ceil((expireAt.getTime() - now.getTime()) / 1000));
    }
    return { allowed: false, retryAfter };
  }

  // 허용 — 시도 row 1개 기록.
  await prisma.contentRateLimit.create({
    data: {
      ip: '',
      identifier,
      endpoint: action,
    },
  });

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
