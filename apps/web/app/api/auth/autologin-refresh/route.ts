/**
 * AutoLogin refresh endpoint — SPEC-AUTH-001 Slice E.
 *
 * REQ-AUTH-019/053: `rx_autologin` 쿠키를 검증/회전한다.
 *   - 검증 성공 → 새 토큰 발급 + Set-Cookie + 200 응답
 *   - 재사용 감지 → 전체 세션 무효화 + 쿠키 제거 + 401 (TOKEN_REUSE)
 *   - 만료/무효 → 쿠키 제거 + 401 (AUTOLOGIN_INVALID)
 *
 * jwt callback 은 Edge 컨텍스트에서 Set-Cookie 를 설정할 수 없으므로,
 * 본 Route Handler 가 클라이언트에서 명시 호출되어 회전을 수행한다 (Slice E plan OQ-4).
 *
 * TODO(Slice F): NextAuth signIn 핸드오프 연계 — 회전 후 JWT 재발급까지 통합.
 */

import {
  detectTokenReuse,
  rotateAutoLogin,
  verifyAutoLogin,
  AutoLoginConfigError,
} from '@rhymix-ts/auth';
import { prisma } from '@rhymix-ts/db';

const AUTOLOGIN_COOKIE_NAME = 'rx_autologin';
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

function buildSetCookie(value: string, maxAge: number): string {
  const parts = [
    `${AUTOLOGIN_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  return parts.join('; ');
}

function buildClearCookie(): string {
  return buildSetCookie('', 0);
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  const cookies = header.split(';');
  for (const c of cookies) {
    const [k, ...rest] = c.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

export async function POST(req: Request): Promise<Response> {
  const cookieValue = readCookie(req, AUTOLOGIN_COOKIE_NAME);
  if (!cookieValue) {
    return new Response(
      JSON.stringify({ ok: false, code: 'AUTOLOGIN_INVALID' }),
      {
        status: 401,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  try {
    const verifyResult = await verifyAutoLogin(cookieValue, { prisma });

    if (verifyResult.kind === 'ok') {
      const rotated = await rotateAutoLogin(verifyResult.autoLoginId, {
        prisma,
      });
      return new Response(
        JSON.stringify({ ok: true, userId: verifyResult.userId }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': buildSetCookie(
              rotated.cookieValue,
              COOKIE_MAX_AGE_SECONDS,
            ),
          },
        },
      );
    }

    if (verifyResult.kind === 'reuse-detected') {
      // REQ-AUTH-053: 즉시 전체 세션 + autologin row 무효화.
      await detectTokenReuse(verifyResult.userId, { prisma });
      return new Response(
        JSON.stringify({ ok: false, code: 'TOKEN_REUSE' }),
        {
          status: 401,
          headers: {
            'content-type': 'application/json',
            'set-cookie': buildClearCookie(),
          },
        },
      );
    }

    // expired | invalid
    return new Response(
      JSON.stringify({ ok: false, code: 'AUTOLOGIN_INVALID' }),
      {
        status: 401,
        headers: {
          'content-type': 'application/json',
          'set-cookie': buildClearCookie(),
        },
      },
    );
  } catch (err) {
    if (err instanceof AutoLoginConfigError) {
      // 운영 설정 오류는 5xx 로 명확히 노출 — 디버깅 가능하도록.
      return new Response(
        JSON.stringify({ ok: false, code: 'AUTOLOGIN_CONFIG_ERROR' }),
        {
          status: 500,
          headers: { 'content-type': 'application/json' },
        },
      );
    }
    throw err;
  }
}
