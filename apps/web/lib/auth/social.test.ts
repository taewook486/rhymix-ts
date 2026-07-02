/**
 * Tests for SPEC-SOCIAL-LOGIN-001 OAuth signIn callback — exercises the REAL
 * `createSignInCallback` factory from ./callbacks (not a parallel reimplementation),
 * matching the dependency-injection pattern used for jwt/session callbacks in
 * config.test.ts. `fakePrisma` is an in-memory stand-in for the subset of the
 * Prisma API the callback calls (`user.findUnique/create`, `socialAccount.findUnique/create`).
 *
 * Tests the signIn callback behavior for:
 * - New user social signup (REQ-SOCIAL-003)
 * - Account linking for existing users, verified-email only (REQ-SOCIAL-004, SECURITY FIX)
 * - Nickname collision handling (REQ-SOCIAL-003)
 * - Subsequent sign-ins with existing SocialAccount
 */

import { beforeEach, describe, expect, it } from 'vitest';

// Slice E 이후 @rhymix-ts/auth 의 index.ts 가 rbac.ts -> @rhymix-ts/db 를 끌어오므로 모킹 필요.
import { vi } from 'vitest';
vi.mock('@rhymix-ts/db', () => ({
  Prisma: { sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }) },
  PrismaClient: class {},
}));

import { createSignInCallback } from './callbacks';

// ---------------------------------------------------------------------------
// In-memory fake Prisma — implements only the methods the signIn callback calls
// ---------------------------------------------------------------------------

interface FakeUser {
  id: number;
  userId: string;
  emailAddress: string;
  nickName: string;
  status: string;
}

interface FakeSocialAccount {
  id: number;
  userId: number;
  provider: string;
  providerAccountId: string;
}

let mockUsers: FakeUser[] = [];
let mockSocialAccounts: FakeSocialAccount[] = [];

function makeFakePrisma() {
  return {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { emailAddress?: string; nickName?: string } }) => {
        if (where.emailAddress) {
          return mockUsers.find((u) => u.emailAddress === where.emailAddress) ?? null;
        }
        if (where.nickName) {
          return mockUsers.find((u) => u.nickName === where.nickName) ?? null;
        }
        return null;
      }),
      create: vi.fn(async ({ data }: { data: Omit<FakeUser, 'id'> }) => {
        const newUser: FakeUser = { id: mockUsers.length + 1, ...data };
        mockUsers.push(newUser);
        return newUser;
      }),
    },
    socialAccount: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { provider_providerAccountId: { provider: string; providerAccountId: string } };
        }) => {
          const { provider, providerAccountId } = where.provider_providerAccountId;
          return (
            mockSocialAccounts.find(
              (sa) => sa.provider === provider && sa.providerAccountId === providerAccountId,
            ) ?? null
          );
        },
      ),
      create: vi.fn(async ({ data }: { data: Omit<FakeSocialAccount, 'id'> }) => {
        const newSa: FakeSocialAccount = { id: mockSocialAccounts.length + 1, ...data };
        mockSocialAccounts.push(newSa);
        return newSa;
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

interface SignInCallbackInput {
  account: { provider: string; providerAccountId: string } | null;
  user: { id?: string; email?: string; name?: string } | null;
  profile?: Record<string, unknown> | null;
}

function makeSignInCb() {
  return createSignInCallback({ prisma: makeFakePrisma() });
}

// createSignInCallback closes over a single `prisma` instance per call, so each
// test must build its own callback bound to a fresh fake prisma referencing the
// same mockUsers/mockSocialAccounts arrays reset in beforeEach.

beforeEach(() => {
  mockUsers = [];
  mockSocialAccounts = [];
});

describe('OAuth sign-in callback — SPEC-SOCIAL-LOGIN-001', () => {
  describe('New user social signup (REQ-SOCIAL-003)', () => {
    it('should create new User and SocialAccount for first-time Kakao login', async () => {
      const signInCb = makeSignInCb();
      const input: SignInCallbackInput = {
        account: { provider: 'kakao', providerAccountId: 'kakao_new1' },
        user: { id: '1', email: 'new1@example.com', name: 'NewUser1' },
        profile: { email: 'new1@example.com', name: 'NewUser1' },
      };

      const result = await signInCb(input as never);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(1);
      expect(mockSocialAccounts).toHaveLength(1);
      expect(mockUsers[0]?.emailAddress).toBe('new1@example.com');
      expect(mockUsers[0]?.status).toBe('APPROVED');
    });

    it('should create new User and SocialAccount for first-time Google login', async () => {
      const signInCb = makeSignInCb();
      const input: SignInCallbackInput = {
        account: { provider: 'google', providerAccountId: 'google_new1' },
        user: { id: '1', email: 'new2@example.com', name: 'NewUser2' },
        profile: { email: 'new2@example.com', name: 'NewUser2' },
      };

      const result = await signInCb(input as never);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(1);
      expect(mockSocialAccounts).toHaveLength(1);
    });

    it('should handle nickname collision by appending random suffix (REQ-SOCIAL-003)', async () => {
      mockUsers.push({
        id: 50,
        userId: 'existing',
        emailAddress: 'taken@example.com',
        nickName: 'PopularName',
        status: 'APPROVED',
      });

      const signInCb = makeSignInCb();
      const input: SignInCallbackInput = {
        account: { provider: 'kakao', providerAccountId: 'kakao_collide' },
        user: { id: '2', email: 'collide@example.com', name: 'PopularName' },
        profile: { email: 'collide@example.com', name: 'PopularName' },
      };

      const result = await signInCb(input as never);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(2);
      expect(mockUsers[1]?.nickName).not.toBe('PopularName');
      expect(mockUsers[1]?.nickName).toMatch(/^PopularName_\d+$/);
    });

    it('should approve new social user without email verification (REQ-SOCIAL-003)', async () => {
      const signInCb = makeSignInCb();
      const input: SignInCallbackInput = {
        account: { provider: 'google', providerAccountId: 'google_instant' },
        user: { id: '3', email: 'instant@example.com', name: 'InstantUser' },
        profile: { email: 'instant@example.com', name: 'InstantUser' },
      };

      const result = await signInCb(input as never);

      expect(result).toBe(true);
      expect(mockUsers[0]?.status).toBe('APPROVED');
    });
  });

  describe('Account linking for existing users (REQ-SOCIAL-004)', () => {
    it('should link social account to existing user with verified email', async () => {
      mockUsers.push({
        id: 60,
        userId: 'linkme',
        emailAddress: 'linkme@example.com',
        nickName: 'LinkMeUser',
        status: 'APPROVED',
      });

      const signInCb = makeSignInCb();
      const input: SignInCallbackInput = {
        account: { provider: 'kakao', providerAccountId: 'kakao_link' },
        user: { id: '4', email: 'linkme@example.com', name: 'LinkMeUser' },
        profile: {
          email: 'linkme@example.com',
          name: 'LinkMeUser',
          kakao_account: { is_email_verified: true },
        },
      };

      const result = await signInCb(input as never);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(1); // No new user — linked to existing
      expect(mockSocialAccounts).toHaveLength(1);
      expect(mockSocialAccounts[0]?.userId).toBe(60);
    });

    it('should allow multiple social accounts linked to same user', async () => {
      mockUsers.push({
        id: 61,
        userId: 'multi',
        emailAddress: 'multi@example.com',
        nickName: 'MultiUser',
        status: 'APPROVED',
      });

      const prisma = makeFakePrisma();
      const signInCb = createSignInCallback({ prisma });

      const kakaoResult = await signInCb({
        account: { provider: 'kakao', providerAccountId: 'kakao_multi' },
        user: { id: '5', email: 'multi@example.com', name: 'MultiUser' },
        profile: {
          email: 'multi@example.com',
          name: 'MultiUser',
          kakao_account: { is_email_verified: true },
        },
      } as never);

      const googleResult = await signInCb({
        account: { provider: 'google', providerAccountId: 'google_multi' },
        user: { id: '6', email: 'multi@example.com', name: 'MultiUser' },
        profile: { email: 'multi@example.com', name: 'MultiUser', email_verified: true },
      } as never);

      expect(kakaoResult).toBe(true);
      expect(googleResult).toBe(true);
      expect(mockUsers).toHaveLength(1);
      expect(mockSocialAccounts).toHaveLength(2);
      expect(mockSocialAccounts.every((sa) => sa.userId === 61)).toBe(true);
    });

    it('should REJECT sign-in when Google email is NOT verified (SECURITY FIX — account takeover prevention)', async () => {
      mockUsers.push({
        id: 999,
        userId: 'victim',
        emailAddress: 'victim@example.com',
        nickName: 'VictimUser',
        status: 'APPROVED',
      });

      const signInCb = makeSignInCb();
      const input: SignInCallbackInput = {
        account: { provider: 'google', providerAccountId: 'attacker_unverified' },
        user: { id: '1000', email: 'victim@example.com', name: 'AttackerUser' },
        profile: {
          email: 'victim@example.com',
          name: 'AttackerUser',
          email_verified: false, // UNVERIFIED email
        },
      };

      const result = await signInCb(input as never);

      // Must be rejected outright — must NOT link, and must NOT create a duplicate
      // User with the victim's (unique) email either.
      expect(result).toBe(false);
      expect(mockUsers).toHaveLength(1); // No new user created
      expect(mockSocialAccounts).toHaveLength(0); // No link created
    });

    it('should REJECT sign-in when Kakao email is NOT verified (SECURITY FIX — account takeover prevention)', async () => {
      mockUsers.push({
        id: 888,
        userId: 'victim2',
        emailAddress: 'victim2@example.com',
        nickName: 'VictimUser2',
        status: 'APPROVED',
      });

      const signInCb = makeSignInCb();
      const input: SignInCallbackInput = {
        account: { provider: 'kakao', providerAccountId: 'attacker_kakao_unverified' },
        user: { id: '1001', email: 'victim2@example.com', name: 'AttackerKakao' },
        profile: {
          email: 'victim2@example.com',
          name: 'AttackerKakao',
          kakao_account: { is_email_verified: false }, // UNVERIFIED
        },
      };

      const result = await signInCb(input as never);

      expect(result).toBe(false);
      expect(mockUsers).toHaveLength(1);
      expect(mockSocialAccounts).toHaveLength(0);
    });

    it('should REJECT when email_verified field is entirely absent from profile (fail closed, not fail open)', async () => {
      mockUsers.push({
        id: 777,
        userId: 'victim3',
        emailAddress: 'victim3@example.com',
        nickName: 'VictimUser3',
        status: 'APPROVED',
      });

      const signInCb = makeSignInCb();
      const input: SignInCallbackInput = {
        account: { provider: 'google', providerAccountId: 'no_verified_field' },
        user: { id: '1002', email: 'victim3@example.com', name: 'Attacker3' },
        profile: { email: 'victim3@example.com', name: 'Attacker3' }, // no email_verified key at all
      };

      const result = await signInCb(input as never);

      expect(result).toBe(false);
      expect(mockSocialAccounts).toHaveLength(0);
    });
  });

  describe('Subsequent sign-ins with existing SocialAccount', () => {
    it('should sign in existing user without creating new records', async () => {
      mockUsers.push({
        id: 70,
        userId: 'returning',
        emailAddress: 'returning@example.com',
        nickName: 'ReturningUser',
        status: 'APPROVED',
      });
      mockSocialAccounts.push({
        id: 10,
        userId: 70,
        provider: 'kakao',
        providerAccountId: 'kakao_returning',
      });

      const signInCb = makeSignInCb();
      // Re-seed the fresh fake prisma used by signInCb with the same state, since
      // makeSignInCb() builds its own fakePrisma closure over the shared arrays —
      // pushes above already mutated the shared arrays makeFakePrisma() reads from.
      const input: SignInCallbackInput = {
        account: { provider: 'kakao', providerAccountId: 'kakao_returning' },
        user: { id: '999', email: 'returning@example.com', name: 'ReturningUser' },
      };

      const result = await signInCb(input as never);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(1);
      expect(mockSocialAccounts).toHaveLength(1);
    });

    it('should not create duplicate SocialAccount for same provider+providerAccountId', async () => {
      mockUsers.push({
        id: 80,
        userId: 'nodup',
        emailAddress: 'nodup@example.com',
        nickName: 'NoDupUser',
        status: 'APPROVED',
      });
      mockSocialAccounts.push({
        id: 11,
        userId: 80,
        provider: 'google',
        providerAccountId: 'google_nodup',
      });

      const signInCb = makeSignInCb();
      const input: SignInCallbackInput = {
        account: { provider: 'google', providerAccountId: 'google_nodup' },
        user: { id: '999', email: 'nodup@example.com', name: 'NoDupUser' },
      };

      const result = await signInCb(input as never);

      expect(result).toBe(true);
      expect(mockSocialAccounts).toHaveLength(1);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should skip OAuth handling for credentials login (no account)', async () => {
      const signInCb = makeSignInCb();
      const result = await signInCb({ account: null, user: { id: '1' } } as never);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(0);
      expect(mockSocialAccounts).toHaveLength(0);
    });

    it('should skip OAuth handling for unsupported providers', async () => {
      const signInCb = makeSignInCb();
      const result = await signInCb({
        account: { provider: 'facebook', providerAccountId: 'fb_123' },
        user: { id: '1' },
      } as never);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(0);
      expect(mockSocialAccounts).toHaveLength(0);
    });

    it('should handle missing email gracefully', async () => {
      const signInCb = makeSignInCb();
      const result = await signInCb({
        account: { provider: 'kakao', providerAccountId: 'kakao_noemail' },
        user: { id: '1', name: 'NoEmailUser' },
        profile: { name: 'NoEmailUser' },
      } as never);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(1);
      expect(mockUsers[0]?.emailAddress).toContain('@temp.local');
    });

    it('should handle missing nickname gracefully', async () => {
      const signInCb = makeSignInCb();
      const result = await signInCb({
        account: { provider: 'google', providerAccountId: 'google_noname' },
        user: { id: '1', email: 'noname@example.com' },
      } as never);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(1);
      expect(mockUsers[0]?.nickName).toMatch(/^user_google_/);
    });
  });
});
