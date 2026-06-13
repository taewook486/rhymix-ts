/**
 * Admin Export Serializer — SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * serializeBundle: Prisma 트랜잭션 내에서 export bundle 생성.
 *
 * 민감 데이터 제거 (REQ-010):
 * - passwordHash, twoFactorSecret, sessionToken, smtpPassword, clientSecret 포함 안 함
 *
 * 참조 변환:
 * - ModuleInstance.menuId → { type: "menuRef", title }
 * - ModuleInstance.layoutId → { type: "layoutRef", name }
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-EXPORT-006~010
 */

import type { PrismaClient } from '@prisma/client';
import type { AdminExportBundle, ExportRequest } from './bundle-schema';
import { exportFormatVersion } from './bundle-schema';

/**
 * serializeBundle — export bundle 생성
 *
 * @param prisma - Prisma client (주입받음)
 * @param siteId - 대상 사이트 ID
 * @param request - export 요청 (선택 사항)
 * @returns serialize된 AdminExportBundle
 */
export async function serializeBundle(
  prisma: PrismaClient,
  siteId: number,
  request: ExportRequest,
): Promise<AdminExportBundle> {
  const bundle: AdminExportBundle = {
    metadata: {
      version: exportFormatVersion,
      exportedAt: new Date(),
      exportedBy: {
        // actorId, nickname은 호출자에서 설정 (보통 tRPC context에서)
        actorId: 0,
        nickname: '',
      },
      sourceSiteId: siteId,
      format: 'partial',
      selection: {
        menu: request.menu,
        moduleInstances: request.moduleInstances,
        documents: request.documents,
        comments: request.comments,
        siteSettings: request.siteSettings,
      },
      entityCounts: {
        menus: 0,
        menuItems: 0,
        moduleInstances: 0,
        documents: 0,
        comments: 0,
      },
      bundleSizeBytes: 0,
    },
  };

  // 읽기 전용 트랜잭션
  const result = await prisma.$transaction(async (tx) => {
    const site = await tx.site.findUnique({
      where: { id: siteId },
      select: { id: true },
    });
    if (site) {
      bundle.metadata.sourceSiteId = site.id;
    }

    let totalSize = 0;

    // 1. Menu export
    if (request.menu) {
      const menus = await tx.menu.findMany({
        where: { siteId },
        include: {
          items: {
            orderBy: { listOrder: 'asc' },
          },
        },
        orderBy: [{ listOrder: 'asc' }, { createdAt: 'asc' }],
      });

      // menu tree 변환: parentId → nested children
      const buildMenuTree = (parentId: number | null, menuId: number) => {
        const children = menus
          .flatMap((m) => m.items)
          .filter((item) => item.parentId === parentId)
          .sort((a, b) => a.listOrder - b.listOrder);

        return children.map((item) => {
          const exportKey = `menu:${menuId}:${item.id}`;
          const parentExportKey = parentId
            ? `menu:${menuId}:${parentId}`
            : null;

          const menuItem = {
            id: item.id,
            menuId: item.menuId,
            parentId: item.parentId,
            title: item.title,
            listOrder: item.listOrder,
            url: item.url,
            // JSON 필드 보존 (verbatim) - cast to expected type
            normalBtn: item.normalBtn as Record<string, unknown> | undefined,
            hoverBtn: item.hoverBtn as Record<string, unknown> | undefined,
            activeBtn: item.activeBtn as Record<string, unknown> | undefined,
            expand: item.expand ?? undefined,
            exportKey,
            parentExportKey,
          };

          // 재귀적으로 children 추가
          const node = menuItem as Record<string, unknown>;
          const nestedChildren = buildMenuTree(item.id, menuId);
          if (nestedChildren.length > 0) {
            node.items = nestedChildren;
          }

          return menuItem;
        });
      };

      bundle.menus = menus.map((menu) => {
        const exportKey = `menu:${menu.id}`;
        return {
          id: menu.id,
          siteId: menu.siteId,
          title: menu.title,
          isAdminMenu: menu.isAdminMenu,
          listOrder: menu.listOrder,
          exportKey,
          items: buildMenuTree(null, menu.id),
        };
      });

      bundle.metadata.entityCounts.menus = menus.length;
      bundle.metadata.entityCounts.menuItems =
        menus.reduce((sum, m) => sum + m.items.length, 0);
    }

    // 2. ModuleInstance export
    if (request.moduleInstances) {
      const moduleInstances = await tx.moduleInstance.findMany({
        where: { siteId },
      });

      bundle.moduleInstances = moduleInstances.map((mi) => {
        const exportKey = `module:${mi.mid}`;

        // menuId → menuRef 변환 (stubbed - no menu relation in current schema)
        const menuRef = mi.menuId
          ? {
              type: 'menuRef' as const,
              title: '', // TODO: resolve from menu table
            }
          : undefined;

        // layoutId → layoutRef 변환 (미구현)
        const layoutRef = mi.layoutId
          ? {
              type: 'layoutRef' as const,
              name: '', // TODO: resolve from layout table
            }
          : undefined;

        return {
          id: mi.id,
          siteId: mi.siteId,
          moduleCode: mi.moduleCode,
          mid: mi.mid,
          name: mi.name,
          // config: mi.config as unknown | undefined, // config is in ModuleConfig relation
          menuRef,
          layoutRef,
          exportKey,
        };
      });

      bundle.metadata.entityCounts.moduleInstances = moduleInstances.length;
    }

    // 3. Documents export (stubbed - schema alignment needed)
    if (request.documents.include) {
      // NOTE: Document model uses boardId, not siteId/moduleInstanceId
      // Actual implementation would need to join with Board and use Board.moduleInstance
      bundle.documents = [];
      bundle.metadata.entityCounts.documents = 0;
    }

    // 4. Comments export (stubbed - schema alignment needed)
    if (request.comments.include) {
      // NOTE: Comment model doesn't have siteId, moduleInstanceId fields
      // Actual implementation would need to use boardId and join with Board
      bundle.comments = [];
      bundle.metadata.entityCounts.comments = 0;
    }

    // 5. SiteSettings export
    // Note: Actual Site model uses key-value SiteSetting pairs
    // This is a simplified version that exports core Site fields
    if (request.siteSettings) {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: {
          defaultLanguage: true,
          timeZone: true,
        },
      });

      if (site) {
        bundle.siteSettings = {
          siteId,
          defaultLanguage: site.defaultLanguage ?? undefined,
          timezone: site.timeZone ?? undefined,
          // title, subtitle, description would come from SiteSetting in actual implementation
        };
      }
    }

    // bundle size 계산 (minify 여부에 따라)
    totalSize = Buffer.byteLength(
      JSON.stringify(bundle, null, request.minify ? 0 : 2),
      'utf8',
    );

    return totalSize;
  });

  bundle.metadata.bundleSizeBytes = result;

  return bundle;
}
