import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

export type MockPrismaClient = DeepMockProxy<PrismaClient>;

export function createMockPrismaClient(): MockPrismaClient {
  const client = mockDeep<PrismaClient>();

  // @MX:NOTE: $transaction mock implementation handles both callback and array forms
  // The callback form passes the same mock client instance to the transaction function
  client.$transaction.mockImplementation((arg: unknown) => {
    if (typeof arg === 'function') {
      // Callback form: $transaction((tx) => {...})
      // Pass the same mock client to the callback so tx.* calls resolve correctly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (arg as (tx: PrismaClient) => any)(client);
    }
    // Array form: $transaction([promise1, promise2, ...])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Promise.all(arg as any);
  });

  return client;
}
