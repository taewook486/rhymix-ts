/**
 * rate-limit.test.ts — SPEC-CONTENT-001 Slice E
 *
 * R-1 ~ R-7: checkRateLimit, recordAttempt 도메인 함수 검증.
 *
 * REQ-CONTENT-140: per-IP rate limits with sliding window.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, recordAttempt, RateLimitedError, RATE_LIMITS, resolveLimit } from './rate-limit';

// ---------------------------------------------------------------------------
// Prisma mock 빌더
// ---------------------------------------------------------------------------

function makePrisma(countValue = 0) {
  return {
    contentRateLimit: {
      count: vi.fn().mockResolvedValue(countValue),
      create: vi.fn().mockResolvedValue({ id: BigInt(1) }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
}

describe('checkRateLimit + recordAttempt', () => {
  beforeEach(() => {
    // 환경변수 오버라이드 초기화
    delete process.env['CONTENT_RATE_LIMIT_DOCUMENT_AUTH'];
    delete process.env['CONTENT_RATE_LIMIT_DOCUMENT_ANON'];
    delete process.env['CONTENT_RATE_LIMIT_COMMENT_AUTH'];
    delete process.env['CONTENT_RATE_LIMIT_COMMENT_ANON'];
    delete process.env['CONTENT_RATE_LIMIT_ATTACHMENT_AUTH'];
  });

  // R-1: 미인증 + document.create 임계 미만 → 통과 + recordAttempt 호출 가능
  it('R-1: 미인증 임계 미만 → checkRateLimit 통과', async () => {
    const prisma = makePrisma(4); // anonymous limit=5, count=4 이면 통과
    await expect(
      checkRateLimit(
        { ip: '1.2.3.4', identifier: null, endpoint: 'document.create' },
        { prisma: prisma as never },
      ),
    ).resolves.not.toThrow();
  });

  // R-1: recordAttempt 정상 동작
  it('R-1: recordAttempt → contentRateLimit.create 호출', async () => {
    const prisma = makePrisma(0);
    await recordAttempt(
      { ip: '1.2.3.4', identifier: null, endpoint: 'document.create' },
      { prisma: prisma as never },
    );
    expect(prisma.contentRateLimit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ip: '1.2.3.4',
          endpoint: 'document.create',
        }),
      }),
    );
  });

  // R-2: 미인증 + 임계 초과 → RateLimitedError
  it('R-2: 미인증 임계 초과 → RateLimitedError', async () => {
    const prisma = makePrisma(5); // anonymous limit=5, count=5 → 차단
    await expect(
      checkRateLimit(
        { ip: '1.2.3.4', identifier: null, endpoint: 'document.create' },
        { prisma: prisma as never },
      ),
    ).rejects.toThrow(RateLimitedError);
  });

  it('R-2: RateLimitedError 에 endpoint + retryAfterSeconds 포함', async () => {
    const prisma = makePrisma(10);
    // findFirst 로 가장 오래된 row 반환 (retryAfter 계산)
    prisma.contentRateLimit.findFirst = vi.fn().mockResolvedValue({
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30분 전
    });

    try {
      await checkRateLimit(
        { ip: '1.2.3.4', identifier: null, endpoint: 'document.create' },
        { prisma: prisma as never },
      );
      expect.fail('RateLimitedError 가 발생해야 합니다');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitedError);
      const e = err as RateLimitedError;
      expect(e.endpoint).toBe('document.create');
      expect(e.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  // R-3: 인증 사용자 → IP 와 별개로 authenticated limit 사용
  it('R-3: 인증 사용자 → authenticated 임계 30건 적용 (IP quota 무관)', async () => {
    // count=5 여도 authenticated limit=30 이므로 통과
    const prisma = makePrisma(5);
    await expect(
      checkRateLimit(
        { ip: '1.2.3.4', identifier: '42', endpoint: 'document.create' },
        { prisma: prisma as never },
      ),
    ).resolves.not.toThrow();

    // identifier 기준으로 count 쿼리가 호출되어야 함
    expect(prisma.contentRateLimit.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          identifier: '42',
        }),
      }),
    );
  });

  it('R-3: 인증 사용자 임계 초과 → RateLimitedError', async () => {
    const prisma = makePrisma(30); // authenticated limit=30, count=30 → 차단
    await expect(
      checkRateLimit(
        { ip: '1.2.3.4', identifier: '42', endpoint: 'document.create' },
        { prisma: prisma as never },
      ),
    ).rejects.toThrow(RateLimitedError);
  });

  // R-4: Sliding window — window 내 카운트만 포함
  it('R-4: sliding window — countRateLimit 쿼리에 createdAt 범위 조건 포함', async () => {
    const prisma = makePrisma(0);
    const now = new Date();
    await checkRateLimit(
      { ip: '1.2.3.4', identifier: null, endpoint: 'document.create' },
      { prisma: prisma as never, now: () => now },
    );

    expect(prisma.contentRateLimit.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({ gt: expect.any(Date) }),
        }),
      }),
    );
  });

  // R-5: endpoint 별 별도 카운트
  it('R-5: endpoint 별 별도 카운트 — document.create 와 comment.create 는 독립', async () => {
    const prisma = makePrisma(4); // document.create = 4 < 5 → 통과
    await expect(
      checkRateLimit(
        { ip: '1.2.3.4', identifier: null, endpoint: 'document.create' },
        { prisma: prisma as never },
      ),
    ).resolves.not.toThrow();

    // comment.create 도 같은 prisma count (4 < 20) → 통과
    await expect(
      checkRateLimit(
        { ip: '1.2.3.4', identifier: null, endpoint: 'comment.create' },
        { prisma: prisma as never },
      ),
    ).resolves.not.toThrow();

    // endpoint 조건이 각각 전달됨을 검증
    const calls = prisma.contentRateLimit.count.mock.calls;
    expect(calls[0]?.[0]).toMatchObject({ where: { endpoint: 'document.create' } });
    expect(calls[1]?.[0]).toMatchObject({ where: { endpoint: 'comment.create' } });
  });

  // R-6: 환경변수 오버라이드
  it('R-6: CONTENT_RATE_LIMIT_DOCUMENT_AUTH=2 → 인증 사용자 3번째 호출 차단', async () => {
    process.env['CONTENT_RATE_LIMIT_DOCUMENT_AUTH'] = '2';
    const prisma = makePrisma(2); // count=2, overridden limit=2 → 차단
    await expect(
      checkRateLimit(
        { ip: '1.2.3.4', identifier: '99', endpoint: 'document.create' },
        { prisma: prisma as never },
      ),
    ).rejects.toThrow(RateLimitedError);
  });

  // R-7: attachment.upload 미인증 anonymous=0 → 즉시 차단
  it('R-7: attachment.upload 미인증 anonymous=0 → 0건이라도 차단 (count>=0)', async () => {
    const prisma = makePrisma(0);
    await expect(
      checkRateLimit(
        { ip: '1.2.3.4', identifier: null, endpoint: 'attachment.upload' },
        { prisma: prisma as never },
      ),
    ).rejects.toThrow(RateLimitedError);
  });
});

describe('RATE_LIMITS 상수', () => {
  it('document.create 임계값 확인', () => {
    expect(RATE_LIMITS['document.create'].authenticated).toBe(30);
    expect(RATE_LIMITS['document.create'].anonymous).toBe(5);
    expect(RATE_LIMITS['document.create'].windowMinutes).toBe(60);
  });

  it('comment.create 임계값 확인', () => {
    expect(RATE_LIMITS['comment.create'].authenticated).toBe(200);
    expect(RATE_LIMITS['comment.create'].anonymous).toBe(20);
  });

  it('attachment.upload 임계값 확인', () => {
    expect(RATE_LIMITS['attachment.upload'].authenticated).toBe(50);
    expect(RATE_LIMITS['attachment.upload'].anonymous).toBe(0);
  });
});

describe('resolveLimit', () => {
  it('환경변수 없으면 RATE_LIMITS 상수 사용', () => {
    delete process.env['CONTENT_RATE_LIMIT_DOCUMENT_AUTH'];
    const { threshold } = resolveLimit('document.create', true);
    expect(threshold).toBe(30);
  });

  it('환경변수로 오버라이드', () => {
    process.env['CONTENT_RATE_LIMIT_DOCUMENT_AUTH'] = '15';
    const { threshold } = resolveLimit('document.create', true);
    expect(threshold).toBe(15);
    delete process.env['CONTENT_RATE_LIMIT_DOCUMENT_AUTH'];
  });
});
