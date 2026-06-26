import { describe, it, expect } from 'vitest';
import { createMockPrismaClient, type MockPrismaClient } from './prisma-mock.js';

describe('createMockPrismaClient', () => {
  it('should create a mock client with all model delegates defined', () => {
    const mockPrisma = createMockPrismaClient();

    // Verify core model delegates are defined (not undefined)
    expect(mockPrisma.document).toBeDefined();
    expect(mockPrisma.board).toBeDefined();
    expect(mockPrisma.user).toBeDefined();
    expect(mockPrisma.$transaction).toBeDefined();
  });

  it('should allow overriding model method return values', async () => {
    const mockPrisma = createMockPrismaClient();

    // Setup mock return value (use minimal object for test)
    const fakeDocument = { id: 1, title: 'Test' };
    mockPrisma.document.findFirst.mockResolvedValue(fakeDocument as any);

    // Call and verify
    const result = await mockPrisma.document.findFirst();
    expect(result).toEqual(fakeDocument);
    expect(mockPrisma.document.findFirst).toHaveBeenCalledOnce();
  });

  it('should handle $transaction in callback form', async () => {
    const mockPrisma = createMockPrismaClient();

    // Callback form: $transaction((tx) => {...})
    const fakeDocument = { id: 1, title: 'Transaction Test' };
    mockPrisma.document.create.mockResolvedValue(fakeDocument as any);

    const result = await mockPrisma.$transaction(async (tx) => {
      // tx should be the same mock client
      return await tx.document.create({ data: { title: 'Transaction Test' } } as any);
    });

    expect(result).toEqual(fakeDocument);
    expect(mockPrisma.document.create).toHaveBeenCalledOnce();
  });

  it('should handle $transaction in array form', async () => {
    const mockPrisma = createMockPrismaClient();

    // Array form: $transaction([promise1, promise2, ...])
    const doc1 = { id: 1, title: 'Doc 1' };
    const doc2 = { id: 2, title: 'Doc 2' };

    mockPrisma.document.findFirst.mockResolvedValue(doc1 as any);
    mockPrisma.document.findMany.mockResolvedValue([doc2] as any);

    const results = await mockPrisma.$transaction([
      mockPrisma.document.findFirst(),
      mockPrisma.document.findMany(),
    ]);

    expect(results).toEqual([doc1, [doc2]]);
    expect(mockPrisma.document.findFirst).toHaveBeenCalledOnce();
    expect(mockPrisma.document.findMany).toHaveBeenCalledOnce();
  });

  it('should provide all standard Prisma methods on model delegates', () => {
    const mockPrisma = createMockPrismaClient();

    // Verify standard methods exist
    const document = mockPrisma.document;
    expect(document.findFirst).toBeDefined();
    expect(document.findMany).toBeDefined();
    expect(document.findUnique).toBeDefined();
    expect(document.findUniqueOrThrow).toBeDefined();
    expect(document.create).toBeDefined();
    expect(document.update).toBeDefined();
    expect(document.delete).toBeDefined();
    expect(document.count).toBeDefined();
    expect(document.aggregate).toBeDefined();
    expect(document.groupBy).toBeDefined();
  });
});
