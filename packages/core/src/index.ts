/**
 * @rhymix-ts/core — shared domain types and Zod schemas.
 *
 * Initial exports cover the install wizard surface (SPEC-INSTALL-001).
 * Additional schemas (Document, Comment, ThemeManifest, etc.) are added
 * during their respective /moai run cycles.
 */

import { z } from 'zod';

// SPEC-INSTALL-001 / Step 3: DB config form schema
export const dbConfigSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535).default(5432),
  user: z.string().min(1).max(64),
  pass: z.string().min(1),
  database: z.string().min(1).max(64),
  schema: z.string().default('public'),
});
export type DbConfig = z.infer<typeof dbConfigSchema>;

// SPEC-INSTALL-001 / Step 4: Admin config form schema
export const adminConfigSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    password2: z.string().min(8).max(128),
    nickName: z.string().min(2).max(32),
    userId: z
      .string()
      .min(3)
      .max(32)
      .regex(/^[a-z0-9_-]+$/i, 'lowercase letters, digits, hyphens, underscores'),
    timeZone: z.string().min(1).default('UTC'),
    useSsl: z.enum(['always', 'none']).default('always'),
    useSitelock: z.coerce.boolean().default(false),
  })
  .refine((d) => d.password === d.password2, {
    message: 'Passwords do not match',
    path: ['password2'],
  });
export type AdminConfig = z.infer<typeof adminConfigSchema>;

// SPEC-AUTH-001: User status enum mirroring Prisma
export const UserStatus = {
  APPROVED: 'APPROVED',
  UNAUTHED: 'UNAUTHED',
  DENIED: 'DENIED',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

// Supported wizard languages (SPEC-INSTALL-001 i18n)
export const SUPPORTED_LANGUAGES = [
  'ko',
  'en',
  'ja',
  'zh-CN',
  'zh-TW',
  'de',
  'es',
  'fr',
  'mn',
  'ru',
  'tr',
  'vi',
  'id',
] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
