/**
 * spamfilter guard — SPEC-ADMIN-002 REQ-ADMIN2-122.
 *
 * 공개 submission 경로(document/comment 생성)에서 호출되어
 * 스팸 필터링을 수행하고 위반 시 SpamGuardError를 발생.
 *
 * @MX:ANCHOR: [AUTO] 공개 submission 경로의 보안 불변식 — 스팸 차단.
 * @MX:REASON: 이 함수는 document/create, comment/create 진입점에서 호출되어
 *             금지어/IP 차단/속도제한 위반 시 Prisma 생성 이전에 차단함.
 *             fan_in >= 3 (document.create, comment.create, 향후 추가될 submission).
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-122
 */
import { checkSpamViolation, checkDeniedIp, checkRateLimit } from './spamfilter';

export class SpamGuardError extends Error {
  constructor(
    message: string,
    public code: 'DENIED_WORD' | 'DENIED_IP' | 'RATE_LIMIT',
    public details?: { matchedWord?: string; retryAfter?: number },
  ) {
    super(message);
    this.name = 'SpamGuardError';
  }
}

/**
 * checkSpamGuard — 스팸 필터 가드
 *
 * @param content - 검사할 내용
 * @param ip - 클라이언트 IP
 * @param userId - 사용자 ID
 * @param action - 액션 (예: 'document.create', 'comment.create')
 * @param prisma - Prisma client
 * @throws SpamGuardError - 스팸 위반 시
 */
export async function checkSpamGuard(
  content: string,
  ip: string,
  userId: number,
  action: string,
  prisma: any,
): Promise<void> {
  // 사이트 ID 확인
  const site = await prisma.site.findFirst({ orderBy: { id: 'asc' } });
  if (!site) {
    return; // 사이트가 없으면 필터링 스킵
  }

  const siteId = site.id;

  // 1. 금지어 검사
  const deniedWords = await prisma.spamDeniedWord.findMany({
    where: { siteId },
    select: { word: true },
  });

  const wordList = deniedWords.map((w: { word: string }) => w.word);
  const wordResult = await checkSpamViolation(content, wordList);

  if (wordResult.isSpam) {
    throw new SpamGuardError(
      `스팸 필터링됨: 금지어 포함 (${wordResult.matchedWord})`,
      'DENIED_WORD',
      { matchedWord: wordResult.matchedWord ?? undefined },
    );
  }

  // 2. 차단 IP 검사
  const deniedIps = await prisma.spamDeniedIp.findMany({
    where: { siteId },
    select: { ipPattern: true },
  });

  const ipList = deniedIps.map((ip: { ipPattern: string }) => ip.ipPattern);
  const isDeniedIp = await checkDeniedIp(ip, ipList);

  if (isDeniedIp) {
    throw new SpamGuardError(
      '스팸 필터링됨: 차단된 IP',
      'DENIED_IP',
    );
  }

  // 3. 속도 제한 검사
  const rateRule = await prisma.spamRule.findFirst({
    where: { siteId, actionType: action, enabled: true },
  });

  if (rateRule) {
    const rateResult = await checkRateLimit(
      userId,
      action,
      {
        maxSubmissions: rateRule.maxSubmissions,
        windowSeconds: rateRule.windowSeconds,
      },
      { prisma },
    );

    if (!rateResult.allowed) {
      throw new SpamGuardError(
        `스팸 필터링됨: 속도 제한 초과 (${rateResult.retryAfter}초 후 재시도)`,
        'RATE_LIMIT',
        { retryAfter: rateResult.retryAfter ?? undefined },
      );
    }
  }
}
