/**
 * CAPTCHA verification utilities — SPEC-CAPTCHA-001 REQ-CAPTCHA-003
 *
 * Cloudflare Turnstile server-side verification:
 * - verifyTurnstileToken: POST https://challenges.cloudflare.com/turnstile/v0/siteverify
 *
 * @MX:SPEC: SPEC-CAPTCHA-001 REQ-CAPTCHA-003
 */

export interface TurnstileVerifyOptions {
  token: string;
  secretKey: string;
  remoteIp?: string;
}

export interface TurnstileVerifyResult {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

/**
 * Cloudflare Turnstile 토큰을 서버 사이드에서 검증한다.
 *
 * Turnstile official test keys for testing:
 * - site key: 1x00000000000000000000AA
 * - secret: 1x0000000000000000000000000000000AA
 *
 * @param options - token, secretKey, optional remoteIp
 * @returns TurnstileVerifyResult with success flag
 * @throws Error when network fails or non-200 response
 *
 * @MX:ANCHOR: [AUTO] Turnstile 토큰 검증 단일 진입점 — 모든 CAPTCHA 검증은 본 함수를 통과한다.
 * @MX:REASON: 검증 로직이 한 곳에 모여 fail-closed 보안 불변식을 유지한다.
 */
export async function verifyTurnstileToken(
  options: TurnstileVerifyOptions,
): Promise<TurnstileVerifyResult> {
  const { token, secretKey, remoteIp } = options;

  try {
    // Cloudflare siteverify API 호출
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });

    // [SECURITY-CRITICAL] 네트워크 오류 또는 non-200 응답은 fail-closed
    if (!response.ok) {
      throw new Error(`Turnstile verification failed: ${response.status} ${response.statusText}`);
    }

    const result: TurnstileVerifyResult = await response.json();

    return result;
  } catch (err) {
    // 네트워크 오류 또는 JSON 파싱 오류를 그대로 전파
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Turnstile verification failed: unknown error');
  }
}

/**
 * Turnstile official test keys — 테스트용 상수
 */
export const TURNSTILE_TEST_KEYS = {
  SITE_KEY: '1x00000000000000000000AA',
  SECRET_KEY: '1x0000000000000000000000000000000AA',
} as const;
