/**
 * Admin authorization helper — SPEC-AUTH-001 Slice D2 + SPEC-ADMIN-EXTRAS-001 Slice B.
 *
 * Server Action / Route Handler 안에서 호출 가능한 순수 헬퍼. NextAuth 미들웨어
 * 라우트 파일(`apps/web/middleware.ts`)은 D2 범위 외이며, 실제 admin UI 라우트가
 * 추가될 때 별도로 도입한다.
 *
 * 본 헬퍼는 Auth.js 세션 객체에서 effective admin 권한 (REQ-AUTH-034)을 판정한다.
 * 도메인 함수 `resolveAdminPrivilege` 를 인라인으로 복제한 것이 아니라, 세션에
 * 이미 직렬화된 형태로 전달되는 user.isAdmin / groups 만으로 OR-게이트를 평가한다.
 */

export interface AdminSessionUser {
  id: number;
  isAdmin: boolean;
  groups?: Array<{ isAdmin: boolean }>;
}

export interface AdminSession {
  user: AdminSessionUser;
}

import type { PrismaClient } from '@prisma/client';

/**
 * 세션이 effective admin 인지 판정 (REQ-AUTH-034).
 * session/user 가 없거나 권한이 없으면 false.
 *
 * Auth.js v5 의 `Session.user.id` 는 string 이지만 본 프로젝트의 User.id 는 int 이다.
 * jwt callback (Slice D1) 이 `token.sub = user.id.toString()` 으로 변환하므로 본
 * 함수는 string 또는 number 모두 받아 number 로 정규화한다.
 */
export function isAdminSession(
  session: unknown,
): session is AdminSession {
  if (session === null || session === undefined || typeof session !== 'object') {
    return false;
  }
  const user = (session as { user?: unknown }).user;
  if (user === null || user === undefined || typeof user !== 'object') {
    return false;
  }
  const u = user as {
    id?: unknown;
    isAdmin?: unknown;
    groups?: unknown;
  };
  // id 정규화: number 직접 OR string → 숫자 변환.
  let idNum: number | null = null;
  if (typeof u.id === 'number' && Number.isFinite(u.id)) {
    idNum = u.id;
  } else if (typeof u.id === 'string') {
    const parsed = Number.parseInt(u.id, 10);
    if (Number.isFinite(parsed)) idNum = parsed;
  }
  if (idNum === null) return false;
  if (typeof u.isAdmin !== 'boolean') return false;
  // 정규화된 id 를 session.user 에 직접 덮어써서 호출자가 number 로 사용 가능하게.
  (user as { id: number }).id = idNum;
  if (u.isAdmin) return true;
  const groups = Array.isArray(u.groups) ? u.groups : [];
  return groups.some(
    (g) => g !== null && typeof g === 'object' && (g as { isAdmin?: unknown }).isAdmin === true,
  );
}

/**
 * 사이트의 관리자 2FA 정책 확인 (SPEC-ADMIN-EXTRAS-001 REQ-2FA-001).
 * 기본 siteId=1 사용.
 */
export async function isAdminTwoFactorRequired(prisma: PrismaClient): Promise<boolean> {
  const { getSiteAdminTwoFactorPolicy } = await import('@rhymix-ts/admin/security');
  return getSiteAdminTwoFactorPolicy(prisma, 1);
}

/**
 * 세션에 2FA 인증이 완료됐는지 확인 (SPEC-ADMIN-EXTRAS-001 REQ-2FA-002).
 */
export function isSessionTwoFactorVerified(session: AdminSession): boolean {
  const user = session.user as AdminSessionUser & { twoFactorVerified?: boolean };
  return user.twoFactorVerified === true;
}
