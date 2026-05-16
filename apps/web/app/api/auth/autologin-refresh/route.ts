/**
 * AutoLogin Refresh Route Handler — SPEC-AUTH-001 Slice G.
 *
 * 목적: 사용자가 NextAuth session 쿠키 없이 서버에 접속할 때,
 * rx_autologin 쿠키만으로 NextAuth session 을 재발급한다.
 *
 * @MX:ANCHOR: autologin 쿠키 검증 단일 진입점.
 * @MX:REASON: 키 rotation/도난 감지가 본 함수를 통과해야 우회 경로가 없다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-018, REQ-AUTH-019, REQ-AUTH-053
 */

import { cookies, headers } from 'next/headers';
import { verifyAutoLogin } from '@rhymix-ts/auth';
import { prisma } from '@rhymix-ts/db';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const securityKey = cookieStore.get('rx_autologin')?.value;

    if (!securityKey) {
      return Response.json(
        { ok: false, code: 'NO_TOKEN' },
        { status: 200 }
      );
    }

    const h = await headers();
    const xff = h.get('x-forwarded-for') ?? '';
    const ip = xff.split(',')[0]?.trim() || h.get('x-real-ip') || '0.0.0.0';
    const userAgent = h.get('user-agent') ?? '';

    const result = await verifyAutoLogin(
      { securityKey, ip, userAgent },
      { prisma }
    );

    if (!result.ok) {
      cookieStore.delete('rx_autologin');
      const code = result.code === 'TOKEN_THEFT' ? 'THEFT' : 'INVALID';
      return Response.json(
        { ok: false, code },
        { status: 200 }
      );
    }

    // REQ-AUTH-019 key rotation: 새로 발급된 securityKey 로 쿠키 갱신.
    cookieStore.set('rx_autologin', result.newSecurityKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return Response.json(
      { ok: true, userId: result.userId },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      { ok: false, code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return new Response('Method Not Allowed', { status: 405 });
}
