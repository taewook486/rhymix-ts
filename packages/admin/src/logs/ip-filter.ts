/**
 * IP Filter Utility — SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * ipaddr.js 라이브러리를 사용한 IP 필터 파싱 및 매칭.
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-LOG-001~003
 */

import ipaddr from 'ipaddr.js';

/**
 * ParsedIpFilter — 파싱된 IP 필터
 */
export type ParsedIpFilter =
  | { type: 'exact' | 'cidr'; value: string; prefixLength?: number }
  | { error: string };

/**
 * parseIpFilter — IP 필터 문자열 파싱
 *
 * IPv4/IPv6 주소 또는 CIDR 표기법을 파싱.
 *
 * @param input - IP 필터 입력 (예: "192.168.1.1", "10.0.0.0/24", "2001:db8::/32")
 * @returns ParsedIpFilter
 */
export function parseIpFilter(input: string): ParsedIpFilter {
  try {
    // CIDR 표기법 체크
    if (input.includes('/')) {
      const parts = input.split('/');
      const addrStr = parts[0] ?? '';
      const prefixStr = parts[1] ?? '';
      const prefixLength = parseInt(prefixStr, 10);

      if (isNaN(prefixLength) || prefixLength < 0) {
        return { error: 'Invalid prefix length' };
      }

      ipaddr.parse(addrStr);
      return {
        type: 'cidr',
        value: addrStr,
        prefixLength,
      };
    }

    // 정확한 IP 주소
    const addr = ipaddr.parse(input);
    return {
      type: 'exact',
      value: addr.toString(),
    };
  } catch {
    return { error: 'Invalid IP address format' };
  }
}

/**
 * matchesIpFilter — IP 주소가 필터와 일치하는지 확인
 *
 * @param ip - 확인할 IP 주소
 * @param filter - 파싱된 IP 필터
 * @returns 일치하면 true
 */
export function matchesIpFilter(
  ip: string,
  filter: ParsedIpFilter,
): boolean {
  if ('error' in filter) {
    return false;
  }

  try {
    const testAddr = ipaddr.parse(ip);

    if (filter.type === 'exact') {
      const filterAddr = ipaddr.parse(filter.value);
      return testAddr.toString() === filterAddr.toString();
    }

    if (filter.type === 'cidr') {
      const filterAddr = ipaddr.parse(filter.value);
      // CIDR 매칭은 ipaddr.js의 match() 메서드 사용
      // RFC4632 notation으로 변환해서 비교
      const cidr = filterAddr.toString() + '/' + (filter.prefixLength ?? 32);
      const range = ipaddr.parseCIDR(cidr);
      return testAddr.match(range);
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * parseIpFilterForQuery — 데이터베이스 쿼리용 IP 필터 파싱
 *
 * Prisma contains 쿼리를 위한 부분 문자열 반환.
 *
 * @param input - IP 필터 입력
 * @returns 데이터베이스 쿼리용 문자열 또는 에러
 */
export function parseIpFilterForQuery(
  input: string,
): { value: string; error?: string } {
  const parsed = parseIpFilter(input);
  if ('error' in parsed) {
    return { value: '', error: parsed.error };
  }

  // CIDR인 경우 IP 부분만 추출
  if (parsed.type === 'cidr') {
    // 예: "192.168.1.0/24" → "192.168.1" (contains 쿼리용)
    const parts = parsed.value.split('.');
    if (parts.length === 4) {
      // IPv4:前三部分
      return { value: parts.slice(0, 3).join('.') };
    }
    // IPv6:단순화 (처음 32비트)
    const ipv6Parts = parsed.value.split(':');
    if (ipv6Parts.length > 2) {
      return { value: ipv6Parts.slice(0, 2).join(':') };
    }
  }

  return { value: parsed.value };
}
