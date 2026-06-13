/**
 * 위젯 인스턴스 CRUD — SPEC-WIDGET-001 Slice A
 *
 * WidgetInstance DB 레코드에 대한 서비스 레이어.
 * props는 저장 전 반드시 Zod 스키마로 검증한다.
 */
import type { PrismaClient, WidgetInstance, Prisma } from '@prisma/client'
import { getWidget } from './registry'
import { validateWidgetProps } from './validate'

/**
 * DB 레코드 + 레지스트리 등록 여부를 합성한 타입.
 * registered: getWidget(widgetName) !== undefined
 */
export type WidgetInstanceWithStatus = WidgetInstance & { registered: boolean }

// @MX:ANCHOR: [AUTO] listWidgetInstances — admin 페이지, 테스트에서 fan_in >= 3
// @MX:REASON: AdminWidgetsPage, instances.test, 렌더 파이프라인에서 공통 사용
/**
 * 모든 WidgetInstance 목록을 반환한다.
 * 각 레코드에 registered(레지스트리 등록 여부) 필드를 추가한다.
 *
 * @param prisma - Prisma 클라이언트
 */
export async function listWidgetInstances(
  prisma: PrismaClient,
): Promise<WidgetInstanceWithStatus[]> {
  const rows = await prisma.widgetInstance.findMany({
    orderBy: { createdAt: 'asc' },
  })
  return rows.map((row) => ({
    ...row,
    registered: getWidget(row.widgetName) !== undefined,
  }))
}

/**
 * 새 WidgetInstance를 생성한다.
 * props를 저장하기 전 위젯 스키마로 검증하며,
 * 위젯이 미등록이거나 props가 유효하지 않으면 Error를 던진다.
 *
 * @param input - widgetName, label, props
 * @param prisma - Prisma 클라이언트
 */
export async function createWidgetInstance(
  input: { widgetName: string; label: string; props: unknown },
  prisma: PrismaClient,
): Promise<WidgetInstance> {
  const def = getWidget(input.widgetName)
  if (!def) {
    throw new Error(`위젯 '${input.widgetName}'이(가) 레지스트리에 등록되어 있지 않습니다.`)
  }

  // 원시 props를 Record<string, unknown>으로 정규화
  const rawProps =
    typeof input.props === 'object' && input.props !== null
      ? (input.props as Record<string, unknown>)
      : {}

  const validation = validateWidgetProps(def, rawProps)
  if (!validation.ok) {
    throw new Error(
      `위젯 '${input.widgetName}' props 검증 실패: ${validation.error.message}`,
    )
  }

  return prisma.widgetInstance.create({
    data: {
      widgetName: input.widgetName,
      label: input.label,
      props: validation.props as Prisma.InputJsonValue,
    },
  })
}

/**
 * 기존 WidgetInstance를 수정한다.
 * props가 제공되면 재검증한다.
 * 대상 인스턴스가 없으면 Prisma 자체 에러(P2025)를 그대로 전파한다.
 *
 * @param id - 수정할 WidgetInstance ID
 * @param input - 변경할 label / props (둘 다 선택적)
 * @param prisma - Prisma 클라이언트
 */
export async function updateWidgetInstance(
  id: number,
  input: { label?: string; props?: unknown },
  prisma: PrismaClient,
): Promise<WidgetInstance> {
  // 기존 레코드를 조회하여 widgetName 확인
  const existing = await prisma.widgetInstance.findUniqueOrThrow({ where: { id } })

  const updateData: Record<string, unknown> = {}
  if (input.label !== undefined) {
    updateData.label = input.label
  }

  if (input.props !== undefined) {
    const def = getWidget(existing.widgetName)
    if (!def) {
      throw new Error(
        `위젯 '${existing.widgetName}'이(가) 레지스트리에 등록되어 있지 않습니다.`,
      )
    }
    const rawProps =
      typeof input.props === 'object' && input.props !== null
        ? (input.props as Record<string, unknown>)
        : {}

    const validation = validateWidgetProps(def, rawProps)
    if (!validation.ok) {
      throw new Error(
        `위젯 '${existing.widgetName}' props 검증 실패: ${validation.error.message}`,
      )
    }
    updateData.props = validation.props as Prisma.InputJsonValue
  }

  return prisma.widgetInstance.update({
    where: { id },
    data: updateData,
  })
}

/**
 * WidgetInstance를 삭제한다.
 * 대상이 없으면 Prisma 자체 에러(P2025)를 그대로 전파한다.
 *
 * @param id - 삭제할 WidgetInstance ID
 * @param prisma - Prisma 클라이언트
 */
export async function deleteWidgetInstance(
  id: number,
  prisma: PrismaClient,
): Promise<void> {
  await prisma.widgetInstance.delete({ where: { id } })
}
