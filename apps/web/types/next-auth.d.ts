/**
 * NextAuth.js v5 type augmentation — SPEC-AUTH-001 Slice G.
 *
 * 본 모듈은 NextAuth 의 Session 및 JWT 타입을 확장해 Rhymix TS 인증 시스템에서
 * 사용하는 커스텀 클레임(isAdmin, groups)을 타입 안전성 있게 노출한다.
 *
 * 적용 범위:
 *   - Session.user: id (string), isAdmin (boolean), groups (array of group info)
 *   - JWT token: sub (string), isAdmin (boolean), groups (array)
 *
 * @MX:NOTE: TypeScript module augmentation 패턴으로 3rd-party 타입을 확장한다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-020 (RBAC), REQ-AUTH-034 (OR-gate)
 */

declare module 'next-auth' {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      isAdmin?: boolean;
      groups?: Array<{ id: number; isAdmin: boolean }>;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub?: string;
    iat?: number;
    exp?: number;
    isAdmin?: boolean;
    groups?: Array<{ id: number; isAdmin: boolean }>;
  }
}
