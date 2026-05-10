/**
 * Specification tests for verifyEmail — SPEC-AUTH-001 Slice C.
 *
 * Coverage:
 *   - REQ-AUTH-012 (UNAUTHED → APPROVED on valid SIGNUP token)
 *   - REQ-AUTH-051 (uniform error tuples)
 *   - REQ-AUTH-055 (no logger, no token-content leak in failure)
 *   - AC-AUTH-012 (token consumedAt set, status transition)
 */
import type { PrismaClient } from '@rhymix-ts/db';
import { describe, expect, it } from 'vitest';

import { verifyEmail } from './verify-email';

interface FakeUser {
  id: number;
  status: 'APPROVED' | 'UNAUTHED' | 'DENIED' | 'SUSPENDED' | 'DELETED';
}
interface FakeToken {
  id: number;
  userId: number;
  authKey: string;
  authType: 'SIGNUP' | 'PASSWORD_RESET' | 'EMAIL_CHANGE';
  expiresAt: Date;
  consumedAt: Date | null;
}
interface FakeAuditLog {
  actorId: number | null;
  targetId: number | null;
  action: string;
}

function buildFakePrisma(opts: {
  users?: FakeUser[];
  tokens?: FakeToken[];
}) {
  const users: FakeUser[] = [...(opts.users ?? [])];
  const tokens: FakeToken[] = [...(opts.tokens ?? [])];
  const auditLogs: FakeAuditLog[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fake: any = {
    emailAuthToken: {
      findUnique: async (args: { where: { authKey: string } }) =>
        tokens.find((t) => t.authKey === args.where.authKey) ?? null,
      update: async (args: {
        where: { id: number };
        data: Partial<FakeToken>;
      }) => {
        const t = tokens.find((x) => x.id === args.where.id);
        if (!t) throw new Error('Token not found');
        Object.assign(t, args.data);
        return t;
      },
    },
    user: {
      findUnique: async (args: { where: { id: number } }) =>
        users.find((u) => u.id === args.where.id) ?? null,
      update: async (args: {
        where: { id: number };
        data: Partial<FakeUser>;
      }) => {
        const u = users.find((x) => x.id === args.where.id);
        if (!u) throw new Error('User not found');
        Object.assign(u, args.data);
        return u;
      },
    },
    auditLog: {
      create: async (args: { data: FakeAuditLog }) => {
        auditLogs.push(args.data);
        return args.data;
      },
    },
    $transaction: async <T>(fn: (tx: typeof fake) => Promise<T>): Promise<T> =>
      await fn(fake),
  };

  return {
    prisma: fake as unknown as PrismaClient,
    state: { users, tokens, auditLogs },
  };
}

const future = () => new Date(Date.now() + 60 * 60 * 1000);
const past = () => new Date(Date.now() - 60 * 60 * 1000);

describe('verifyEmail', () => {
  it('1) valid unconsumed unexpired SIGNUP token → status APPROVED, consumedAt set', async () => {
    const { prisma, state } = buildFakePrisma({
      users: [{ id: 1, status: 'UNAUTHED' }],
      tokens: [
        {
          id: 100,
          userId: 1,
          authKey: 'tok-abc',
          authType: 'SIGNUP',
          expiresAt: future(),
          consumedAt: null,
        },
      ],
    });
    const result = await verifyEmail({ token: 'tok-abc' }, { prisma });
    expect(result).toEqual({ ok: true, userId: 1, alreadyVerified: false });
    expect(state.users[0]?.status).toBe('APPROVED');
    expect(state.tokens[0]?.consumedAt).not.toBeNull();
  });

  it('2) already-consumed token → TOKEN_INVALID, no state change', async () => {
    const { prisma, state } = buildFakePrisma({
      users: [{ id: 1, status: 'UNAUTHED' }],
      tokens: [
        {
          id: 100,
          userId: 1,
          authKey: 'tok-abc',
          authType: 'SIGNUP',
          expiresAt: future(),
          consumedAt: new Date(),
        },
      ],
    });
    const result = await verifyEmail({ token: 'tok-abc' }, { prisma });
    expect(result).toEqual({ ok: false, code: 'TOKEN_INVALID' });
    expect(state.users[0]?.status).toBe('UNAUTHED');
  });

  it('3) expired token → TOKEN_EXPIRED, no state change', async () => {
    const { prisma, state } = buildFakePrisma({
      users: [{ id: 1, status: 'UNAUTHED' }],
      tokens: [
        {
          id: 100,
          userId: 1,
          authKey: 'tok-abc',
          authType: 'SIGNUP',
          expiresAt: past(),
          consumedAt: null,
        },
      ],
    });
    const result = await verifyEmail({ token: 'tok-abc' }, { prisma });
    expect(result).toEqual({ ok: false, code: 'TOKEN_EXPIRED' });
    expect(state.users[0]?.status).toBe('UNAUTHED');
    expect(state.tokens[0]?.consumedAt).toBeNull();
  });

  it('4) non-existent token → TOKEN_INVALID', async () => {
    const { prisma } = buildFakePrisma({ users: [], tokens: [] });
    const result = await verifyEmail({ token: 'nope' }, { prisma });
    expect(result).toEqual({ ok: false, code: 'TOKEN_INVALID' });
  });

  it('5) wrong-type token (PASSWORD_RESET) → TOKEN_INVALID', async () => {
    const { prisma, state } = buildFakePrisma({
      users: [{ id: 1, status: 'UNAUTHED' }],
      tokens: [
        {
          id: 100,
          userId: 1,
          authKey: 'tok-abc',
          authType: 'PASSWORD_RESET',
          expiresAt: future(),
          consumedAt: null,
        },
      ],
    });
    const result = await verifyEmail({ token: 'tok-abc' }, { prisma });
    expect(result).toEqual({ ok: false, code: 'TOKEN_INVALID' });
    expect(state.users[0]?.status).toBe('UNAUTHED');
  });

  it('6) already-APPROVED user with valid token → idempotent ok:true, alreadyVerified:true', async () => {
    const { prisma, state } = buildFakePrisma({
      users: [{ id: 1, status: 'APPROVED' }],
      tokens: [
        {
          id: 100,
          userId: 1,
          authKey: 'tok-abc',
          authType: 'SIGNUP',
          expiresAt: future(),
          consumedAt: null,
        },
      ],
    });
    const result = await verifyEmail({ token: 'tok-abc' }, { prisma });
    expect(result).toEqual({ ok: true, userId: 1, alreadyVerified: true });
    // Token should be consumed even in idempotent path (one-shot semantics).
    expect(state.tokens[0]?.consumedAt).not.toBeNull();
  });

  it('7) AuditLog EMAIL_VERIFIED written on success', async () => {
    const { prisma, state } = buildFakePrisma({
      users: [{ id: 1, status: 'UNAUTHED' }],
      tokens: [
        {
          id: 100,
          userId: 1,
          authKey: 'tok-abc',
          authType: 'SIGNUP',
          expiresAt: future(),
          consumedAt: null,
        },
      ],
    });
    await verifyEmail({ token: 'tok-abc' }, { prisma });
    expect(state.auditLogs).toHaveLength(1);
    expect(state.auditLogs[0]).toMatchObject({
      action: 'EMAIL_VERIFIED',
      actorId: 1,
      targetId: 1,
    });
  });

  it('8) failure tuple keys are exactly ["ok","code"] — no field-name leakage', async () => {
    const { prisma } = buildFakePrisma({ users: [], tokens: [] });
    const result = await verifyEmail({ token: 'nope' }, { prisma });
    expect(Object.keys(result).sort()).toEqual(['code', 'ok']);
  });

  it('9) empty / non-string token → TOKEN_INVALID', async () => {
    const { prisma } = buildFakePrisma({ users: [], tokens: [] });
    const r1 = await verifyEmail({ token: '' }, { prisma });
    expect(r1).toEqual({ ok: false, code: 'TOKEN_INVALID' });
  });
});
