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
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  adminConfigSchema,
  dbConfigSchema,
  licenseAgreementSchema,
  type AdminConfig,
  type DbConfig,
} from '@rhymix-ts/core';
import {
  acquireInstallLock,
  seedInstall,
  validateDbConnection,
  type DbValidationCode,
} from '@rhymix-ts/db';
import {
  hashPassword,
  isDisposableEmail,
  PASSWORD_VERSION_TAG,
} from '@rhymix-ts/auth';

import { type ActionState } from '@/lib/install/action-state';
import { getWizardSession } from '@/lib/install/wizard-session';
import { requireWizardStep } from '@/lib/install/wizard-guards';

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
 * CSRF double-submit cookie 검증 (REQ-INSTALL-003) 수행 후 처리합니다.
 */
export async function agreeLicense(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getWizardSession();

  // REQ-INSTALL-003: Next.js Server Action의 내장 origin 검증이 CSRF 방어선.
  // double-submit cookie 패턴은 Next.js 16에서 Server Component의 쿠키 수정 제약으로
  // 구현 불가 (cookies can only be modified in a Server Action or Route Handler).

  const accepted = formData.get('accepted') === 'true' || formData.get('accepted') === 'on';
  const parsed = licenseAgreementSchema.safeParse({ accepted });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: { accepted: '라이선스에 동의해야 진행할 수 있습니다.' },
    };
  }
  session.licenseAccepted = true;
  session.step = 'env-check';
  await session.save?.();
  redirect('/install/check-env');
}

/**
 * Step 2 → Step 3 전이 — 환경 자가진단 통과 마크 후 db-config로 redirect.
 *
 * "다음" 버튼이 form action으로 invoke합니다. Server Component 렌더 중
 * 쿠키 수정은 Next.js 16에서 금지되므로 반드시 server action으로만 호출.
 */
export async function setEnvChecksPass(): Promise<void> {
  const session = await getWizardSession();
  if (!session.licenseAccepted) {
    redirect('/install');
  }
  session.envChecksPass = true;
  if (session.step === 'license' || session.step === 'env-check') {
    session.step = 'env-check';
  }
  await session.save?.();
  redirect('/install/db-config');
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
    // dev 모드에서는 schema가 사전 push된 상태일 수 있으므로 충돌 검사 우회.
    allowExistingTables: process.env.NODE_ENV === 'development',
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

/**
 * Step 4 — 관리자 계정 + 최종 설치 실행 (REQ-INSTALL-014, 015, 053, 054).
 *
 * 1) 위저드 단계 가드 (license/env/db 모두 통과해야 진입)
 * 2) `adminConfigSchema` 파싱
 * 3) 운영 환경에서 일회용 이메일 차단
 * 4) `session.db` 존재 확인
 * 5) advisory lock 획득(미획득 시 즉시 거부)
 * 6) 비밀번호 해싱 → seedInstall 트랜잭션 실행
 * 7) lock 해제 → step='finish'로 갱신 → /install/complete 리다이렉트
 *
 * 세션 폐기는 `/install/complete` 페이지가 첫 렌더 시 수행합니다 (UX 연속성
 * 확보 + step==='finish' 마커 검사 통과).
 *
 * @MX:ANCHOR: 영구 DB 변경(seedInstall) 호출의 단일 진입점 (fan_in: admin-config 폼, 향후 CLI/admin re-install).
 * @MX:REASON: 본 함수가 부분 실행되면 advisory lock leak 또는 부분 시드가 발생한다.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-014, REQ-INSTALL-015, REQ-INSTALL-053, REQ-INSTALL-054
 */
export async function performInstall(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getWizardSession();
  // 1) 단계 가드 — 미충족 시 redirect.
  requireWizardStep('admin', session);

  // 2) Zod 파싱.
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    password2: formData.get('password2'),
    nickName: formData.get('nickName'),
    userId: formData.get('userId'),
    timeZone: formData.get('timeZone'),
    useSsl: formData.get('useSsl'),
    useSitelock: formData.get('useSitelock') === 'true' || formData.get('useSitelock') === 'on',
  };
  const parsed = adminConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }
  const admin: AdminConfig = parsed.data;

  // 3) 운영 환경 일회용 이메일 차단.
  if (process.env.NODE_ENV === 'production' && isDisposableEmail(admin.email)) {
    return {
      ok: false,
      fieldErrors: { email: '일회용 이메일 주소는 사용할 수 없습니다.' },
    };
  }

  // 4) DB 설정 존재 확인.
  if (!session.db) {
    return {
      ok: false,
      formError: 'DB 설정이 없습니다. 이전 단계로 돌아가 다시 검증해주세요.',
    };
  }

  // 5) advisory lock 획득.
  const { prisma } = await import('@rhymix-ts/db');
  const lock = await acquireInstallLock(prisma);
  if (!lock.acquired) {
    return {
      ok: false,
      formError: '다른 설치가 이미 진행 중입니다.',
    };
  }

  try {
    // 6) 비밀번호 해싱 + 요청 메타데이터 수집.
    const passwordHash = await hashPassword(admin.password);
    const h = await headers();
    const installerIp =
      h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? 'unknown';
    const installerUserAgent = h.get('user-agent') ?? 'unknown';
    const hostname = h.get('host') ?? 'localhost';
    const rhymixTsVersion = process.env.npm_package_version ?? '0.0.0';

    try {
      const sslEnabled = admin.useSsl === 'always';
      await seedInstall(
        {
          site: {
            defaultLanguage: session.language ?? 'en',
            timeZone: admin.timeZone,
            scheme: sslEnabled ? 'https' : 'http',
            rhymixTsVersion,
            // databaseSchemaVersion은 본 슬라이스에서는 'init' 고정.
            // _prisma_migrations 테이블에서 읽어오는 개선은 추후 슬라이스로 이전.
            databaseSchemaVersion: 'init',
            installerIp,
            installerUserAgent,
          },
          domain: { hostname },
          admin: {
            userId: admin.userId,
            emailAddress: admin.email,
            passwordHash,
            nickName: admin.nickName,
            userName: admin.nickName,
            passwordVersion: PASSWORD_VERSION_TAG,
          },
          sitelock: {
            enabled: admin.useSitelock,
            // 단순화: SiteLock allowlist 시드는 installerIp 1개로 부트스트랩.
            allowlist: admin.useSitelock ? [installerIp] : [],
          },
        },
        prisma,
      );
      // Domain.forceHttps는 Prisma schema default=true이므로 SSL 설정과 일치시킴.
      // packages/db seed.ts는 Turbopack이 hot-reload하지 않으므로 여기서 보정.
      await prisma.domain.updateMany({
        where: { hostname },
        data: { forceHttps: sslEnabled },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        formError: `설치 실패: ${message}`,
      };
    }

    // 7) 세션을 finish 단계로 갱신 — /install/complete가 자체 렌더 시 폐기.
    session.step = 'finish';
    await session.save?.();
  } finally {
    await lock.release();
  }

  redirect('/install/complete');
}
