/**
 * module-instance-service.test.ts — SPEC-ADMIN-001 Slice A
 *
 * RED 단계: module-instance-service 가 아직 구현되지 않은 상태에서 작성.
 *
 * 통합 테스트: 실제 DB 필요 (SKIP_DB_TESTS=0 으로 실행)
 * REQ-ADMIN-004: onInstall 훅 + 트랜잭션 롤백
 * REQ-ADMIN-005: onUninstall 훅
 * REQ-ADMIN-006: indexModuleInstanceId 참조 시 삭제 금지
 * REQ-ADMIN-007: ModuleConfig 생성 + Zod 검증
 * REQ-ADMIN-001: citext 대소문자 무관 조회
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { prisma } from '@rhymix-ts/db';
import type { ModuleDefinition } from './types';
import {
  createModuleInstance,
  deleteModuleInstance,
  getModuleInstanceByMid,
} from './module-instance-service';
import { registerModule, resetRegistry } from './registry';
import {
  MidConflictError,
  IndexModuleProtectedError,
} from './errors';

// DB 테스트 skip 조건
const skipDb = process.env.SKIP_DB_TESTS !== '0';

// 테스트용 ModuleDefinition 픽스처
const makeBoard = () => ({
  code: 'board',
  displayName: 'Board',
  configSchema: z.object({ skinName: z.string() }),
  defaultConfig: { skinName: 'default' },
  onInstall: vi.fn(async () => {}),
  onUninstall: vi.fn(async () => {}),
  routes: {},
} satisfies ModuleDefinition<{ skinName: string }>);

describe.skipIf(skipDb)('module-instance-service (DB 통합 테스트)', () => {
  let testSiteId: number;
  let boardDef: ReturnType<typeof makeBoard>;

  beforeEach(async () => {
    resetRegistry();
    boardDef = makeBoard();
    registerModule(boardDef);

    // 테스트용 Site 생성 (격리)
    const site = await prisma.site.create({
      data: {
        defaultLanguage: 'ko',
        timeZone: 'Asia/Seoul',
      },
    });
    testSiteId = site.id;
  });

  afterEach(async () => {
    // 테스트 데이터 정리 (cascade 로 연관 데이터 삭제)
    await prisma.site.deleteMany({ where: { id: testSiteId } });
    resetRegistry();
  });

  // A-6: 생성 + onInstall + ModuleConfig
  it('A-6: createModuleInstance 가 ModuleInstance + ModuleConfig 를 생성하고 onInstall 을 호출한다', async () => {
    const result = await createModuleInstance(
      {
        siteId: testSiteId,
        moduleCode: 'board',
        mid: 'notice',
        name: 'Notice',
        actor: { memberId: 1 },
      },
      { prisma },
    );

    // ModuleInstance row 생성
    expect(result.id).toBeDefined();
    expect(result.mid).toBe('notice');
    expect(result.moduleCode).toBe('board');

    // ModuleConfig row 생성
    expect(result.config).toBeDefined();
    expect(result.config?.config).toMatchObject({ skinName: 'default' });

    // onInstall 호출 검증
    expect(boardDef.onInstall).toHaveBeenCalledOnce();
    expect(boardDef.onInstall).toHaveBeenCalledWith(
      expect.objectContaining({
        instance: expect.objectContaining({ id: result.id }),
        actor: expect.objectContaining({ memberId: 1 }),
      }),
    );
  });

  // A-7: 동일 (siteId, mid) 두 번째 호출 → MidConflictError + 롤백
  it('A-7: 동일 (siteId, mid) 중복 생성 → MidConflictError, DB row 는 1개 유지', async () => {
    await createModuleInstance(
      {
        siteId: testSiteId,
        moduleCode: 'board',
        mid: 'notice',
        name: 'Notice',
        actor: { memberId: 1 },
      },
      { prisma },
    );

    await expect(
      createModuleInstance(
        {
          siteId: testSiteId,
          moduleCode: 'board',
          mid: 'notice',
          name: 'Notice 2',
          actor: { memberId: 1 },
        },
        { prisma },
      ),
    ).rejects.toThrow(MidConflictError);

    // row count 는 1개 유지
    const count = await prisma.moduleInstance.count({
      where: { siteId: testSiteId, mid: 'notice' },
    });
    expect(count).toBe(1);
  });

  // A-8: onInstall 실패 → 트랜잭션 전체 롤백 (REQ-ADMIN-004)
  it('A-8: onInstall 실패 시 트랜잭션 전체 롤백 — ModuleInstance / ModuleConfig 0개', async () => {
    boardDef.onInstall.mockRejectedValueOnce(new Error('install failed'));

    await expect(
      createModuleInstance(
        {
          siteId: testSiteId,
          moduleCode: 'board',
          mid: 'qna',
          name: 'Q&A',
          actor: { memberId: 1 },
        },
        { prisma },
      ),
    ).rejects.toThrow('install failed');

    // ModuleInstance / ModuleConfig 행 없음
    const instanceCount = await prisma.moduleInstance.count({
      where: { siteId: testSiteId },
    });
    expect(instanceCount).toBe(0);

    const configCount = await prisma.moduleConfig.count();
    expect(configCount).toBe(0);
  });

  // A-9: indexModuleInstanceId 참조 시 삭제 금지 (REQ-ADMIN-006)
  it('A-9: 인덱스 모듈로 지정된 인스턴스 삭제 → IndexModuleProtectedError', async () => {
    const instance = await createModuleInstance(
      {
        siteId: testSiteId,
        moduleCode: 'board',
        mid: 'hub',
        name: 'Hub',
        actor: { memberId: 1 },
      },
      { prisma },
    );

    // Domain 생성 후 indexModuleInstanceId 설정
    await prisma.domain.create({
      data: {
        siteId: testSiteId,
        hostname: `test-${testSiteId}.local`,
        indexModuleInstanceId: instance.id,
      },
    });

    await expect(
      deleteModuleInstance(instance.id, { memberId: 1 }, { prisma }),
    ).rejects.toThrow(IndexModuleProtectedError);

    // row 잔존 확인
    const count = await prisma.moduleInstance.count({ where: { id: instance.id } });
    expect(count).toBe(1);
  });

  // A-10: 정상 삭제 + onUninstall (REQ-ADMIN-005)
  it('A-10: 정상 삭제 시 onUninstall 호출 + ModuleInstance/ModuleConfig 삭제', async () => {
    const instance = await createModuleInstance(
      {
        siteId: testSiteId,
        moduleCode: 'board',
        mid: 'freetalk',
        name: 'Freetalk',
        actor: { memberId: 1 },
      },
      { prisma },
    );

    const result = await deleteModuleInstance(instance.id, { memberId: 1 }, { prisma });
    expect(result.ok).toBe(true);
    expect(result.deletedId).toBe(instance.id);

    // onUninstall 호출 검증
    expect(boardDef.onUninstall).toHaveBeenCalledOnce();

    // ModuleInstance 삭제 확인
    const instCount = await prisma.moduleInstance.count({ where: { id: instance.id } });
    expect(instCount).toBe(0);

    // ModuleConfig cascade 삭제 확인
    const configCount = await prisma.moduleConfig.count({ where: { moduleInstanceId: instance.id } });
    expect(configCount).toBe(0);
  });

  // A-11: citext 대소문자 무관 조회 (REQ-ADMIN-001)
  it('A-11: mid="Board" 로 생성 후 getModuleInstanceByMid(siteId, "BOARD") 로 조회 가능', async () => {
    // mid 는 소문자만 허용하지만 citext 동작 검증을 위해 DB 직접 insert
    // (validateMid 를 우회하기 위해 prisma 직접 사용)
    const instance = await prisma.moduleInstance.create({
      data: {
        siteId: testSiteId,
        moduleCode: 'board',
        mid: 'board-ci', // 소문자로 저장
        name: 'Board CI',
      },
    });

    // 대문자로 조회 → citext 로 인해 동일 row 반환
    const found = await getModuleInstanceByMid(testSiteId, 'BOARD-CI', { prisma });
    expect(found).not.toBeNull();
    expect(found?.id).toBe(instance.id);
  });
});

// DB 없는 환경에서 실행되는 순수 단위 테스트 (mock prisma)
describe('module-instance-service (단위 테스트 — mock)', () => {
  beforeEach(() => {
    resetRegistry();
  });

  afterEach(() => {
    resetRegistry();
  });

  it('A-6-mock: 유효하지 않은 mid → createModuleInstance 진입 전 에러', async () => {
    const { MidInvalidError } = await import('./errors');
    const board = makeBoard();
    registerModule(board);

    // prisma mock 이 필요 없을 만큼 mid 검증에서 일찍 실패해야 함
    const mockPrisma = {} as Parameters<typeof createModuleInstance>[1]['prisma'];

    await expect(
      createModuleInstance(
        {
          siteId: 1,
          moduleCode: 'board',
          mid: 'INVALID!',  // 패턴 위반
          name: 'Test',
          actor: { memberId: 1 },
        },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(MidInvalidError);
  });

  it('A-6-mock-reserved: 예약어 mid → createModuleInstance 진입 전 에러', async () => {
    const { MidReservedError } = await import('./errors');
    const board = makeBoard();
    registerModule(board);

    const mockPrisma = {} as Parameters<typeof createModuleInstance>[1]['prisma'];

    await expect(
      createModuleInstance(
        {
          siteId: 1,
          moduleCode: 'board',
          mid: 'admin',  // 예약어
          name: 'Test',
          actor: { memberId: 1 },
        },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(MidReservedError);
  });
});
