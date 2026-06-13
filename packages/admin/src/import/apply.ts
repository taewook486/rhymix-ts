/**
 * Admin Import Apply — SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * applyImport: import bundle를 실제 DB에 적용.
 *
 * Pre-check: 모든 충돌 exportKey에 대한 decisions가 있어야 함.
 * Single transaction: menus → moduleInstances 순서.
 *
 * NOTE: Document/Comment import requires schema alignment (currently stubbed).
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-IMPORT-007~012
 */

import type { PrismaClient } from '@prisma/client';
import type { AdminExportBundle, ImportDecisions } from '../export/bundle-schema';

/**
 * Simple error class for import failures
 */
class ImportError extends Error {
  code: string;
  constructor(message: string, code = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.code = code;
  }
}

/**
 * ApplyResult — apply 실행 결과
 */
export interface ApplyResult {
  success: boolean;
  applied: number;
  skipped: number;
  errors: string[];
}

/**
 * applyImport — import bundle 적용
 *
 * @param prisma - Prisma client (주입받음)
 * @param bundle - import bundle
 * @param siteId - 대상 사이트 ID
 * @param decisions - 각 exportKey에 대한 결정 (overwrite/skipConflict/abort)
 * @returns ApplyResult
 */
export async function applyImport(
  prisma: PrismaClient,
  bundle: AdminExportBundle,
  siteId: number,
  decisions: ImportDecisions,
): Promise<ApplyResult> {
  // Pre-check: 모든 충돌 exportKey에 decision이 있어야 함
  // (dryRun 결과에서 requiresDecision=true인 항목)
  // TODO: dryRunResult를 인자로 받아서 검증하거나,
  //       별도로 충돌 목록을 계산해서 검증

  let appliedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  try {
    await prisma.$transaction(
      async (tx) => {
        // 1. Menu apply
        if (bundle.menus) {
          for (const menu of bundle.menus) {
            const decision = decisions[menu.exportKey] ?? 'create';

            if (decision === 'abort') {
              throw new ImportError(
                `Import aborted for ${menu.exportKey}`,
                'CONFLICT',
              );
            }

            if (decision === 'skipConflict') {
              skippedCount++;
              continue;
            }

            // overwrite or create
            const existing = await tx.menu.findFirst({
              where: { siteId, title: menu.title },
              select: { id: true },
            });

            if (existing) {
              // update
              await tx.menu.update({
                where: { id: existing.id },
                data: {
                  title: menu.title,
                  isAdminMenu: menu.isAdminMenu,
                  listOrder: menu.listOrder,
                },
              });
              appliedCount++;
            } else {
              // create
              const created = await tx.menu.create({
                data: {
                  siteId,
                  title: menu.title,
                  isAdminMenu: menu.isAdminMenu,
                  listOrder: menu.listOrder,
                },
              });
              appliedCount++;

              // MenuItem 생성 (recursive)
              const processMenuItems = async (
                items: unknown[],
                parentId: number | null,
                menuId: number,
              ) => {
                for (const item of items) {
                  const menuItem = item as Record<string, unknown>;
                  const createdItem = await tx.menuItem.create({
                    data: {
                      menuId,
                      parentId,
                      title: menuItem.title as string,
                      listOrder: menuItem.listOrder as number,
                      url: menuItem.url as string | null,
                      normalBtn: menuItem.normalBtn
                        ? (menuItem.normalBtn as object)
                        : undefined,
                      hoverBtn: menuItem.hoverBtn
                        ? (menuItem.hoverBtn as object)
                        : undefined,
                      activeBtn: menuItem.activeBtn
                        ? (menuItem.activeBtn as object)
                        : undefined,
                      expand: menuItem.expandable
                        ? (menuItem.expandable as boolean)
                        : undefined,
                    },
                  });
                  appliedCount++;

                  const nestedItems =
                    (menuItem.items as unknown[] | undefined) ?? [];
                  if (nestedItems.length > 0) {
                    await processMenuItems(
                      nestedItems,
                      createdItem.id,
                      menuId,
                    );
                  }
                }
              };

              await processMenuItems(menu.items, null, created.id);
            }
          }
        }

        // 2. ModuleInstance apply
        if (bundle.moduleInstances) {
          for (const mi of bundle.moduleInstances) {
            const decision = decisions[mi.exportKey] ?? 'create';

            if (decision === 'abort') {
              throw new ImportError(`Import aborted for ${mi.exportKey}`);
            }

            if (decision === 'skipConflict') {
              skippedCount++;
              continue;
            }

            // menuRef → menuId resolve
            let menuId: number | null = null;
            if (mi.menuRef) {
              const menu = await tx.menu.findFirst({
                where: { siteId, title: mi.menuRef.title },
                select: { id: true },
              });
              if (menu) {
                menuId = menu.id;
              }
            }

            // layoutRef → layoutId resolve (TODO: layout 테이블 없음)
            let layoutId: number | null = null;
            // layout resolve는 layout 테이블 구현 후 추가

            const existing = await tx.moduleInstance.findFirst({
              where: { siteId, mid: mi.mid },
              select: { id: true },
            });

            if (existing) {
              // update
              await tx.moduleInstance.update({
                where: { id: existing.id },
                data: {
                  name: mi.name,
                  ...(mi.config !== undefined && mi.config !== null && {
                    config: mi.config as object,
                  }),
                  ...(menuId !== null && { menuId }),
                  ...(layoutId !== null && { layoutId }),
                },
              });
              appliedCount++;
            } else {
              // create
              await tx.moduleInstance.create({
                data: {
                  siteId,
                  moduleCode: mi.moduleCode,
                  mid: mi.mid,
                  name: mi.name,
                  ...(mi.config ? { config: mi.config as object } : {}),
                  ...(menuId !== null && { menuId }),
                  ...(layoutId !== null && { layoutId }),
                },
              });
              appliedCount++;
            }
          }
        }

        // 3. Document apply (stubbed - schema alignment needed)
        if (bundle.documents) {
          for (const doc of bundle.documents) {
            const decision = decisions[doc.exportKey] ?? 'create';

            if (decision === 'abort') {
              throw new ImportError(
                `Import aborted for ${doc.exportKey}`,
                'CONFLICT',
              );
            }

            if (decision === 'skipConflict') {
              skippedCount++;
              continue;
            }

            // NOTE: Document import requires schema alignment
            // The actual Document model uses boardId, not siteId/moduleInstanceId
            errors.push(`Document import not yet implemented (schema alignment needed)`);
          }
        }

        // 4. Comment apply (stubbed - schema alignment needed)
        if (bundle.comments) {
          for (const comment of bundle.comments) {
            const decision = decisions[comment.exportKey] ?? 'create';

            if (decision === 'abort') {
              throw new ImportError(
                `Import aborted for ${comment.exportKey}`,
                'CONFLICT',
              );
            }

            if (decision === 'skipConflict') {
              skippedCount++;
              continue;
            }

            // NOTE: Comment import requires schema alignment
            errors.push(`Comment import not yet implemented (schema alignment needed)`);
          }
        }

        // 5. SiteSettings apply
        if (bundle.siteSettings) {
          await tx.site.update({
            where: { id: siteId },
            data: {
              ...(bundle.siteSettings.title !== undefined && {
                title: bundle.siteSettings.title,
              }),
              ...(bundle.siteSettings.subtitle !== undefined && {
                subtitle: bundle.siteSettings.subtitle,
              }),
              ...(bundle.siteSettings.description !== undefined && {
                description: bundle.siteSettings.description,
              }),
              ...(bundle.siteSettings.defaultLanguage !== undefined && {
                defaultLanguage: bundle.siteSettings.defaultLanguage,
              }),
              ...(bundle.siteSettings.timezone !== undefined && {
                timezone: bundle.siteSettings.timezone,
              }),
            },
          });
          appliedCount++;
        }
      },
      {
        isolationLevel: 'Serializable',
      },
    );

    return {
      success: true,
      applied: appliedCount,
      skipped: skippedCount,
      errors,
    };
  } catch (error) {
    if (error instanceof ImportError) {
      throw error;
    }
    throw new ImportError(
      `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'INTERNAL_SERVER_ERROR',
    );
  }
}
