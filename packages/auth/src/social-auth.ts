/**
 * SPEC-SOCIAL-LOGIN-001: Social OAuth configuration helper
 *
 * This helper resolves OAuth provider credentials from:
 * 1. Admin-configured SiteSettings (REQ-SOCIAL-005) — takes precedence
 * 2. Environment variables (fallback)
 *
 * The pattern follows packages/admin/src/settings.ts: getSiteSetting →
 * {provider}ClientId/Secret → resolve with env var fallback.
 */

import type { PrismaClient } from '@rhymix-ts/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SocialAuthConfig {
  kakao: {
    clientId: string | null;
    clientSecret: string | null;
    enabled: boolean;
  } | null;
  google: {
    clientId: string | null;
    clientSecret: string | null;
    enabled: boolean;
  } | null;
}

export interface SocialAuthContext {
  prisma: PrismaClient;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Get the first site ID (singleton pattern for single-site installations).
 * Copied from apps/web/server/api/routers/admin/settings.ts for consistency.
 */
async function resolveSiteId(ctx: { prisma: PrismaClient; siteId?: number }): Promise<number> {
  if (ctx.siteId !== undefined) {
    return ctx.siteId;
  }
  const site = await ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } });
  if (!site) {
    // Social login is optional; return null if no site exists
    return 0;
  }
  return site.id;
}

/**
 * Get a site setting value with default fallback.
 */
async function getSiteSetting(
  ctx: { prisma: PrismaClient; siteId?: number },
  key: string,
  defaultValue: any = null,
): Promise<any> {
  const siteId = await resolveSiteId(ctx);
  if (siteId === 0) {
    return defaultValue;
  }

  const setting = await ctx.prisma.siteSetting.findUnique({
    where: {
      siteId_key: {
        siteId,
        key,
      },
    },
  });

  return setting ? setting.value : defaultValue;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Resolve social auth configuration from SiteSettings + environment variables.
 *
 * Resolution order (per REQ-SOCIAL-005):
 * 1. Admin-configured SiteSetting value (if present and non-empty)
 * 2. Environment variable (KAKAO_CLIENT_ID, KAKAO_CLIENT_SECRET, etc.)
 * 3. Empty string (disabled)
 *
 * Returns an object with provider configs including:
 * - clientId/clientSecret: resolved credentials (or null if disabled)
 * - enabled: boolean flag for UI visibility
 */
export async function socialAuth(ctx: SocialAuthContext): Promise<SocialAuthConfig> {
  // Kakao configuration
  const kakaoClientIdSetting = await getSiteSetting(ctx, 'social.kakao.clientId', null);
  const kakaoClientSecretSetting = await getSiteSetting(ctx, 'social.kakao.clientSecret', null);
  const kakaoEnabledSetting = await getSiteSetting(ctx, 'social.kakao.enabled', false);

  const kakaoClientId = kakaoClientIdSetting || process.env.KAKAO_CLIENT_ID || '';
  const kakaoClientSecret = kakaoClientSecretSetting || process.env.KAKAO_CLIENT_SECRET || '';
  const kakaoEnabled = kakaoEnabledSetting && Boolean(kakaoClientId && kakaoClientSecret);

  // Google configuration
  const googleClientIdSetting = await getSiteSetting(ctx, 'social.google.clientId', null);
  const googleClientSecretSetting = await getSiteSetting(ctx, 'social.google.clientSecret', null);
  const googleEnabledSetting = await getSiteSetting(ctx, 'social.google.enabled', false);

  const googleClientId = googleClientIdSetting || process.env.GOOGLE_CLIENT_ID || '';
  const googleClientSecret = googleClientSecretSetting || process.env.GOOGLE_CLIENT_SECRET || '';
  const googleEnabled = googleEnabledSetting && Boolean(googleClientId && googleClientSecret);

  return {
    kakao: kakaoEnabled
      ? {
          clientId: kakaoClientId,
          clientSecret: kakaoClientSecret,
          enabled: true,
        }
      : null,
    google: googleEnabled
      ? {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          enabled: true,
        }
      : null,
  };
}
