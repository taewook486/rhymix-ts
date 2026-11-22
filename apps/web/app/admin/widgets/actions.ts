'use server'
/**
 * Admin 위젯 인스턴스 Server Actions — SPEC-WIDGET-001 Slice D
 *
 * admin 세션 확인 후 instances.ts CRUD 함수를 호출한다.
 * 검증 실패 또는 미등록 위젯이면 적절한 에러를 반환한다.
 * @MX:SPEC: SPEC-WIDGET-001 REQ-WIDGET-D-002
 */
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createWidgetInstance,
  updateWidgetInstance,
  deleteWidgetInstance,
} from '@rhymix-ts/core/widgets'
import { prisma } from '@rhymix-ts/db'
import { adminServerActionDenied } from '@/lib/auth/admin-guard'

/** Server Action 결과 타입 */
export interface ActionResult {
  error?: string
}

/**
 * 관리자 가드(세션 + IP 제어/사이트 잠금 + 2FA, D-7)를 확인한다.
 * 거부되면 사유를 담은 Error를 던진다.
 */
async function requireAdmin(): Promise<void> {
  const denied = await adminServerActionDenied()
  if (denied) {
    throw new Error(denied)
  }
}

/**
 * 위젯 인스턴스를 생성한다.
 *
 * @param widgetName - 등록된 위젯 이름
 * @param label - 인스턴스 레이블
 * @param props - 위젯 props (JSON 직렬화된 객체)
 */
export async function createWidgetInstanceAction(
  widgetName: string,
  label: string,
  props: unknown,
): Promise<ActionResult> {
  await requireAdmin()

  try {
    await createWidgetInstance({ widgetName, label, props }, prisma)
  } catch (err) {
    return { error: err instanceof Error ? err.message : '인스턴스 생성에 실패했습니다.' }
  }

  revalidatePath('/admin/widgets')
  redirect('/admin/widgets')
}

/**
 * 위젯 인스턴스를 수정한다.
 *
 * @param id - 수정할 인스턴스 ID
 * @param label - 변경할 레이블 (선택적)
 * @param props - 변경할 props (선택적, JSON 직렬화된 객체)
 */
export async function updateWidgetInstanceAction(
  id: number,
  label: string,
  props: unknown,
): Promise<ActionResult> {
  await requireAdmin()

  try {
    await updateWidgetInstance(id, { label, props }, prisma)
  } catch (err) {
    return { error: err instanceof Error ? err.message : '인스턴스 수정에 실패했습니다.' }
  }

  revalidatePath('/admin/widgets')
  redirect('/admin/widgets')
}

/**
 * 위젯 인스턴스를 삭제한다.
 *
 * @param id - 삭제할 인스턴스 ID
 */
export async function deleteWidgetInstanceAction(id: number): Promise<ActionResult> {
  await requireAdmin()

  try {
    await deleteWidgetInstance(id, prisma)
  } catch (err) {
    return { error: err instanceof Error ? err.message : '인스턴스 삭제에 실패했습니다.' }
  }

  revalidatePath('/admin/widgets')
  redirect('/admin/widgets')
}
