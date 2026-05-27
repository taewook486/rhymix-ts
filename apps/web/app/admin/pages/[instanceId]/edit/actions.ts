'use server';

/**
 * actions.ts — SPEC-PAGE-001 Slice C
 *
 * 페이지 본문 저장 Server Action.
 * 관리자 권한 검증 후 savePageContent 를 호출한다 (REQ-PAGE-032).
 *
 * @MX:ANCHOR [AUTO]: 페이지 편집 Server Action 진입점.
 * @MX:REASON: 권한 검증 + DB 저장이 단일 경로를 통과해야 우회 불가. 3개 이상 호출 예정.
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-032
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { prisma } from '@rhymix-ts/db';
import { savePageContent } from '@rhymix-ts/page';

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
