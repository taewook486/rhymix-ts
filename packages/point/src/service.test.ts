import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PointService } from './service.js';
import { PointAmountInvalidError, PointMemberNotFoundError, PointInsufficientError, PointDuplicateSourceError } from './errors.js';

// Mock helpers
function makeUser(overrides = {}) {
  return {
    id: 1,
    username: 'testuser',
    pointBalance: 0,
    ...overrides,
  };
}

function makePoint(overrides = {}) {
  return {
    id: 1,
    memberId: 1,
    amount: 100,
    sourceType: 'MANUAL',
    sourceId: null,
    reason: 'Test',
    createdAt: new Date(),
    ...overrides,
  };
}

function makePrisma(overrides = {}) {
  const base = {
    user: {
      findUnique: vi.fn().mockResolvedValue(makeUser()),
      update: vi.fn().mockResolvedValue(makeUser()),
    },
    point: {
      create: vi.fn().mockResolvedValue(makePoint()),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    sitePointConfig: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    ...overrides,
  };
  base.$transaction = vi.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(base));
  return base;
}

describe('PointService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: PointService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PointService(prisma as unknown as import('@packages/db/src/prisma.js').PrismaClient);
  });

  describe('add', () => {
    it('should create point row and increment balance when adding valid amount', async () => {
      // Given: member exists with balance 0
      prisma.user.findUnique = vi.fn().mockResolvedValue(makeUser({ id: 1, pointBalance: 0 }));
      prisma.point.create = vi.fn().mockResolvedValue(makePoint({ amount: 100 }));
      prisma.user.update = vi.fn().mockResolvedValue(makeUser({ id: 1, pointBalance: 100 }));

      // When: add 100 points (sourceType 명시 필수 — PointAddInputSchema 요구)
      const result = await service.add({ memberId: 1, amount: 100, reason: 'Test add', sourceType: 'MANUAL' });

      // Then: Point row created, balance incremented to 100
      expect(prisma.point.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 1,
            amount: 100,
            sourceType: 'MANUAL',
            sourceId: null,
            reason: 'Test add',
          }),
        })
      );
      // 실제 구현은 Prisma increment 연산자 사용
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { pointBalance: { increment: 100 } },
        })
      );
      expect(result).toBe(100);
    });

    it('should not create point row when amount is zero', async () => {
      // Given: member exists
      prisma.user.findUnique = vi.fn().mockResolvedValue(makeUser({ pointBalance: 50 }));

      // When: add 0 points (zero amount은 getBalance만 호출)
      const result = await service.add({ memberId: 1, amount: 0, reason: 'Zero', sourceType: 'MANUAL' });

      // Then: no Point row created, returns current balance
      expect(prisma.point.create).not.toHaveBeenCalled();
      expect(result).toBe(50);
    });

    it('should throw PointAmountInvalidError when amount is float', async () => {
      // Given: member exists
      prisma.user.findUnique = vi.fn().mockResolvedValue(makeUser());

      // When/Then: add 0.5 points throws (정수 아님)
      await expect(service.add({ memberId: 1, amount: 0.5, reason: 'Float', sourceType: 'MANUAL' })).rejects.toThrow(
        PointAmountInvalidError
      );
      expect(prisma.point.create).not.toHaveBeenCalled();
    });

    it('should throw PointAmountInvalidError when amount is NaN', async () => {
      // Given: member exists
      prisma.user.findUnique = vi.fn().mockResolvedValue(makeUser());

      // When/Then: add NaN throws
      await expect(service.add({ memberId: 1, amount: NaN, reason: 'NaN', sourceType: 'MANUAL' })).rejects.toThrow(
        PointAmountInvalidError
      );
    });

    it('should throw PointMemberNotFoundError when member does not exist', async () => {
      // Given: member not found
      prisma.user.findUnique = vi.fn().mockResolvedValue(null);

      // When/Then: add points throws
      await expect(service.add({ memberId: 999, amount: 100, reason: 'No user', sourceType: 'MANUAL' })).rejects.toThrow(
        PointMemberNotFoundError
      );
    });

    it('should skip creating duplicate point when sourceId exists and duplicate found', async () => {
      // Given: member exists + duplicate point with same (sourceType, sourceId) exists
      prisma.user.findUnique = vi.fn().mockResolvedValue(makeUser({ pointBalance: 100 }));
      prisma.point.findFirst = vi.fn().mockResolvedValue(
        makePoint({ sourceType: 'DOCUMENT', sourceId: 'doc-123', amount: 50 })
      );

      // When: add with same sourceType and sourceId
      const result = await service.add({
        memberId: 1,
        amount: 50,
        reason: 'Duplicate',
        sourceType: 'DOCUMENT',
        sourceId: 'doc-123',
      });

      // Then: returns current balance without creating new row
      expect(prisma.point.create).not.toHaveBeenCalled();
      expect(result).toBe(100);
    });
  });

  describe('subtract', () => {
    beforeEach(() => {
      // Setup default config: allowNegativeBalance = false, clampToZero = true
      prisma.sitePointConfig.findUnique = vi.fn().mockResolvedValue({
        id: 1,
        allowNegativeBalance: false,
        clampToZero: true,
        signupBonus: 0,
        defaultLevel: 1,
      });
    });

    it('should create negative point row and update balance when sufficient funds', async () => {
      // Given: member with balance 100, allowNegativeBalance = false
      prisma.user.findUnique = vi.fn().mockResolvedValue(makeUser({ id: 1, pointBalance: 100 }));
      prisma.point.create = vi.fn().mockResolvedValue(makePoint({ amount: -50 }));
      prisma.user.update = vi.fn().mockResolvedValue(makeUser({ id: 1, pointBalance: 50 }));

      // When: subtract 50
      const result = await service.subtract({ memberId: 1, amount: 50, reason: 'Test subtract' });

      // Then: Point(-50) created, balance = 50 (실제 구현은 Prisma decrement 사용)
      expect(prisma.point.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 1,
            amount: -50,
            reason: 'Test subtract',
          }),
        })
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { pointBalance: { decrement: 50 } },
        })
      );
      expect(result).toBe(50);
    });

    it('should clamp to zero when insufficient funds and clampToZero is true', async () => {
      // Given: member with balance 30, allowNegativeBalance = false, clampToZero = true
      prisma.user.findUnique = vi.fn().mockResolvedValue(makeUser({ id: 1, pointBalance: 30 }));
      prisma.point.create = vi.fn().mockResolvedValue(makePoint({ amount: -30 }));
      prisma.user.update = vi.fn().mockResolvedValue(makeUser({ id: 1, pointBalance: 0 }));

      // When: subtract 50
      const result = await service.subtract({ memberId: 1, amount: 50, reason: 'Clamp test' });

      // Then: Point(-30) created with reason "(clamped from 50)", balance = 0
      expect(prisma.point.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 1,
            amount: -30,
            reason: expect.stringContaining('clamped from 50'),
          }),
        })
      );
      // 실제 차감량 30으로 decrement
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { pointBalance: { decrement: 30 } },
        })
      );
      expect(result).toBe(0);
    });

    it('should allow negative balance when allowNegativeBalance is true', async () => {
      // Given: member with balance 30, allowNegativeBalance = true
      prisma.sitePointConfig.findUnique = vi.fn().mockResolvedValue({
        id: 1,
        allowNegativeBalance: true,
        clampToZero: false,
        signupBonus: 0,
        defaultLevel: 1,
      });
      prisma.user.findUnique = vi.fn().mockResolvedValue(makeUser({ id: 1, pointBalance: 30 }));
      prisma.point.create = vi.fn().mockResolvedValue(makePoint({ amount: -50 }));
      prisma.user.update = vi.fn().mockResolvedValue(makeUser({ id: 1, pointBalance: -20 }));

      // When: subtract 50
      const result = await service.subtract({ memberId: 1, amount: 50, reason: 'Allow negative' });

      // Then: Point(-50) created, balance = -20 (allowNegativeBalance=true이므로 클램프 없음)
      expect(prisma.point.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 1,
            amount: -50,
            reason: 'Allow negative',
          }),
        })
      );
      // allowNegativeBalance=true → 전액 차감 50
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { pointBalance: { decrement: 50 } },
        })
      );
      expect(result).toBe(-20);
    });
  });

  describe('getBalance', () => {
    it('should return cached balance from User.pointBalance', async () => {
      // Given: member with balance 250
      prisma.user.findUnique = vi.fn().mockResolvedValue(makeUser({ id: 1, pointBalance: 250 }));

      // When: getBalance
      const result = await service.getBalance(1);

      // Then: returns cached balance, single findUnique call
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          select: expect.objectContaining({ pointBalance: true }),
        })
      );
      expect(result).toBe(250);
    });
  });

  describe('getLevel', () => {
    it('should return stub level 1 with default values', async () => {
      // Given: any member
      prisma.user.findUnique = vi.fn().mockResolvedValue(makeUser({ id: 1 }));

      // When: getLevel
      const result = await service.getLevel(1);

      // Then: returns level 1 stub
      expect(result).toEqual({
        level: 1,
        name: 'default',
        iconUrl: null,
        threshold: 0,
      });
    });
  });
});
