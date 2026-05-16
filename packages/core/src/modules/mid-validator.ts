/**
 * mid-validator.ts — SPEC-ADMIN-001 Slice A
 *
 * REQ-ADMIN-001: mid citext, 길이 1-80, 패턴 ^[a-z0-9][a-z0-9_-]*$
 * REQ-ADMIN-002: 4단계 검증 (길이 → 패턴 → 예약어 → DB 유니크)
 * REQ-ADMIN-003: 예약어 차단
 *
 * @MX:ANCHOR: validateMid — REQ-ADMIN-001~003 의 단일 검증 함수
 * @MX:REASON: 어떤 mutation 경로도 이 함수를 거치지 않고 ModuleInstance 를 만들 수 없어야 한다.
 *             tRPC, install seed, programmatic API 모두 이 함수를 통과.
 *
 * @MX:NOTE: RESERVED_MIDS
 * @MX:REASON: 목록 변경 시 기존에 생성된 인스턴스 mid 와 충돌 가능성.
 *             새 예약어 추가 전 기존 인스턴스 mid 검색 필요.
 */

/** REQ-ADMIN-003: 예약어 목록 */
export const RESERVED_MIDS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  '_next',
  'static',
  'assets',
  'health',
  'auth',
  '404',
  '500',
  'robots.txt',
  'sitemap.xml',
  'favicon.ico',
]);

/** mid 길이 제약 */
const MID_MIN_LENGTH = 1;
const MID_MAX_LENGTH = 80;

/** mid 패턴: 소문자/숫자로 시작, 이후 소문자/숫자/언더스코어/하이픈 허용 */
const MID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export type MidValidationResult =
  | { ok: true }
  | { ok: false; code: 'INVALID_LENGTH' | 'INVALID_PATTERN' | 'RESERVED_KEYWORD' };

/**
 * mid 유효성 4단계 검증:
 * 1. 길이 검증 (1-80자)
 * 2. 패턴 검증 (^[a-z0-9][a-z0-9_-]*$)
 * 3. 예약어 검증 (RESERVED_MIDS)
 * 4. DB 유니크 검증 (호출자가 DB 레벨에서 처리 — Prisma unique 제약)
 */
export function validateMid(mid: string): MidValidationResult {
  // 단계 1: 길이 검증
  if (mid.length < MID_MIN_LENGTH || mid.length > MID_MAX_LENGTH) {
    return { ok: false, code: 'INVALID_LENGTH' };
  }

  // 단계 2: 패턴 검증
  if (!MID_PATTERN.test(mid)) {
    // 예약어 중 _next 는 패턴도 위반하지만 예약어 검사를 우선
    if (RESERVED_MIDS.has(mid)) {
      return { ok: false, code: 'RESERVED_KEYWORD' };
    }
    return { ok: false, code: 'INVALID_PATTERN' };
  }

  // 단계 3: 예약어 검증
  if (RESERVED_MIDS.has(mid)) {
    return { ok: false, code: 'RESERVED_KEYWORD' };
  }

  return { ok: true };
}
