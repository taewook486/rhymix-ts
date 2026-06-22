'use server';

/**
 * Onboarding dismiss server action — SPEC-INSTALL-003 REQ-INSTALL3-002.
 *
 * operator_onboarding_dismissed SiteSetting을 upsert하여
 * 온보딩 표면의 해제 상태를 영속화합니다.
 *
 * @MX:ANCHOR: 온보딩 해제 상태 영속화의 단일 진입점 (fan_in: OperatorOnboarding 컴포넌트의 dismiss 버튼).
 * @MX:REASON: 해제 상태를 중앙 집중하여 관리하고 race condition을 방지.
 * @MX:SPEC: SPEC-INSTALL-003 REQ-INSTALL3-002
 */
import { prisma } from '@rhymix-ts/db';
import { auth } from '@/lib/auth/config';

export interface DismissOnboardingInput {
  siteId: number;
}

export interface DismissOnboardingResult {
  ok: boolean;
  error?: string;
}

/**
 * 온보딩 해제 action.
 *
 * 인증된 운영자만 호출할 수 있으며, SiteSetting 테이블에
 * operator_onboarding_dismissed=true를 upsert합니다.
 */
export async function dismissOnboarding({
  siteId,
}: DismissOnboardingInput): Promise<DismissOnboardingResult> {
  // 인증 검증
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      error: '인증되지 않은 사용자입니다.',
    };
  }

  try {
    // SiteSetting upsert
    await prisma.siteSetting.upsert({
      where: {
        siteId_key: {
          siteId,
          key: 'operator_onboarding_dismissed',
        },
      },
      create: {
        siteId,
        key: 'operator_onboarding_dismissed',
        value: true,
      },
      update: {
        value: true,
      },
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `온보딩 해제에 실패했습니다: ${message}`,
    };
  }
}

/**
 * 온보딩 해제 form action (FormData 버전).
 *
 * HTML form에서 사용하기 위해 FormData를 받아서 처리합니다.
 * 성공 시 redirect, 실패 시 error를 throw합니다.
 */
export async function dismissOnboardingFromForm(formData: FormData): Promise<void> {
  const siteIdStr = formData.get('siteId');
  const siteId = siteIdStr ? Number.parseInt(siteIdStr as string, 10) : 0;

  const result = await dismissOnboarding({ siteId });

  if (!result.ok) {
    throw new Error(result.error || '온보딩 해제에 실패했습니다.');
  }

  // 성공 시 현재 페이지로 redirect하여 재렌더링
  const { redirect } = await import('next/navigation');
  redirect('/');
}
