/**
 * Install wizard Zod schemas (SPEC-INSTALL-001).
 *
 * Hosts every form / state validator used by the multi-step installer:
 *  - REQ-INSTALL-001..010   language + license screens
 *  - REQ-INSTALL-020..030   environment self-check
 *  - REQ-INSTALL-040..050   DB and admin configuration
 *  - REQ-INSTALL-052        NEXTAUTH_SECRET length check (>= 32 chars)
 */
import { z } from 'zod';

import { SUPPORTED_LANGUAGES } from '../i18n/languages';

/** Minimum acceptable length for NEXTAUTH_SECRET (REQ-INSTALL-052). */
export const NEXTAUTH_SECRET_MIN_LENGTH = 32;

/** Wizard step identifier — kept in lock-step with the UI router. */
export const INSTALL_STEPS = [
  'language',
  'license',
  'env-check',
  'db',
  'admin',
  'finish',
] as const;
export type InstallStep = (typeof INSTALL_STEPS)[number];

// ---------------------------------------------------------------------------
// Step 3 — DB connection form
// ---------------------------------------------------------------------------

export const dbConfigSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535).default(5432),
  user: z.string().min(1).max(64),
  pass: z.string().min(1),
  database: z.string().min(1).max(64),
  schema: z.string().min(1).max(64).default('public'),
});
export type DbConfig = z.infer<typeof dbConfigSchema>;

// ---------------------------------------------------------------------------
// Step 4 — Administrator account form
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Step 2 — License agreement
// ---------------------------------------------------------------------------

export const licenseAgreementSchema = z.object({
  accepted: z.literal(true, {
    errorMap: () => ({ message: 'License must be accepted to continue' }),
  }),
});
export type LicenseAgreement = z.infer<typeof licenseAgreementSchema>;

// ---------------------------------------------------------------------------
// Wizard session — persisted between steps
// ---------------------------------------------------------------------------

export const installSessionSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  step: z.enum(INSTALL_STEPS),
  licenseAccepted: z.boolean().default(false),
  db: dbConfigSchema.optional(),
  admin: adminConfigSchema.optional(),
});
export type InstallSession = z.infer<typeof installSessionSchema>;

// ---------------------------------------------------------------------------
// Step 2.5 — Environment self-check (REQ-INSTALL-052 secret length)
// ---------------------------------------------------------------------------

export const envCheckResultSchema = z.object({
  nodeVersionOk: z.boolean(),
  writableConfigDir: z.boolean(),
  nextAuthSecretLength: z
    .number()
    .int()
    .min(
      NEXTAUTH_SECRET_MIN_LENGTH,
      `NEXTAUTH_SECRET must be at least ${NEXTAUTH_SECRET_MIN_LENGTH} characters`,
    ),
  databaseReachable: z.boolean(),
});
export type EnvCheckResult = z.infer<typeof envCheckResultSchema>;
