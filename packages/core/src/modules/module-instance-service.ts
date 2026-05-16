/**
 * module-instance-service.ts — SPEC-ADMIN-001 Slice A
 *
 * 모듈 인스턴스 CRUD 서비스 함수.
 * tRPC, install seed, programmatic API 가 모두 이 함수를 통과해야 한다.
 *
 * @MX:ANCHOR: createModuleInstance — REQ-ADMIN-004 의 onInstall 트랜잭션 단일 진입점
 * @MX:REASON: validateMid + ModuleRegistry.get + prisma.$transaction(onInstall) 가 한 곳에서
 *             실행되어 우회 경로가 생기지 않는다. 어떤 경로도 이 함수를 거치지 않고
 *             ModuleInstance 를 만들 수 없도록 한다.
 *
 * @MX:ANCHOR: deleteModuleInstance — REQ-ADMIN-005/006 의 onUninstall + 인덱스 보호 단일 진입점
 * @MX:REASON: indexModuleInstanceId 사전 조회 + onUninstall + 삭제가 단일 트랜잭션으로 묶여야
 *             부분 적용을 방지할 수 있다.
 */

import type { PrismaClient, ModuleInstance, ModuleConfig } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { validateMid } from './mid-validator';
import { getModule } from './registry';
import {
  MidInvalidError,
  MidLengthError,
  MidReservedError,
  MidConflictError,
  IndexModuleProtectedError,
} from './errors';

// ---------------------------------------------------------------------------
// 입력 타입
// ---------------------------------------------------------------------------

export interface CreateInstanceInput {
  siteId: number;
  moduleCode: string;
  mid: string;
  name: string;
  /** 미지정 시 ModuleDefinition.defaultConfig 사용 */
  config?: unknown;
  actor: { memberId: number; ip?: string; userAgent?: string };
}

// ---------------------------------------------------------------------------
// createModuleInstance
// ---------------------------------------------------------------------------

/**
 * 모듈 인스턴스를 생성한다.
 *
 * 순서:
 * 1. validateMid (길이 → 패턴 → 예약어)
 * 2. getModule (레지스트리 조회)
 * 3. configSchema.parse (Zod 검증 — REQ-ADMIN-007)
 * 4. prisma.$transaction:
 *    a. ModuleInstance 생성
 *    b. ModuleConfig 생성
 *    c. onInstall 훅 호출 (실패 시 전체 롤백 — REQ-ADMIN-004)
 */
export async function createModuleInstance(
  input: CreateInstanceInput,
  ctx: { prisma: PrismaClient },
): Promise<ModuleInstance & { config: ModuleConfig | null }> {
  const { siteId, moduleCode, mid, name, config: rawConfig, actor } = input;

  // 단계 1: mid 검증
  const validation = validateMid(mid);
  if (!validation.ok) {
    switch (validation.code) {
      case 'INVALID_LENGTH':
        throw new MidLengthError(mid);
      case 'RESERVED_KEYWORD':
        throw new MidReservedError(mid);
      case 'INVALID_PATTERN':
        throw new MidInvalidError(mid);
    }
  }

  // 단계 2: 레지스트리에서 모듈 정의 조회
  const def = getModule(moduleCode);

  // 단계 3: 설정 Zod 검증
  const parsedConfig = def.configSchema.parse(
    rawConfig !== undefined ? rawConfig : def.defaultConfig,
  );

  // 단계 4: 트랜잭션 — 생성 + onInstall
  try {
    const result = await ctx.prisma.$transaction(async (tx) => {
      // ModuleInstance 생성
      const instance = await tx.moduleInstance.create({
        data: { siteId, moduleCode, mid, name },
      });

      // ModuleConfig 생성 (REQ-ADMIN-007)
      await tx.moduleConfig.create({
        data: {
          moduleInstanceId: instance.id,
          config: parsedConfig as Prisma.InputJsonValue,
        },
      });

      // onInstall 훅 (실패 시 트랜잭션 롤백)
      if (def.onInstall) {
        await def.onInstall({ tx, instance, actor });
      }

      // config 포함한 최종 row 반환
      return tx.moduleInstance.findUniqueOrThrow({
        where: { id: instance.id },
        include: { config: true },
      });
    });

    return result;
  } catch (err) {
    // Prisma unique 제약 위반 → MidConflictError 로 변환
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new MidConflictError(siteId, mid);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// deleteModuleInstance
// ---------------------------------------------------------------------------

/**
 * 모듈 인스턴스를 삭제한다.
 *
 * 순서:
 * 1. 인스턴스 조회 (없으면 에러)
 * 2. indexModuleInstanceId 참조 여부 확인 (REQ-ADMIN-006)
 * 3. prisma.$transaction:
 *    a. onUninstall 훅 호출 (REQ-ADMIN-005)
 *    b. ModuleInstance 삭제 (ModuleConfig 는 cascade)
 */
export async function deleteModuleInstance(
  instanceId: number,
  actor: { memberId: number; ip?: string; userAgent?: string },
  ctx: { prisma: PrismaClient },
): Promise<{ ok: true; deletedId: number }> {
  // 단계 1: 인스턴스 조회
  const instance = await ctx.prisma.moduleInstance.findUniqueOrThrow({
    where: { id: instanceId },
  });

  // 단계 2: 인덱스 모듈 보호 (REQ-ADMIN-006)
  const indexDomainCount = await ctx.prisma.domain.count({
    where: { indexModuleInstanceId: instanceId },
  });
  if (indexDomainCount > 0) {
    throw new IndexModuleProtectedError(instanceId);
  }

  // 단계 3: 트랜잭션 — onUninstall + 삭제
  const def = getModule(instance.moduleCode);

  await ctx.prisma.$transaction(async (tx) => {
    if (def.onUninstall) {
      await def.onUninstall({ tx, instance, actor });
    }
    await tx.moduleInstance.delete({ where: { id: instanceId } });
  });

  return { ok: true, deletedId: instanceId };
}

// ---------------------------------------------------------------------------
// getModuleInstanceByMid
// ---------------------------------------------------------------------------

/**
 * (siteId, mid) 로 모듈 인스턴스를 조회한다.
 * mid 는 citext 컬럼이므로 대소문자 무관 조회 가능 (REQ-ADMIN-001).
 */
export async function getModuleInstanceByMid(
  siteId: number,
  mid: string,
  ctx: { prisma: PrismaClient },
): Promise<(ModuleInstance & { config: ModuleConfig | null }) | null> {
  return ctx.prisma.moduleInstance.findFirst({
    where: {
      siteId,
      // citext 컬럼이므로 PostgreSQL 레벨에서 대소문자 무관 비교
      mid: {
        equals: mid,
        mode: 'insensitive',
      },
    },
    include: { config: true },
  });
}
