/**
 * SPEC-SPAM-001: 스팸 필터 서비스
 *
 * @MX:SPEC: SPEC-SPAM-001 REQ-SPAM-001~007
 * @MX:ANCHOR: [AUTO] 핵심 스팸 필터 로직 - 여러 곳에서 호출됨
 * @MX:REASON: 공개 API로서 문서/댓글 작성 시점에 호출됨
 */

import { createHash } from 'crypto';
import type { PrismaClient, Prisma } from '@prisma/client';
import { SpamCheckResult } from '../types';
import type {
  SpamCheckInput,
  SpamCheckResultDetail,
  SpamFilterConfig,
  ExtractedUrl,
} from '../types';

/**
 * 스팸 필터 서비스
 *
 * 금지어, URL 블랙리스트, 중복 콘텐츠, 신고 임계치, Akismet 등을 검사
 */
export class SpamFilter {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 스팸 검사 수행
   *
   * @MX:ANCHOR: [AUTO] 메인 진입점 - 여러 호출자가 사용
   * @MX:REASON: 공개 API로서 tRPC 라우터에서 호출됨
   */
  async check(input: SpamCheckInput, config: SpamFilterConfig): Promise<SpamCheckResultDetail> {
    // 1. 금지어 검사 (REQ-SPAM-001)
    if (config.forbiddenWordsEnabled) {
      const forbiddenResult = await this.checkForbiddenWords(input.siteId, input.content, input.title);
      if (forbiddenResult.isSpam) {
        return forbiddenResult;
      }
    }

    // 2. URL 블랙리스트 검사 (REQ-SPAM-002)
    if (config.urlBlacklistEnabled) {
      const urlResult = await this.checkBlacklistUrls(input.siteId, input.content);
      if (urlResult.isSpam) {
        return urlResult;
      }
    }

    // 3. 중복 콘텐츠 검사 (REQ-SPAM-004)
    if (config.duplicateContentEnabled && input.authorId) {
      const duplicateResult = await this.checkDuplicateContent(
        input.siteId,
        input.type,
        input.authorId,
        input.content,
        config.duplicateContentWindowMinutes,
      );
      if (duplicateResult.isSpam) {
        return duplicateResult;
      }
    }

    // 4. Akismet 검사 (REQ-SPAM-007) - 선택사항
    if (config.akismetEnabled && config.akismetApiKey && config.akismetSiteUrl) {
      // TODO: Akismet API 호출 구현 (추가 필요)
      // akismetResult = await this.checkAkismet(...)
    }

    // 모든 검사 통과
    return {
      result: SpamCheckResult.CLEAN,
      isSpam: false,
    };
  }

  /**
   * 금지어 검사 (REQ-SPAM-001)
   *
   * @MX:NOTE: [AUTO] 제목과 내용을 모두 검사하여 금지어 포함 여부 확인
   */
  private async checkForbiddenWords(
    siteId: number,
    content: string,
    title?: string,
  ): Promise<SpamCheckResultDetail> {
    const words = await this.prisma.spamDeniedWord.findMany({
      where: { siteId },
      select: { word: true },
    });

    const combinedText = `${title || ''} ${content}`.toLowerCase();

    for (const { word } of words) {
      if (combinedText.includes(word.toLowerCase())) {
        return {
          result: SpamCheckResult.FORBIDDEN_WORD,
          isSpam: true,
          reason: '금지된 단어가 포함되어 있습니다',
          metadata: { matchedWord: word },
        };
      }
    }

    return { result: SpamCheckResult.CLEAN, isSpam: false };
  }

  /**
   * URL 블랙리스트 검사 (REQ-SPAM-002)
   *
   * @MX:NOTE: [AUTO] 콘텐츠에서 URL 추출 후 블랙리스트와 비교
   */
  private async checkBlacklistUrls(siteId: number, content: string): Promise<SpamCheckResultDetail> {
    const urls = this.extractUrls(content);
    if (urls.length === 0) {
      return { result: SpamCheckResult.CLEAN, isSpam: false };
    }

    const blacklist = await this.prisma.spamUrlBlacklist.findMany({
      where: { siteId },
      select: { domain: true, isRegex: true },
    });

    for (const url of urls) {
      for (const { domain, isRegex } of blacklist) {
        const isMatch = isRegex
          ? new RegExp(domain, 'i').test(url.domain)
          : url.domain === domain || url.domain.endsWith(`.${domain}`);

        if (isMatch) {
          return {
            result: SpamCheckResult.BLACKLIST_URL,
            isSpam: true,
            reason: '차단된 도메인이 포함된 URL이 있습니다',
            metadata: { matchedDomain: domain },
          };
        }
      }
    }

    return { result: SpamCheckResult.CLEAN, isSpam: false };
  }

  /**
   * 중복 콘텐츠 검사 (REQ-SPAM-004)
   *
   * @MX:NOTE: [AUTO] SHA256 해시 기반 중복 검사 - 시간 윈도우 내 동일 콘텐츠 차단
   */
  private async checkDuplicateContent(
    siteId: number,
    type: 'document' | 'comment',
    authorId: number,
    content: string,
    windowMinutes: number,
  ): Promise<SpamCheckResultDetail> {
    const contentHash = this.hashContent(content);
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    if (type === 'document') {
      const existing = await this.prisma.document.findFirst({
        where: {
          authorId,
          regdate: { gte: windowStart },
          deletedAt: null,
        },
        select: { id: true, content: true },
      });

      if (existing) {
        const existingHash = this.hashContent(existing.content);
        if (existingHash === contentHash) {
          return {
            result: SpamCheckResult.DUPLICATE_CONTENT,
            isSpam: true,
            reason: '동일한 내용을 연속으로 게시할 수 없습니다',
            metadata: { contentHash },
          };
        }
      }
    } else {
      const existing = await this.prisma.comment.findFirst({
        where: {
          authorId,
          regdate: { gte: windowStart },
          deletedAt: null,
        },
        select: { id: true, content: true },
      });

      if (existing) {
        const existingHash = this.hashContent(existing.content);
        if (existingHash === contentHash) {
          return {
            result: SpamCheckResult.DUPLICATE_CONTENT,
            isSpam: true,
            reason: '동일한 내용을 연속으로 게시할 수 없습니다',
            metadata: { contentHash },
          };
        }
      }
    }

    return { result: SpamCheckResult.CLEAN, isSpam: false };
  }

  /**
   * 신고 임계치 검사 (REQ-SPAM-003)
   *
   * @MX:NOTE: [AUTO] 신고 수가 임계치 초과 시 자동 숨김 처리
   */
  async checkReportThreshold(
    type: 'document' | 'comment',
    contentId: number,
    threshold: number,
  ): Promise<boolean> {
    if (type === 'document') {
      const reportCount = await this.prisma.documentReport.count({
        where: { documentId: contentId, resolved: false },
      });
      return reportCount > threshold;
    } else {
      const reportCount = await this.prisma.commentReport.count({
        where: { commentId: contentId },
      });
      return reportCount > threshold;
    }
  }

  /**
   * 스팸 검토 큐에 추가 (REQ-SPAM-005)
   *
   * @MX:NOTE: [AUTO] 스팸 의심 콘텐츠를 관리자 검토 큐에 등록
   */
  async addToReviewQueue(
    siteId: number,
    type: 'document' | 'comment',
    contentId: number,
    reason: SpamCheckResult,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.spamReviewQueue.create({
      data: {
        siteId,
        type,
        contentId,
        reason,
        status: 'pending',
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /**
   * 콘텐츠에서 URL 추출 (정규식 기반)
   *
   * @MX:NOTE: [AUTO] http/https URL 패턴 추출 - 텍스트 분석
   */
  private extractUrls(content: string): ExtractedUrl[] {
    const results: ExtractedUrl[] = [];

    const urlPattern = /https?:\/\/(?:[-\w.]|(?:%[0-9a-fA-F]{2}))+(?:\/[^\s]*)?/g;
    const matches = content.match(urlPattern) ?? [];

    for (const url of matches) {
      try {
        const urlObj = new URL(url);
        results.push({ url, domain: urlObj.hostname });
      } catch {
        // 잘못된 URL 형식은 무시
        results.push({ url, domain: '' });
      }
    }

    // 프로토콜 없이 작성된 맨 도메인도 탐지 (REQ-SPAM-002)
    const bareDomainPattern = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
    const bareMatches = content.match(bareDomainPattern) ?? [];

    for (const domain of bareMatches) {
      const alreadyCaptured = results.some((r) => r.domain === domain || r.url.includes(domain));
      if (!alreadyCaptured) {
        results.push({ url: domain, domain });
      }
    }

    return results;
  }

  /**
   * 콘텐츠 해시 생성 (SHA256)
   *
   * @MX:NOTE: [AUTO] 중복 검사를 위한 콘텐츠 해시 - 암호화 용도가 아님
   */
  private hashContent(content: string): string {
    const normalized = content.toLowerCase().trim().replace(/\s+/g, ' ');
    return createHash('sha256').update(normalized).digest('hex');
  }
}
