/**
 * 2FA 검증 marker — SPEC-ADMIN-2FA-OTP-001 M4 (REQ-2OTP-042/046/047).
 *
 * verify/enroll-confirm mutation이 성공하면 서버가 user id 기준으로 단기
 * one-shot marker를 등록한다. 이후 jwt callback이 marker를 직접 조회하여
 * `token.twoFactorVerified = true`를 채운다. 클라이언트 페이로드는 전적으로
 * 불신한다 (REQ-2OTP-047, AC-4b).
 *
 * autologin-marker.ts 와의 차이:
 *   - nonce 없이 user id 만으로 키ing — marker 등록처·소비처가 모두 서버 내부.
 *   - 클라이언트와 값을 주고받지 않으므로 nonce 추측 공격 표면이 없다.
 *   - 대신 단기 TTL(60초) — mutation 직후 다음 요청이 바로 들어올 것이라 가정.
 *
 * @MX:WARN: [AUTO] process-scoped Map — multi-instance/serverless 비호환.
 *   autologin-marker.ts 와 동일 제약. 단일 프로세스 배포 또는 sticky session 전제.
 * @MX:REASON: Vercel/AWS Lambda 등 stateless 환경에서 process 간 마커가 공유되지
 *   않으면 verify 성공 직후의 다음 요청이 다른 인스턴스로 라우팅될 때 jwt callback이
 *   marker를 못 찾아 twoFactorVerified 가 누락된다. 다중 인스턴스 전환 시 Redis 등
 *   외부 스토어로 이관 필요 (SPEC-INFRA-001 후속, 본 SPEC 범위 밖).
 * @MX:SPEC: SPEC-ADMIN-2FA-OTP-001 REQ-2OTP-046, REQ-2OTP-047
 */

const MARKER_TTL_MS = 60 * 1000;

// key = userId, value = createdAt(ms) — TTL 만료 판정용.
const markers = new Map<number, number>();

/**
 * verify/enroll-confirm mutation 성공 직후 호출.
 * user id 기준으로 단기 marker를 등록한다. 클라이언트에 반환할 값은 없다.
 * 동일 user id 의 이전 marker는 덮어쓴다(재시도 시나리오).
 */
export function registerTwoFactorVerifiedMarker(userId: number): void {
  markers.set(userId, Date.now());
}

/**
 * jwt callback이 매 요청마다 호출. 유효한(만료 전) marker가 존재하면 즉시
 * 제거하고 true 를 반환한다. 두 번째 호출 또는 만료된 marker는 false.
 */
export function consumeTwoFactorVerifiedMarker(userId: number): boolean {
  const createdAt = markers.get(userId);
  if (createdAt === undefined) {
    return false;
  }
  markers.delete(userId);
  if (Date.now() - createdAt > MARKER_TTL_MS) {
    return false;
  }
  return true;
}

/**
 * 테스트 전용 — marker 저장소 비우기. 프로덕션 코드에서 호출 금지.
 */
export function __clearTwoFactorVerifiedMarkersForTests(): void {
  markers.clear();
}
