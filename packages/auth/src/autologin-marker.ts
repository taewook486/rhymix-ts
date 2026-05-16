/**
 * AutoLogin Trust Marker — SPEC-AUTH-001 Slice H.
 *
 * Route Handler 와 NextAuth Credentials authorize() 사이의 단방향 신뢰 신호.
 * Route Handler 에서 verifyAutoLogin 이 통과한 직후 `registerAutoLoginMarker`
 * 로 nonce 를 발급하고, 그 nonce 를 credentials 로 NextAuth 에 전달한다.
 * authorize() 는 `consumeAutoLoginMarker` 로 one-shot 소비한 뒤 user lookup 만
 * 수행한다 — verifyAutoLogin 을 두 번 호출하면 previousKey 매치 시
 * TOKEN_THEFT 가 발동하기 때문에 절대 재호출하지 않는다.
 *
 * @MX:WARN: process-scoped Map — multi-instance/serverless 환경 비호환.
 *   SPEC-INFRA-001 단계에서 Redis 등 외부 스토리지로 교체 검토.
 * @MX:REASON: Vercel/AWS Lambda 등 stateless 환경에서 process 간 마커가 공유되지
 *   않으면 authorize() 가 항상 실패한다. 단일 프로세스(`next dev`, `next start`)
 *   배포 또는 sticky session 환경에서만 안전하다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-019
 */

import { randomBytes } from 'node:crypto';

// key = `${userId}:${nonce}`, value = createdAt(ms) — 향후 TTL cleanup 용.
const markers = new Map<string, number>();

const NONCE_BYTES = 24;

/**
 * verifyAutoLogin 성공 후 호출. userId 에 대한 one-shot nonce 를 발급한다.
 * 반환된 nonce 는 즉시 `signIn('credentials', { autologinNonce })` 로 NextAuth
 * authorize() 에 전달되어야 한다.
 */
export function registerAutoLoginMarker(userId: number): string {
  const nonce = randomBytes(NONCE_BYTES).toString('base64url');
  markers.set(`${userId}:${nonce}`, Date.now());
  return nonce;
}

/**
 * authorize() 안에서 호출. 마커가 존재하면 즉시 제거하고 true 를 반환한다.
 * 두 번째 호출 또는 잘못된 (userId, nonce) 조합은 false 를 반환한다.
 */
export function consumeAutoLoginMarker(userId: number, nonce: string): boolean {
  const key = `${userId}:${nonce}`;
  if (!markers.has(key)) {
    return false;
  }
  markers.delete(key);
  return true;
}

/**
 * 테스트 전용 — 마커 저장소 비우기. 프로덕션 코드에서 호출 금지.
 * (현재는 vitest 간 격리를 위해 export 하지 않는다 — 필요해지면 추가.)
 */
