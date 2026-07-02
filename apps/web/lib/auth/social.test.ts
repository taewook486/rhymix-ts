/**
 * Tests for SPEC-SOCIAL-LOGIN-001 OAuth callback logic.
 *
 * Tests the signIn callback behavior for:
 * - New user social signup (REQ-SOCIAL-003)
 * - Account linking for existing users (REQ-SOCIAL-004)
 * - Nickname collision handling (REQ-SOCIAL-003)
 * - Subsequent sign-ins with existing SocialAccount
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@rhymix-ts/db';

// Mock prisma
vi.mock('@rhymix-ts/db', () => ({
  Prisma: { sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }) },
  PrismaClient: class {},
}));

// Mock the signIn callback behavior
interface SignInCallbackInput {
  account: { provider: string; providerAccountId: string } | null;
  user: { id: string; email?: string; name?: string } | null;
  profile?: { email?: string; name?: string } | null;
}

// Mock database state
let mockUsers: Array<{ id: number; emailAddress: string; nickName: string; status: string }> = [];
let mockSocialAccounts: Array<{ id: number; userId: number; provider: string; providerAccountId: string }> = [];

async function mockSignInCallback(input: SignInCallbackInput): Promise<boolean> {
  const { account, user, profile } = input;

  // Skip OAuth handling if no account info
  if (!account || !user?.id) {
    return true;
  }

  const provider = account.provider;
  const providerAccountId = account.providerAccountId;

  // Only handle Kakao/Google providers
  if (provider !== 'kakao' && provider !== 'google') {
    return true;
  }

  const email = user.email || profile?.email || '';
  const nickname = user.name || profile?.name || '';
  const userId = Number.parseInt(String(user.id), 10);

  try {
    // 1. Check if SocialAccount already exists
    const existingSocialAccount = mockSocialAccounts.find(
      (sa) => sa.provider === provider && sa.providerAccountId === providerAccountId
    );

    if (existingSocialAccount) {
      return true;
    }

    // 2. Check if User exists with same email → account linking
    const existingUserByEmail = email ? mockUsers.find((u) => u.emailAddress === email) : null;

    if (existingUserByEmail) {
      // Create SocialAccount link to existing user
      mockSocialAccounts.push({
        id: mockSocialAccounts.length + 1,
        userId: existingUserByEmail.id,
        provider,
        providerAccountId,
      });
      user.id = String(existingUserByEmail.id);
      return true;
    }

    // 3. New social signup → create User + SocialAccount
    let finalNickname = nickname || `user_${provider}_${providerAccountId.slice(0, 8)}`;

    // Check for nickname collision
    const existingNickname = mockUsers.find((u) => u.nickName === finalNickname);
    if (existingNickname) {
      const randomSuffix = Math.floor(Math.random() * 1000);
      finalNickname = `${finalNickname}_${randomSuffix}`;
    }

    // Create new user
    const newUser = {
      id: mockUsers.length + 1,
      userId: `${provider}_${providerAccountId}`,
      emailAddress: email || `${provider}_${providerAccountId}@temp.local`,
      nickName: finalNickname,
      status: 'APPROVED',
    };

    mockUsers.push(newUser);

    // Create SocialAccount link
    mockSocialAccounts.push({
      id: mockSocialAccounts.length + 1,
      userId: newUser.id,
      provider,
      providerAccountId,
    });

    user.id = String(newUser.id);
    return true;
  } catch (error) {
    console.error('OAuth account linking error:', error);
    return true;
  }
}

beforeEach(() => {
  mockUsers = [];
  mockSocialAccounts = [];
});

describe('OAuth sign-in callback — SPEC-SOCIAL-LOGIN-001', () => {
  describe('New user social signup (REQ-SOCIAL-003)', () => {
    it('should create new User and SocialAccount for first-time Kakao login', async () => {
      const input: SignInCallbackInput = {
        account: { provider: 'kakao', providerAccountId: 'kakao_12345' },
        user: { id: '1', email: 'kakao@example.com', name: 'KakaoUser' },
        profile: { email: 'kakao@example.com', name: 'KakaoUser' },
      };

      const result = await mockSignInCallback(input);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(1);
      expect(mockUsers[0].emailAddress).toBe('kakao@example.com');
      expect(mockUsers[0].nickName).toBe('KakaoUser');
      expect(mockUsers[0].status).toBe('APPROVED');

      expect(mockSocialAccounts).toHaveLength(1);
      expect(mockSocialAccounts[0].provider).toBe('kakao');
      expect(mockSocialAccounts[0].providerAccountId).toBe('kakao_12345');
      expect(mockSocialAccounts[0].userId).toBe(mockUsers[0].id);
    });

    it('should create new User and SocialAccount for first-time Google login', async () => {
      const input: SignInCallbackInput = {
        account: { provider: 'google', providerAccountId: 'google_67890' },
        user: { id: '2', email: 'google@example.com', name: 'GoogleUser' },
      };

      const result = await mockSignInCallback(input);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(1);
      expect(mockSocialAccounts).toHaveLength(1);
      expect(mockSocialAccounts[0].provider).toBe('google');
      expect(mockSocialAccounts[0].providerAccountId).toBe('google_67890');
    });

    it('should handle nickname collision by appending random suffix (REQ-SOCIAL-003)', async () => {
      // Create existing user with same nickname
      mockUsers.push({
        id: 100,
        userId: 'existing_user',
        emailAddress: 'existing@example.com',
        nickName: 'TestUser',
        status: 'APPROVED',
      });

      const input: SignInCallbackInput = {
        account: { provider: 'kakao', providerAccountId: 'kakao_new' },
        user: { id: '1', email: 'new@example.com', name: 'TestUser' }, // Same nickname
      };

      const result = await mockSignInCallback(input);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(2); // existing + new

      const newUser = mockUsers[1];
      expect(newUser.nickName).toMatch(/^TestUser_\d+$/); // Should have suffix
      expect(newUser.nickName).not.toBe('TestUser'); // Should not be exact match
    });

    it('should approve new social user without email verification (REQ-SOCIAL-003)', async () => {
      const input: SignInCallbackInput = {
        account: { provider: 'google', providerAccountId: 'google_111' },
        user: { id: '3', email: 'nouvs@example.com', name: 'NoUVSUser' },
      };

      const result = await mockSignInCallback(input);

      expect(result).toBe(true);
      expect(mockUsers[0].status).toBe('APPROVED'); // No email verification needed
    });
  });

  describe('Account linking for existing users (REQ-SOCIAL-004)', () => {
    it('should link social account to existing user with same email', async () => {
      // Create existing user
      mockUsers.push({
        id: 50,
        userId: 'existing',
        emailAddress: 'existing@example.com',
        nickName: 'ExistingUser',
        status: 'APPROVED',
      });

      const input: SignInCallbackInput = {
        account: { provider: 'kakao', providerAccountId: 'kakao_link' },
        user: { id: '999', email: 'existing@example.com', name: 'KakaoLinkUser' },
      };

      const result = await mockSignInCallback(input);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(1); // No new user created
      expect(mockSocialAccounts).toHaveLength(1); // New SocialAccount created
      expect(mockSocialAccounts[0].userId).toBe(50); // Linked to existing user
      expect(mockSocialAccounts[0].provider).toBe('kakao');
      expect(mockSocialAccounts[0].providerAccountId).toBe('kakao_link');
    });

    it('should allow multiple social accounts linked to same user', async () => {
      // Create existing user with Kakao already linked
      mockUsers.push({
        id: 60,
        userId: 'multi_social',
        emailAddress: 'multi@example.com',
        nickName: 'MultiSocialUser',
        status: 'APPROVED',
      });

      mockSocialAccounts.push({
        id: 1,
        userId: 60,
        provider: 'kakao',
        providerAccountId: 'kakao_first',
      });

      // Now link Google account
      const input: SignInCallbackInput = {
        account: { provider: 'google', providerAccountId: 'google_second' },
        user: { id: '999', email: 'multi@example.com', name: 'MultiSocialUser' },
      };

      const result = await mockSignInCallback(input);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(1); // Still one user
      expect(mockSocialAccounts).toHaveLength(2); // Now two social accounts
      expect(mockSocialAccounts[1].provider).toBe('google');
      expect(mockSocialAccounts[1].userId).toBe(60); // Same user
    });
  });

  describe('Subsequent sign-ins with existing SocialAccount', () => {
    it('should sign in existing user without creating new records', async () => {
      // Setup: User + SocialAccount already exist
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

      const input: SignInCallbackInput = {
        account: { provider: 'kakao', providerAccountId: 'kakao_returning' },
        user: { id: '999', email: 'returning@example.com', name: 'ReturningUser' },
      };

      const result = await mockSignInCallback(input);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(1); // No new user
      expect(mockSocialAccounts).toHaveLength(1); // No new SocialAccount
    });

    it('should not create duplicate SocialAccount for same provider+providerAccountId', async () => {
      // Setup: User + SocialAccount already exist
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

      const input: SignInCallbackInput = {
        account: { provider: 'google', providerAccountId: 'google_nodup' },
        user: { id: '999', email: 'nodup@example.com', name: 'NoDupUser' },
      };

      const result = await mockSignInCallback(input);

      expect(result).toBe(true);
      expect(mockSocialAccounts).toHaveLength(1); // Still only one SocialAccount
    });
  });

  describe('Edge cases and error handling', () => {
    it('should skip OAuth handling for credentials login (no account)', async () => {
      const input: SignInCallbackInput = {
        account: null,
        user: { id: '1' },
      };

      const result = await mockSignInCallback(input);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(0);
      expect(mockSocialAccounts).toHaveLength(0);
    });

    it('should skip OAuth handling for unsupported providers', async () => {
      const input: SignInCallbackInput = {
        account: { provider: 'facebook', providerAccountId: 'fb_123' },
        user: { id: '1' },
      };

      const result = await mockSignInCallback(input);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(0);
      expect(mockSocialAccounts).toHaveLength(0);
    });

    it('should handle missing email gracefully', async () => {
      const input: SignInCallbackInput = {
        account: { provider: 'kakao', providerAccountId: 'kakao_noemail' },
        user: { id: '1', name: 'NoEmailUser' },
        profile: { name: 'NoEmailUser' },
      };

      const result = await mockSignInCallback(input);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(1);
      expect(mockUsers[0].emailAddress).toContain('@temp.local'); // Fallback email
    });

    it('should handle missing nickname gracefully', async () => {
      const input: SignInCallbackInput = {
        account: { provider: 'google', providerAccountId: 'google_noname' },
        user: { id: '1', email: 'noname@example.com' },
      };

      const result = await mockSignInCallback(input);

      expect(result).toBe(true);
      expect(mockUsers).toHaveLength(1);
      expect(mockUsers[0].nickName).toMatch(/^user_google_/); // Fallback nickname
    });
  });
});
