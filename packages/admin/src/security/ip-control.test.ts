/**
 * IP Control Tests — SPEC-ADMIN-002 Slice 2G (REQ-ADMIN2-115)
 *
 * TDD RED phase: Write failing tests before implementation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  getIpControlSettings,
  updateIpControlSettings,
  checkIpAccess,
  type IpControlSettings,
} from './ip-control';

// Mock Prisma client
function createMockPrisma() {
  let settings: Map<string, any> = new Map();

  return {
    site: {
      findFirst: async () => ({ id: 1 }),
    },
    siteSetting: {
      findUnique: async ({ where }: any) => {
        const key = where?.siteId_key?.key;
        const value = settings.get(key);
        return value ? { key, value } : null;
      },
      create: async ({ data }: any) => {
        const setting = { key: data.key, value: data.value };
        settings.set(data.key, data.value);
        return setting;
      },
      upsert: async ({ where, create, update }: any) => {
        const key = where?.siteId_key?.key;
        const value = update?.value || create?.value;
        const setting = { key, value };
        settings.set(key, value);
        return setting;
      },
    },
  } as unknown as PrismaClient;
}

describe('ip-control — REQ-ADMIN2-115', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  describe('getIpControlSettings', () => {
    it('should return empty allow/deny lists when no settings exist', async () => {
      const ctx = { prisma };
      const settings = await getIpControlSettings(ctx);

      expect(settings).toEqual({
        allowList: [],
        denyList: [],
        enabled: false,
      });
    });

    it('should return existing IP control settings', async () => {
      const ctx = { prisma };
      // First, create some settings
      await updateIpControlSettings(
        {
          allowList: ['192.168.1.1', '10.0.0.0/24'],
          denyList: ['203.0.113.0/24'],
          enabled: true,
        },
        ctx,
      );

      const settings = await getIpControlSettings(ctx);
      expect(settings.allowList).toEqual(['192.168.1.1', '10.0.0.0/24']);
      expect(settings.denyList).toEqual(['203.0.113.0/24']);
      expect(settings.enabled).toBe(true);
    });
  });

  describe('updateIpControlSettings', () => {
    it('should persist IP control settings', async () => {
      const ctx = { prisma };
      const input: IpControlSettings = {
        allowList: ['192.168.1.1', '10.0.0.0/24'],
        denyList: ['203.0.113.0/24'],
        enabled: true,
      };

      const result = await updateIpControlSettings(input, ctx);

      expect(result).toEqual(input);
    });

    it('should validate IP/CIDR format using parseIpFilter', async () => {
      const ctx = { prisma };
      const input: IpControlSettings = {
        allowList: ['192.168.1.1', 'invalid-ip'],
        denyList: [],
        enabled: true,
      };

      await expect(updateIpControlSettings(input, ctx)).rejects.toThrow(
        'Invalid IP address format',
      );
    });

    it('should allow empty lists', async () => {
      const ctx = { prisma };
      const input: IpControlSettings = {
        allowList: [],
        denyList: [],
        enabled: false,
      };

      const result = await updateIpControlSettings(input, ctx);
      expect(result).toEqual(input);
    });
  });

  describe('checkIpAccess — @MX:ANCHOR (인증 우회 방지 invariant)', () => {
    it('should allow access when IP control is disabled', async () => {
      const ctx = { prisma };
      await updateIpControlSettings({ enabled: false, allowList: [], denyList: [] }, ctx);

      const result = await checkIpAccess('192.168.1.100', ctx);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('IP_CONTROL_DISABLED');
    });

    it('should allow access when IP matches allow list', async () => {
      const ctx = { prisma };
      await updateIpControlSettings(
        {
          enabled: true,
          allowList: ['192.168.1.1', '10.0.0.0/24'],
          denyList: [],
        },
        ctx,
      );

      const result = await checkIpAccess('10.0.0.50', ctx);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('ALLOWED');
    });

    it('should deny access when IP does not match allow list', async () => {
      const ctx = { prisma };
      await updateIpControlSettings(
        {
          enabled: true,
          allowList: ['192.168.1.1', '10.0.0.0/24'],
          denyList: [],
        },
        ctx,
      );

      const result = await checkIpAccess('203.0.113.50', ctx);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NOT_IN_ALLOW_LIST');
    });

    it('should deny access when IP matches deny list (highest priority)', async () => {
      const ctx = { prisma };
      await updateIpControlSettings(
        {
          enabled: true,
          allowList: ['0.0.0.0/0'], // Allow all
          denyList: ['203.0.113.0/24'], // But deny this range
        },
        ctx,
      );

      const result = await checkIpAccess('203.0.113.50', ctx);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('IN_DENY_LIST');
    });

    it('should allow access when not in deny list and allow list is empty (allow-all when enabled)', async () => {
      const ctx = { prisma };
      await updateIpControlSettings(
        {
          enabled: true,
          allowList: [], // Empty allow = allow all
          denyList: ['203.0.113.0/24'],
        },
        ctx,
      );

      const result = await checkIpAccess('192.168.1.100', ctx);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('ALLOWED');
    });

    // Critical invariant test: This MUST pass for admin area security
    it('should reject invalid IP format without crashing', async () => {
      const ctx = { prisma };
      await updateIpControlSettings({ enabled: true, allowList: ['10.0.0.0/24'], denyList: [] }, ctx);

      const result = await checkIpAccess('not-an-ip', ctx);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('INVALID_IP_FORMAT');
    });
  });
});
