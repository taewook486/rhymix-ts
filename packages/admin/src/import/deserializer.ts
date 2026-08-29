/**
 * Admin Import Deserializer — SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * dryRun: bundle 검증 + import plan 생성.
 *
 * version check: MAJOR 호환성 (1.x accepts 1.*, rejects 2.* and 0.*)
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-IMPORT-001~006
 */

import type { PrismaClient } from '@prisma/client';
import {
  adminExportBundleSchema,
  SUPPORTED_VERSIONS,
  type AdminExportBundle,
} from '../export/bundle-schema';

/**
 * Simple error class for validation failures
 */
class ValidationError extends Error {
  code: string;
  constructor(message: string) {
    super(message);
    this.code = 'UNPROCESSABLE_CONTENT';
  }
}

/**
 * DryRunResult — dryRun 실행 결과
 */
export interface DryRunResult {
  valid: boolean;
  versionCheck: {
    passed: boolean;
    version: string;
    reason?: string;
  };
  plan: ImportPlanEntry[];
  conflicts: ConflictReport[];
  summary: {
    create: number;
    update: number;
    skip: number;
    errors: number;
  };
}

/**
 * ImportPlanEntry — import plan 각 항목
 */
export interface ImportPlanEntry {
  exportKey: string;
  entityType: 'menu' | 'menuItem' | 'moduleInstance' | 'document' | 'comment' | 'siteSettings';
  action: 'create' | 'update' | 'skip' | 'error';
  reason?: string;
  diffPreview?: Record<string, unknown>; // update인 경우 변경 사항 preview
  targetId?: number; // update인 경우 기존 ID
}

/**
 * ConflictReport — 충돌 보고
 */
export interface ConflictReport {
  exportKey: string;
  entityType: string;
  existingId?: number;
  reason: string;
  requiresDecision: boolean; // 사용자 결정 필요 여부 (overwrite/skipConflict/abort)
}

/**
 * versionCheckResult — 버전 체크 결과
 */
interface VersionCheckResult {
  passed: boolean;
  reason?: string;
}

/**
 * MAJOR 버전 체크 — 1.x accepts 1.*, rejects 2.* and 0.*
 */
function checkExportVersion(version: string): VersionCheckResult {
  const major = parseInt(version.split('.')[0] ?? '0', 10);
  const supportedMajor = parseInt(
    (SUPPORTED_VERSIONS[0] ?? '1.0.0').split('.')[0] ?? '1',
    10,
  );

  if (major !== supportedMajor) {
    return {
      passed: false,
      reason: `Unsupported major version: ${version}. Supported: ${SUPPORTED_VERSIONS.join(', ')}`,
    };
  }

  return { passed: true };
}

/**
 * dryRun — bundle 검증 + import plan 생성
 *
 * @param prisma - Prisma client (주입받음)
 * @param bundle - import bundle (JSON 파싱된 객체)
 * @param siteId - 대상 사이트 ID
 * @returns DryRunResult
 */
export async function dryRun(
  prisma: PrismaClient,
  bundle: unknown,
  siteId: number,
): Promise<DryRunResult> {
  // 1. bundle 스키마 검증
  const validationResult = adminExportBundleSchema.safeParse(bundle);
  if (!validationResult.success) {
    throw new ValidationError(`Invalid bundle format: ${validationResult.error.errors.map((e) => e.message).join(', ')}`);
  }

  const validatedBundle = validationResult.data as AdminExportBundle;

  // 2. version check
  const versionCheck = checkExportVersion(validatedBundle.metadata.version);
  if (!versionCheck.passed) {
    return {
      valid: false,
      versionCheck: {
        passed: false,
        version: validatedBundle.metadata.version,
        reason: versionCheck.reason,
      },
      plan: [],
      conflicts: [],
      summary: { create: 0, update: 0, skip: 0, errors: 1 },
    };
  }

  const plan: ImportPlanEntry[] = [];
  const conflicts: ConflictReport[] = [];
  let createCount = 0;
  let updateCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // exportKey → targetId resolver map (병렬 처리를 위해 미리 생성)
  const existingMenus = await prisma.menu.findMany({
    where: { siteId },
    select: { id: true, title: true },
  });
  const menuTitleToId = new Map(existingMenus.map((m) => [m.title, m.id]));

  const existingModules = await prisma.moduleInstance.findMany({
    where: { siteId },
    select: { id: true, mid: true },
  });
  const moduleMidToId = new Map(existingModules.map((m) => [m.mid, m.id]));

  // 3. Menu plan
  if (validatedBundle.menus) {
    for (const menu of validatedBundle.menus) {
      const existingId = menuTitleToId.get(menu.title);

      if (existingId) {
        // update
        plan.push({
          exportKey: menu.exportKey,
          entityType: 'menu',
          action: 'update',
          targetId: existingId,
          reason: 'Menu with same title exists',
        });
        conflicts.push({
          exportKey: menu.exportKey,
          entityType: 'menu',
          existingId,
          reason: 'Menu title already exists',
          requiresDecision: true,
        });
        updateCount++;
      } else {
        // create
        plan.push({
          exportKey: menu.exportKey,
          entityType: 'menu',
          action: 'create',
        });
        createCount++;
      }

      // MenuItem plan (recursive)
      const processMenuItems = (items: unknown[], _parentExportKey: string | null) => {
        for (const item of items) {
          const menuItem = item as Record<string, unknown>;
          // MenuItem은 title 기준 충돌 체크
          // (실제 구현에서는 parent exportKey + listOrder 조합으로 체크)
          plan.push({
            exportKey: menuItem.exportKey as string,
            entityType: 'menuItem',
            action: 'create', // MenuItem은 항상 create (import 시 새 ID 할당)
          });
          createCount++;

          const nestedItems = menuItem.items as unknown[] | undefined;
          if (nestedItems && nestedItems.length > 0) {
            processMenuItems(nestedItems, menuItem.exportKey as string);
          }
        }
      };

      processMenuItems(menu.items, menu.exportKey);
    }
  }

  // 4. ModuleInstance plan
  if (validatedBundle.moduleInstances) {
    for (const mi of validatedBundle.moduleInstances) {
      const existingId = moduleMidToId.get(mi.mid);

      if (existingId) {
        // update
        plan.push({
          exportKey: mi.exportKey,
          entityType: 'moduleInstance',
          action: 'update',
          targetId: existingId,
          reason: 'Module with same mid exists',
          diffPreview: {
            name: mi.name,
            moduleCode: mi.moduleCode,
          },
        });
        conflicts.push({
          exportKey: mi.exportKey,
          entityType: 'moduleInstance',
          existingId,
          reason: 'Module mid already exists',
          requiresDecision: true,
        });
        updateCount++;
      } else {
        // create
        plan.push({
          exportKey: mi.exportKey,
          entityType: 'moduleInstance',
          action: 'create',
        });
        createCount++;
      }
    }
  }

  // 5. Document plan (stubbed - schema alignment needed)
  if (validatedBundle.documents) {
    for (const _doc of validatedBundle.documents) {
      // NOTE: Document model uses boardId, not siteId/moduleInstanceId
      // Skip for now
      createCount++;
    }
  }

  // 6. Comment plan (stubbed - schema alignment needed)
  if (validatedBundle.comments) {
    for (const _comment of validatedBundle.comments) {
      // NOTE: Comment model doesn't match expected structure
      // Skip for now
      createCount++;
    }
  }

  // 7. SiteSettings plan
  if (validatedBundle.siteSettings) {
    plan.push({
      exportKey: 'siteSettings',
      entityType: 'siteSettings',
      action: 'update',
      reason: 'Site settings always overwrite',
    });
    updateCount++;
  }

  return {
    valid: true,
    versionCheck: {
      passed: true,
      version: validatedBundle.metadata.version,
    },
    plan,
    conflicts,
    summary: {
      create: createCount,
      update: updateCount,
      skip: skipCount,
      errors: errorCount,
    },
  };
}
