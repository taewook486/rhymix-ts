'use server';

/**
 * 인스톨 위저드 server actions — REQ-INSTALL-011, REQ-INSTALL-013.
 *
 * 본 파일의 모든 함수는 React Server Actions로, Next.js의 origin 검증을
 * CSRF 1차 방어로 활용합니다 (REQ-INSTALL-003). 위저드 1~3단계 동안 DB에
 * 영구 변경을 가하지 않으며 (REQ-INSTALL-050), 검증 결과만 iron-session
 * 쿠키에 저장합니다.
 *
 * @MX:ANCHOR: 위저드 입력 → 세션 상태 머신의 단일 진입점 (fan_in: 라이선스 폼/DB 폼/check-env 페이지).
 * @MX:REASON: 단계 게이트(licenseAccepted/envChecksPass/dbConfigValidated)는 모두 이 파일에서만 변이된다.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-011, REQ-INSTALL-013, REQ-INSTALL-050
 */
import { redirect } from 'next/navigation';

import {
  dbConfigSchema,
  licenseAgreementSchema,
  type DbConfig,
} from '@rhymix-ts/core';
import { validateDbConnection, type DbValidationCode } from '@rhymix-ts/db';

import { type ActionState } from '@/lib/install/action-state';
import { getWizardSession } from '@/lib/install/wizard-session';

/** Zod issues를 fieldErrors 맵으로 변환. */
function zodToFieldErrors(error: {
  issues: Array<{ path: (string | number)[]; message: string }>;
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Step 1 — 라이선스 동의.
 *
 * `accepted=true`일 때만 세션에 동의 플래그를 세우고 다음 단계로 리다이렉트.
 */
export async function agreeLicense(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const accepted = formData.get('accepted') === 'true' || formData.get('accepted') === 'on';
  const parsed = licenseAgreementSchema.safeParse({ accepted });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: { accepted: '라이선스에 동의해야 진행할 수 있습니다.' },
    };
  }
  const session = await getWizardSession();
  session.licenseAccepted = true;
  session.step = 'env-check';
  await session.save?.();
  redirect('/install/check-env');
}

/**
 * Step 2 보조 — 환경 자가진단 통과 마크.
 *
 * 진단 페이지 렌더 결과 `overall !== 'error'`인 경우 호출되어 다음 단계
 * 진입을 허용합니다.
 */
export async function setEnvChecksPass(): Promise<void> {
  const session = await getWizardSession();
  if (!session.licenseAccepted) return;
  session.envChecksPass = true;
  if (session.step === 'license' || session.step === 'env-check') {
    session.step = 'env-check';
  }
  await session.save?.();
}

/** validateDbConnection 결과 코드 → 필드/폼 오류 메시지 매핑(한국어). */
function mapDbErrors(
  errors: Array<{ code: DbValidationCode; message: string }>,
): { formError?: string; fieldErrors?: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  let formError: string | undefined;
  for (const err of errors) {
    switch (err.code) {
      case 'superuser-rejected':
        fieldErrors.user = '슈퍼유저(postgres/root/admin) 계정으로는 설치할 수 없습니다.';
        break;
      case 'auth-failed':
        fieldErrors.pass = '사용자 또는 비밀번호가 올바르지 않습니다.';
        break;
      case 'unreachable':
        formError = '데이터베이스에 접속할 수 없습니다. 호스트와 포트를 확인하세요.';
        break;
      case 'insufficient-privilege':
        formError = '대상 스키마에 CREATE/DROP 권한이 없습니다. 사용자 권한을 확인하세요.';
        break;
      case 'tables-exist':
        formError = '대상 스키마에 이미 Rhymix 테이블이 존재합니다. 비어 있는 스키마를 사용하세요.';
        break;
    }
  }
  return { formError, fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined };
}

/**
 * Step 3 — DB 접속 정보 검증.
 *
 * 게이트(licenseAccepted + envChecksPass)를 통과한 경우에만 실행되며,
 * Zod 파싱과 실제 Postgres 검증을 차례로 수행합니다.
 */
export async function validateDbConfig(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getWizardSession();
  if (!session.licenseAccepted || !session.envChecksPass) {
    return { ok: false, formError: '이전 단계를 먼저 완료해주세요.' };
  }

  const raw = {
    host: formData.get('host'),
    port: formData.get('port'),
    user: formData.get('user'),
    pass: formData.get('pass'),
    database: formData.get('database'),
    schema: formData.get('schema'),
  };
  const parsed = dbConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }

  const config: DbConfig = parsed.data;
  const result = await validateDbConnection(config, {
    allowSuperuser: process.env.NODE_ENV === 'development',
  });
  if (!result.ok) {
    return { ok: false, ...mapDbErrors(result.errors) };
  }

  session.db = config;
  session.dbConfigValidated = true;
  session.step = 'admin';
  await session.save?.();
  redirect('/install/admin-config');
}
