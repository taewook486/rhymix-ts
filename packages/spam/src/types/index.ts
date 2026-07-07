/**
 * SPEC-SPAM-001: 스팸 필터 타입 정의
 *
 * @MX:SPEC: SPEC-SPAM-001
 */

/**
 * 스팸 검사 결과 유형
 */
export enum SpamCheckResult {
  CLEAN = 'clean',
  FORBIDDEN_WORD = 'forbidden_word',
  BLACKLIST_URL = 'blacklist_url',
  DUPLICATE_CONTENT = 'duplicate_content',
  REPORT_THRESHOLD = 'report_threshold',
  AKISMET_SPAM = 'akismet_spam',
  RATE_LIMITED = 'rate_limited',
}

/**
 * 스팸 검사 결과
 */
export interface SpamCheckResultDetail {
  result: SpamCheckResult;
  isSpam: boolean;
  reason?: string;
  metadata?: {
    matchedWord?: string;
    matchedDomain?: string;
    contentHash?: string;
    reporterCount?: number;
    akismetScore?: number;
    timeRemaining?: number;
  };
}

/**
 * 스팸 필터 설정
 */
export interface SpamFilterConfig {
  forbiddenWordsEnabled: boolean;
  urlBlacklistEnabled: boolean;
  duplicateContentEnabled: boolean;
  duplicateContentWindowMinutes: number;
  reportThresholdDocument: number;
  reportThresholdComment: number;
  akismetEnabled: boolean;
  akismetApiKey?: string;
  akismetSiteUrl?: string;
  actionOnSpam: 'block' | 'queue'; // block: 즉시 차단, queue: 검토 큐로 이동
}

/**
 * 스팸 검사 입력
 */
export interface SpamCheckInput {
  type: 'document' | 'comment';
  content: string;
  title?: string;
  authorId: number | null;
  authorIp: string;
  siteId: number;
}

/**
 * URL 추출 결과
 */
export interface ExtractedUrl {
  url: string;
  domain: string;
}
