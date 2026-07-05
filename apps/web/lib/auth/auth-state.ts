/**
 * Auth Server Action 상태 타입 및 초기값 — 'use server' 파일과 분리.
 *
 * Next.js는 'use server' 파일에서 async 함수만 export 허용하므로
 * 타입과 초기 상태값은 이 파일에서 관리한다.
 */
import type { SignupErrorCode, VerifyEmailErrorCode } from '@rhymix-ts/auth';

export type AuthActionState =
  | { ok: true }
  | {
      ok: false;
      formError?: string;
      fieldErrors?: Record<string, string>;
      code?: SignupErrorCode | VerifyEmailErrorCode | 'INVALID_CREDENTIALS' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'WEAK_PASSWORD' | 'CAPTCHA_REQUIRED';
    };

export const initialAuthActionState: AuthActionState = { ok: true };
