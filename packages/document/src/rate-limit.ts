/**
 * rate-limit.ts — SPEC-CONTENT-001 Slice E
 *
 * ContentRateLimit 기반 sliding window rate limiting.
 * LoginAttempt 패턴 (packages/auth/src/login.ts L120~141) 을 endpoint 차원 추가.
 *
 * @MX:ANCHOR [AUTO]: 모든 컨텐츠 write 경로의 rate limit gate.
 * @MX:REASON: document.create, comment.create, attachment.requestUpload 3개 이상 엔드포인트가
 *             이 함수를 호출. fan_in >= 3. SPEC: REQ-CONTENT-140.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-140, REQ-CONTENT-141
 */
import type { PrismaClient } from '@prisma/client';

export type ContentEndpoint = 'document.create' | 'comment.create' | 'attachment.upload';

export interface RateLimitConfig {
  authenticated: number;
  anonymous: number;
  windowMinutes: number;
}

/**
 * 기본 임계값 상수.
 * 환경변수로 오버라이드 가능.
 */
export const RATE_LIMITS: Record<ContentEndpoint, RateLimitConfig> = {
  'document.create': { authenticated: 30, anonymous: 5, windowMinutes: 60 },
  'comment.create': { authenticated: 200, anonymous: 20, windowMinutes: 60 },
  'attachment.upload': { authenticated: 50, anonymous: 0, windowMinutes: 60 },
};

/**
 * 환경변수 키 매핑
 */
const ENV_KEY_MAP: Record<ContentEndpoint, { auth: string; anon: string }> = {
  'document.create': {
    auth: 'CONTENT_RATE_LIMIT_DOCUMENT_AUTH',
    anon: 'CONTENT_RATE_LIMIT_DOCUMENT_ANON',
  },
  'comment.create': {
    auth: 'CONTENT_RATE_LIMIT_COMMENT_AUTH',
    anon: 'CONTENT_RATE_LIMIT_COMMENT_ANON',
  },
  'attachment.upload': {
    auth: 'CONTENT_RATE_LIMIT_ATTACHMENT_AUTH',
    anon: 'CONTENT_RATE_LIMIT_ATTACHMENT_ANON',
  },
};

export class RateLimitedError extends Error {
  readonly code = 'RATE_LIMITED' as const;
  constructor(
    public readonly endpoint: ContentEndpoint,
    public readonly retryAfterSeconds: number,
  ) {
    super(`Rate limit exceeded for ${endpoint}; retry after ${retryAfterSeconds}s`);
    this.name = 'RateLimitedError';
  }
}

/**
 * 환경변수 오버라이드를 적용한 임계값 결정.
 */
export function resolveLimit(
  endpoint: ContentEndpoint,
  isAuthenticated: boolean,
): { threshold: number; windowMinutes: number } {
  const defaults = RATE_LIMITS[endpoint];
  const envKeys = ENV_KEY_MAP[endpoint];
  const envKey = isAuthenticated ? envKeys.auth : envKeys.anon;
  const envVal = process.env[envKey];
  const threshold =
    envVal !== undefined && !isNaN(parseInt(envVal, 10))
      ? parseInt(envVal, 10)
      : isAuthenticated
        ? defaults.authenticated
        : defaults.anonymous;
  return { threshold, windowMinutes: defaults.windowMinutes };
}

/**
 * rate limit 검사 — 임계 초과 시 RateLimitedError throw.
 *
 * identifier 가 있으면 identifier 기준, 없으면 ip 기준 카운트.
 * (인증 사용자는 같은 사무실 IP 를 공유할 수 있으므로 IP 검사 생략)
 */
export async function checkRateLimit(
  input: { ip: string; identifier: string | null; endpoint: ContentEndpoint },
  ctx: { prisma: PrismaClient; now?: () => Date },
): Promise<void> {
  const { ip, identifier, endpoint } = input;
  const isAuthenticated = identifier !== null;
  const { threshold, windowMinutes } = resolveLimit(endpoint, isAuthenticated);
  const now = ctx.now ? ctx.now() : new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

  const whereClause = identifier
    ? { identifier, endpoint, createdAt: { gt: windowStart } }
    : { ip, endpoint, createdAt: { gt: windowStart } };

  const count = await (ctx.prisma as unknown as PrismaWithRateLimit).contentRateLimit.count({
    where: whereClause,
  });

  if (count >= threshold) {
    // 가장 오래된 row 의 createdAt 으로 retryAfter 계산
    const oldest = await (ctx.prisma as unknown as PrismaWithRateLimit).contentRateLimit.findFirst({
      where: identifier
        ? { identifier, endpoint, createdAt: { gt: windowStart } }
        : { ip, endpoint, createdAt: { gt: windowStart } },
      orderBy: { createdAt: 'asc' },
    });

    let retryAfterSeconds = windowMinutes * 60;
    if (oldest?.createdAt) {
      const expireAt = new Date(oldest.createdAt.getTime() + windowMinutes * 60 * 1000);
      retryAfterSeconds = Math.max(0, Math.ceil((expireAt.getTime() - now.getTime()) / 1000));
    }
    throw new RateLimitedError(endpoint, retryAfterSeconds);
  }
}

/**
 * 검사 통과 + 쓰기 성공 후 호출 — row 1개 추가.
 */
export async function recordAttempt(
  input: { ip: string; identifier: string | null; endpoint: ContentEndpoint },
  ctx: { prisma: PrismaClient },
): Promise<void> {
  await (ctx.prisma as unknown as PrismaWithRateLimit).contentRateLimit.create({
    data: {
      ip: input.ip,
      identifier: input.identifier,
      endpoint: input.endpoint,
    },
  });
}

// Prisma 확장 타입 (ContentRateLimit 모델 추가 후 생성된 타입을 참조)
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
