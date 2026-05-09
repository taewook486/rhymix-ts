/**
 * 인스톨 위저드 iron-session 어댑터 — REQ-INSTALL-003, 005, 011.
 *
 * 위저드의 모든 단계 간 상태(라이선스 동의, 환경 검사 통과, DB 설정,
 * 관리자 설정)는 단일 iron-session 쿠키 `rhymix-ts-install`에만 저장됩니다.
 * 쿠키 자체가 NEXTAUTH_SECRET 기반 AES-GCM seal로 암호화되므로, 내부의
 * DB 비밀번호/관리자 정보 추가 암호화는 수행하지 않습니다 (이중 암호화 회피).
 *
 * CSRF: 본 위저드 폼은 모두 Next.js Server Actions로 동작하며,
 * Server Actions의 내장 origin 검증이 CSRF 1차 방어선입니다 (REQ-INSTALL-003).
 *
 * @MX:ANCHOR: 위저드 단계 간 신뢰 경계의 단일 진실 원천 (fan_in >= 3: actions, guards, pages).
 * @MX:REASON: 모든 server action과 step guard가 이 어댑터를 통해서만 세션을 읽는다.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-003, REQ-INSTALL-005, REQ-INSTALL-011
 */
import { cookies } from 'next/headers';
import { getIronSession, type SessionOptions } from 'iron-session';

import {
  type InstallSession,
  NEXTAUTH_SECRET_MIN_LENGTH,
} from '@rhymix-ts/core';

/** iron-session에 봉인되는 위저드 페이로드 형태. */
export type WizardSession = InstallSession & {
  destroy?: () => Promise<void> | void;
  save?: () => Promise<void> | void;
};

/** 쿠키 이름 — 미들웨어 차단 규칙과 일치해야 합니다. */
export const WIZARD_COOKIE_NAME = 'rhymix-ts-install';

/** 쿠키 옵션 — 위저드 경로로 스코프 한정, 60분 만료. */
export const WIZARD_COOKIE_OPTIONS = {
  path: '/install',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60,
};

function buildSessionOptions(): SessionOptions {
  const password = process.env.NEXTAUTH_SECRET ?? '';
  if (password.length < NEXTAUTH_SECRET_MIN_LENGTH) {
    throw new Error(
      `NEXTAUTH_SECRET must be at least ${NEXTAUTH_SECRET_MIN_LENGTH} characters (REQ-INSTALL-052)`,
    );
  }
  return {
    cookieName: WIZARD_COOKIE_NAME,
    password,
    cookieOptions: WIZARD_COOKIE_OPTIONS,
  };
}

/** 위저드 세션 기본값 (쿠키 미존재 시 채워짐). */
function applyDefaults(session: WizardSession): WizardSession {
  if (typeof session.licenseAccepted !== 'boolean') session.licenseAccepted = false;
  if (typeof session.envChecksPass !== 'boolean') session.envChecksPass = false;
  if (typeof session.dbConfigValidated !== 'boolean') session.dbConfigValidated = false;
  if (!session.step) session.step = 'license';
  if (!session.language) session.language = 'en';
  return session;
}

/**
 * 서버 컴포넌트/server action에서 사용. iron-session 객체를 그대로 반환하므로
 * 호출자는 필드를 직접 변이시키고 `await session.save()`를 호출합니다.
 */
export async function getWizardSession(): Promise<WizardSession> {
  const store = await cookies();
  const session = await getIronSession<WizardSession>(store, buildSessionOptions());
  return applyDefaults(session);
}

/** 설치 완료 또는 명시적 초기화 시 세션 폐기. */
export async function clearWizardSession(): Promise<void> {
  const store = await cookies();
  const session = await getIronSession<WizardSession>(store, buildSessionOptions());
  await session.destroy?.();
}
