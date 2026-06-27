'use server';

/**
 * actions.ts — SPEC-PAGE-001 Slice C + SPEC-ADMIN-002 Slice 2A + Slice 3D.
 *
 * 페이지 본문 저장 Server Action.
 * 관리자 권한 검증 후 savePageContent 를 호출한다 (REQ-PAGE-032).
 *
 * REQ-ADMIN2-027: 페이지 설정 업데이트
 * REQ-ADMIN2-029: 페이지 삭제
 * REQ-ADMIN2-028: 모바일 페이지 콘텐츠 저장 추가
 *
 * @MX:ANCHOR [AUTO]: 페이지 편집 Server Action 진입점.
 * @MX:REASON: 권한 검증 + DB 저장이 단일 경로를 통과해야 우회 불가. 3개 이상 호출 예정.
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-032 + SPEC-ADMIN-002 REQ-ADMIN2-027, REQ-ADMIN2-028, REQ-ADMIN2-029
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { prisma, Prisma } from '@rhymix-ts/db';
import { savePageContent } from '@rhymix-ts/page';
import { revalidatePath } from 'next/cache';

/**
 * 페이지 본문을 저장한다.
 * 비관리자면 권한 오류를 던진다 (REQ-PAGE-032).
 *
 * @param instanceId 모듈 인스턴스 ID
 * @param mcontent   저장할 HTML 본문
 */
export async function savePageAction(
  instanceId: number,
  mcontent: string,
): Promise<void> {
  // 관리자 권한 검증 (REQ-PAGE-032)
  const session = await auth();
  if (!isAdminSession(session)) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  await savePageContent(
    { instanceId, mcontent, pageType: 'CONTENT' },
    prisma,
  );

  // 저장 후 편집 페이지로 리다이렉트
  redirect(`/admin/pages/${instanceId}/edit`);
}

/**
 * 페이지 설정을 업데이트한다 (REQ-ADMIN2-027).
 * title, browserTitle, layoutId, grant 설정을 저장한다.
 *
 * @param instanceId 모듈 인스턴스 ID
 * @param settings   업데이트할 설정값
 */
export async function updatePageSettingsAction(
  instanceId: number,
  settings: {
    title: string;
    browserTitle: string;
    layoutId: string | null;
    grant: unknown;
  },
): Promise<void> {
  const session = await auth();
  if (!isAdminSession(session)) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  await prisma.moduleInstance.update({
    where: { id: instanceId },
    data: {
      name: settings.title,
      browserTitle: settings.browserTitle,
      layoutId: settings.layoutId,
      config: {
        // ModuleConfig.config JSON 필드에 grant 저장 (Prisma 중첩 업데이트)
        upsert: {
          create: { config: { grant: settings.grant } as Prisma.InputJsonObject },
          update: { config: { grant: settings.grant } as Prisma.InputJsonObject },
        },
      },
    },
  });

  revalidatePath(`/admin/pages/${instanceId}/edit`);
}

/**
 * 페이지 인스턴스를 삭제한다 (REQ-ADMIN2-029).
 * AdminLog 를 기록하고 인스턴스를 제거한다.
 *
 * @param instanceId 삭제할 모듈 인스턴스 ID
 */
export async function deletePageAction(instanceId: number): Promise<void> {
  const session = await auth();
  if (!isAdminSession(session)) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  // AdminLog 기록
  await prisma.adminLog.create({
    data: {
      actorId: session.user.id,
      action: 'delete',
      target: `moduleInstance:${instanceId}`,
      diff: { moduleCode: 'page' },
      ip: null, // Server Action에서는 IP 추적 불가
      userAgent: null,
    },
  });

  // 인스턴스 삭제
  await prisma.moduleInstance.delete({
    where: { id: instanceId },
  });

  // 목록 페이지로 리다이렉트
  redirect('/admin/pages');
}

/**
 * 모바일 페이지 본문을 저장한다 (REQ-ADMIN2-028).
 * 비관리자면 권한 오류를 던진다.
 *
 * @param instanceId 모듈 인스턴스 ID
 * @param mcontentMobile 저장할 모바일 HTML 본문
 */
export async function saveMobilePageAction(
  instanceId: number,
  mcontentMobile: string,
): Promise<void> {
  // 관리자 권한 검증
  const session = await auth();
  if (!isAdminSession(session)) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  // 데스크톱 콘텐츠는 유지하면서 모바일 콘텐츠만 저장
  // 현재 데스크톱 콘텐츠를 먼저 로드
  const instance = await prisma.moduleInstance.findUnique({
    where: { id: instanceId },
  });

  if (!instance || instance.moduleCode !== 'page') {
    throw new Error('페이지 인스턴스를 찾을 수 없습니다.');
  }

  await savePageContent(
    {
      instanceId,
      mcontent: instance.mcontent ?? '',
      pageType: 'CONTENT',
      mcontentMobile,
    },
    prisma,
  );

  // 저장 후 편집 페이지로 리다이렉트
  redirect(`/admin/pages/${instanceId}/edit`);
}
