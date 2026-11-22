/**
 * 내부 경로만 허용하는 리다이렉트 대상 검증 (오픈 리다이렉트 방어, RVE-2026-25·29·47 계열).
 *
 * 클라이언트·서버 양쪽에서 쓰는 순수 함수다. 서버 액션(`loginAction`)의 검증이 핵심이고,
 * 클라이언트 쪽 적용은 화면 동작을 맞추기 위한 이중 방어다.
 */

// 제어 문자와 공백: 브라우저는 URL 파싱 때 탭·개행을 제거하므로 `/\t/evil.com` 이 `//evil.com` 이 된다.
// eslint-disable-next-line no-control-regex
const CONTROL_OR_SPACE = /[\u0000- \u007f-\u009f]/g;

/** 퍼센트 인코딩을 최대 3번까지 풀어 경로 부분의 우회 표기를 드러낸다. */
function decodeRepeatedly(path: string): string {
  let current = path;
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      return current;
    }
  }
  return current;
}

/**
 * `value` 가 같은 출처의 내부 경로이면 그대로, 아니면 `fallback` 을 돌려준다.
 *
 * 거부 대상: `//host`, `/\host`, `scheme:`(절대 URL·`javascript:`), 인코딩으로 숨긴 `//`·`\`,
 * 제어 문자를 끼워 넣은 변형. 허용: `/` 로 시작하는 단일 슬래시 경로(쿼리·해시 포함).
 */
export function safeInternalPath(value: string | null | undefined, fallback = '/'): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(CONTROL_OR_SPACE, '');
  if (!cleaned.startsWith('/')) return fallback;

  // 경로 부분(쿼리·해시 앞)만 인코딩을 풀어 검사한다. 쿼리의 %2F 는 정상 값일 수 있다.
  const pathOnly = cleaned.split(/[?#]/, 1)[0] ?? '';
  const decodedPath = decodeRepeatedly(pathOnly).replace(CONTROL_OR_SPACE, '');
  if (decodedPath.startsWith('//') || decodedPath.includes('\\')) return fallback;

  // 마지막 방어선: 실제 URL 해석 결과가 같은 출처여야 한다.
  const origin = 'http://internal.invalid';
  try {
    if (new URL(cleaned, origin).origin !== origin) return fallback;
  } catch {
    return fallback;
  }
  return cleaned;
}
