/**
 * 클라이언트 IP 추출 유틸 — REQ-INSTALL-024 (SiteLock allowlist 매칭).
 *
 * 우선순위:
 *  1. x-forwarded-for 의 첫 번째 IP (콤마로 구분된 프록시 체인의 client 측)
 *  2. x-real-ip
 *  3. 'unknown' (식별 불가)
 *
 * @MX:NOTE: 모든 요청 경로에서 호출되는 hot path. 정규식 사용 자제, 단순 split만 수행.
 */
export function extractClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // "client, proxy1, proxy2" → 첫 번째 entry, 공백 trim.
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    const trimmed = realIp.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return 'unknown';
}
