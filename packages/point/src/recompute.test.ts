import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PointService } from './service';

// Mock helpers
function makeUser(overrides = {}) {
  return {
    id: 1,
    username: 'testuser',
    pointBalance: 0,
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
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    ...overrides,
  };
  base.$transaction = vi.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(base));
  return base;
}

describe('PointService.recompute', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: PointService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PointService(prisma as unknown as import('@packages/db/src/prisma.js').PrismaClient);
  });

  it('should set balance to SUM(amount) when points exist', async () => {
    // Given: aggregate returns sum 150
    prisma.point.aggregate = vi.fn().mockResolvedValue({ _sum: { amount: 150 } });
    prisma.user.update = vi.fn().mockResolvedValue(makeUser({ pointBalance: 150 }));

    // When: recompute
    const result = await service.recompute(1);

    // Then: user.update called with pointBalance=150, returns 150
    expect(prisma.point.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { memberId: 1 },
        _sum: { amount: true },
      })
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { pointBalance: 150 },
      })
    );
    expect(result).toBe(150);
  });

  it('should set balance to 0 when no points exist (amount is null)', async () => {
    // Given: aggregate returns null (no points)
    prisma.point.aggregate = vi.fn().mockResolvedValue({ _sum: { amount: null } });
    prisma.user.update = vi.fn().mockResolvedValue(makeUser({ pointBalance: 0 }));

    // When: recompute
    const result = await service.recompute(1);

    // Then: balance set to 0
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { pointBalance: 0 },
      })
    );
    expect(result).toBe(0);
  });
});
