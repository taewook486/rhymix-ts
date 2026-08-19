/**
 * admin.menuItem tRPC 라우터 — SPEC-ADMIN-001 Slice D + Slice E.
 *
 * MenuItem 단위 CRUD: list / create / update / delete / reorder.
 *
 * @MX:ANCHOR: [AUTO] admin.menuItem.reorder — DnD 순서 갱신 단일 진입점.
 * @MX:REASON: 모든 MenuItem 순서 갱신은 이 프로시저를 통해 단일 $transaction 으로 처리돼야
 *             부분 적용(partial update)을 방지할 수 있음. fan_in >= 3 (DnD UI, tests, admin page).
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-031
 *
 * @MX:NOTE: [AUTO] admin.menuItem.update 의 $transaction 패턴.
 *           parentId + listOrder 를 단일 transaction 으로 갱신 (REQ-ADMIN-031 transactional 부분).
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030, REQ-ADMIN-031, REQ-ADMIN-032, REQ-ADMIN-033
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@rhymix-ts/db';
import { menuButtonImageSchema } from '@rhymix-ts/admin';
import { router, protectedAdminProcedure } from '../../trpc';

/**
 * 메뉴 트리 최대 허용 깊이 (SPEC-LEGACY-PARITY-001 D4).
 * 실제 메뉴는 한 자릿수 깊이라 이 상한은 오직 순환/병적 트리 방어용이다 —
 * 정상 운영에서는 절대 도달하지 않는다.
 */
const MAX_MENU_DEPTH = 100;

/**
 * MenuItem 공통 입력 스키마 (REQ-ADMIN-032, REQ-ADMIN-033).
 *
 * 버튼 이미지 3종은 이미지 참조형 {"image", "alt"?} | null(제거) | undefined(변경
 * 없음)의 닫힌 집합으로 검증한다 — SPEC-LEGACY-PARITY-001 M3 (AC-SITE-011,
 * design.md D1). 스키마는 @rhymix-ts/admin 과 동일 소스를 재사용한다.
 */
const buttonImageInput = menuButtonImageSchema.nullable().optional();

const MenuItemInput = z.object({
  title: z.string().min(1).max(200),
  url: z.string().optional(),
  icon: z.string().optional(),
  cssClass: z.string().optional(),
  description: z.string().optional(),
  groupIds: z.array(z.number().int().positive()).default([]),
  openInNewWindow: z.boolean().default(false),
  expand: z.boolean().default(false),
  listOrder: z.number().int().default(0),
  normalBtn: buttonImageInput,   // REQ-ADMIN-033 + AC-SITE-011 정합화
  hoverBtn: buttonImageInput,
  activeBtn: buttonImageInput,
});

/**
 * 버튼 이미지 3종의 `null`(상태별 제거)을 Prisma.DbNull 로 바꾼다 (AC-SITE-003).
 *
 * `Json?` 컬럼에 평범한 `null` 을 넘기면 Prisma 는 SQL NULL 이 아니라 **JSON null**
 * (`'null'::jsonb`)을 기록한다 — 실측: `"normalBtn" IS NULL` 이 false 로 남는다.
 * 그러면 "해당 상태만 비운다"는 요건이 저장 계층에서 깨지고, 값이 사라진 것처럼
 * 보이지만 컬럼은 비어 있지 않은 어정쩡한 상태가 된다. Prisma mock 을 쓰는 단위
 * 테스트는 전달 값만 확인하므로 이 차이를 볼 수 없어 e2e 로만 드러났다.
 *
 * `undefined`(변경 없음)는 그대로 두어 patch 의미론을 유지한다.
 */
function toButtonPatch<T extends Record<string, unknown>>(patch: T): T {
  const out: Record<string, unknown> = { ...patch };
  for (const field of ['normalBtn', 'hoverBtn', 'activeBtn'] as const) {
    if (field in out && out[field] === null) {
      out[field] = Prisma.DbNull;
    }
  }
  return out as T;
}

export const adminMenuItemRouter = router({
  /**
   * parentId 기준 MenuItem lazy load (REQ-ADMIN-030).
   * parentId=null 이면 최상위 항목 반환.
   */
  list: protectedAdminProcedure
    .input(
      z.object({
        menuId: z.number().int().positive(),
        parentId: z.number().int().nullable().default(null),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.prisma.menuItem.findMany({
        where: { menuId: input.menuId, parentId: input.parentId },
        orderBy: { listOrder: 'asc' },
      }),
    ),

  /**
   * MenuItem 생성 (REQ-ADMIN-030, REQ-ADMIN-032, REQ-ADMIN-033).
   */
  create: protectedAdminProcedure
    .input(
      MenuItemInput.extend({
        menuId: z.number().int().positive(),
        parentId: z.number().int().positive().nullable().default(null),
      }),
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mutation(({ ctx, input }) => ctx.prisma.menuItem.create({ data: input as any })),

  /**
   * MenuItem 수정 — parentId + listOrder 를 단일 $transaction 으로 갱신 (REQ-ADMIN-031 transactional).
   */
  update: protectedAdminProcedure
    .input(
      MenuItemInput.partial().extend({
        id: z.number().int().positive(),
        parentId: z.number().int().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      return ctx.prisma.$transaction(async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return tx.menuItem.update({ where: { id }, data: toButtonPatch(patch) as any });
      });
    }),

  /**
   * MenuItem 삭제 (REQ-ADMIN-030).
   * children 은 onDelete: Cascade 로 자동 삭제됨.
   */
  delete: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.menuItem.delete({ where: { id: input.id } }),
    ),

  /**
   * MenuItem 배치 reorder — DnD 드래그 완료 시 호출 (REQ-ADMIN-031).
   * 단일 $transaction 으로 모든 items 의 listOrder / parentId 를 원자적으로 갱신한다.
   */
  reorder: protectedAdminProcedure
    .input(
      z.object({
        menuId: z.number().int().positive(),
        items: z.array(
          z.object({
            id: z.number().int().positive(),
            parentId: z.number().int().nullable(),
            listOrder: z.number().int(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. menuId 존재 확인
      const menu = await ctx.prisma.menu.findUnique({ where: { id: input.menuId } });
      if (!menu) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'menu not found' });
      }

      // 2. 빈 items → no-op
      if (input.items.length === 0) {
        return { updated: 0 };
      }

      // 3. 순환 가드 (SPEC-LEGACY-PARITY-001 D4, 루트 원인) — 항목이 자기 자신이나
      //    자신의 하위 항목을 부모로 지정하면 부모 그래프에 순환이 생긴다. 검증 없이
      //    기록하면 duplicate.copySubtree / buildMenuTree 의 무한 재귀 벡터가 되므로
      //    이 경계에서 거부한다. 배치 밖 항목의 부모는 기존 rows 로 보완해 완전한
      //    부모 그래프를 만든 뒤, 각 배치 항목에서 부모 사슬을 거슬러 올라가며
      //    같은 노드를 다시 만나면 순환으로 판정한다. 쓰기 전에 던지므로 DB 는
      //    변경되지 않는다(트랜잭션 롤백 동치).
      const existing = await ctx.prisma.menuItem.findMany({
        where: { menuId: input.menuId },
        select: { id: true, parentId: true },
      });
      const proposedParent = new Map<number, number | null>();
      for (const row of existing) {
        proposedParent.set(row.id, row.parentId);
      }
      for (const item of input.items) {
        proposedParent.set(item.id, item.parentId);
      }
      for (const item of input.items) {
        const seen = new Set<number>();
        let cur: number | null = item.id;
        while (cur !== null) {
          if (seen.has(cur)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message:
                '메뉴 항목이 자기 자신 또는 하위 항목을 부모로 가질 수 없습니다 (순환 감지)',
            });
          }
          seen.add(cur);
          cur = proposedParent.get(cur) ?? null;
        }
      }

      // 4. 단일 트랜잭션으로 일괄 갱신
      await ctx.prisma.$transaction(
        input.items.map((item) =>
          ctx.prisma.menuItem.update({
            where: { id: item.id },
            data: { parentId: item.parentId, listOrder: item.listOrder },
          }),
        ),
      );

      return { updated: input.items.length };
    }),

  /**
   * MenuItem 복제 — 원본과 같은 부모의 바로 뒤에 서브트리 전체를 복사한다
   * (SPEC-LEGACY-PARITY-001 M4, AC-SITE-001).
   *
   * @MX:ANCHOR: [AUTO] admin.menuItem.duplicate — 메뉴 항목 복제 단일 진입점.
   * @MX:REASON: 서브트리 재귀 복사의 원자성(단일 $transaction)과 listOrder 무충돌
   *             계약이 이 프로시저에만 있다. fan_in >= 3 (MenuItemDnDTree, menu actions, tests).
   * @MX:SPEC: SPEC-LEGACY-PARITY-001 AC-SITE-001
   *
   * 동작:
   *   1. 원본 로드 (없으면 NOT_FOUND)
   *   2. 메뉴 전체를 읽어 원본 id 기준 부모-자식 맵 구성
   *   3. 단일 $transaction — (a) 삽입 지점 뒤 형제 listOrder +1 밀기,
   *      (b) 부모부터 깊이 우선 create. 자식의 parentId 는 새 부모 id 를
   *      가리켜야 FK 가 성립한다 (부모가 먼저 생성돼야 자식 참조 가능).
   *
   * 버튼 3종: 원본값이 null 이면 Prisma.DbNull 을 명시해 SQL NULL 로 기록한다.
   * 평범한 null 을 넘기면 'null'::jsonb 가 되어 IS NULL 이 false 로 남는다
   * (M3 결함 2 와 동일한 Json? 함정 — toButtonPatch 주석 참조).
   */
  duplicate: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // 1. 원본 로드
      const source = await ctx.prisma.menuItem.findUnique({ where: { id: input.id } });
      if (!source) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'menu item not found' });
      }

      // 2. 원본 id 기준 부모-자식 맵 — 복사 경로는 원본 id 공간을 따라간다
      const all = await ctx.prisma.menuItem.findMany({ where: { menuId: source.menuId } });
      const childrenOf = new Map<number, typeof all>();
      for (const row of all) {
        if (row.parentId === null) continue;
        const list = childrenOf.get(row.parentId);
        if (list) list.push(row);
        else childrenOf.set(row.parentId, [row]);
      }

      // 3. 단일 트랜잭션 — 부분 복사 방지
      let createdCount = 0;
      const newRootId = await ctx.prisma.$transaction(async (tx) => {
        // (a) 루트 사본 자리 확보 — 원본 뒤의 형제들을 1씩 민다 (충돌 0건 보장)
        await tx.menuItem.updateMany({
          where: {
            menuId: source.menuId,
            parentId: source.parentId,
            listOrder: { gt: source.listOrder },
          },
          data: { listOrder: { increment: 1 } },
        });

        // (b) 부모-먼저 깊이 우선 복사. 자식 listOrder 는 원본 값을 그대로 쓴다 —
        //     새 부모 그룹은 비어 있으므로 충돌이 성립하지 않는다.
        const copySubtree = async (
          row: (typeof all)[number],
          parentId: number | null,
          listOrder: number,
          visited: Set<number>,
          depth: number,
        ): Promise<number> => {
          // 순환/병적 깊이 방어 (SPEC-LEGACY-PARITY-001 D4) — 같은 원본 id 가 현재
          // 재귀 경로에 다시 나타나거나(순환) 깊이 상한을 넘으면 무한 재귀 대신
          // 거부한다. 순환은 reorder 경계에서 우선 차단하지만, 이미 오염된 데이터를
          // 복제할 때를 대비한 2차 방어선이다.
          if (visited.has(row.id) || depth > MAX_MENU_DEPTH) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '메뉴 트리에 순환 또는 과도한 깊이가 있어 복제할 수 없습니다 (순환 감지)',
            });
          }
          visited.add(row.id);

          const copy = await tx.menuItem.create({
            data: {
              menuId: row.menuId,
              parentId,
              title: row.title,
              url: row.url,
              icon: row.icon,
              cssClass: row.cssClass,
              description: row.description,
              groupIds: [...row.groupIds],
              openInNewWindow: row.openInNewWindow,
              expand: row.expand,
              listOrder,
              normalBtn: row.normalBtn ?? Prisma.DbNull,
              hoverBtn: row.hoverBtn ?? Prisma.DbNull,
              activeBtn: row.activeBtn ?? Prisma.DbNull,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          });
          createdCount += 1;

          const children = [...(childrenOf.get(row.id) ?? [])].sort(
            (a, b) => a.listOrder - b.listOrder,
          );
          for (const child of children) {
            await copySubtree(child, copy.id, child.listOrder, visited, depth + 1);
          }
          // 경로 기반 visited — 형제 서브트리는 서로의 방문 기록에 간섭하지 않는다.
          visited.delete(row.id);
          return copy.id;
        };

        return copySubtree(source, source.parentId, source.listOrder + 1, new Set<number>(), 0);
      });

      return { id: newRootId, created: createdCount };
    }),
});
