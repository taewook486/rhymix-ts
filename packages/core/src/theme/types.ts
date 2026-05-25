import { z } from 'zod';

// REQ-THEME-003: version must be semver
export const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;

export const themeTokensSchema = z.object({
  colors: z.object({
    primary: z.string(),
    background: z.string(),
    foreground: z.string(),
    accent: z.string(),
  }),
  typography: z.object({
    fontFamilyBase: z.string(),
    fontFamilyHeading: z.string(),
    baseSize: z.number().min(12).max(20),
  }),
  spacing: z.object({
    unit: z.number(),
  }),
  radii: z.object({
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
  }),
  dark: z
    .object({
      colors: z
        .object({
          primary: z.string().optional(),
          background: z.string().optional(),
          foreground: z.string().optional(),
          accent: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type ThemeTokens = z.infer<typeof themeTokensSchema>;

export const themeManifestSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Theme name must be lowercase alphanumeric with hyphens'),
  version: z.string().regex(semverRegex, 'version must be semver (e.g., 1.0.0)'),
  displayName: z.string().min(1),
  author: z.string().optional(),
  parent: z.string().optional(),
  layouts: z.array(z.string()).min(1),
  skins: z.record(z.string(), z.array(z.string())),
  widgetStyles: z.array(z.string()).default([]),
  tokensSchema: z.unknown().refine((v) => v !== undefined, { message: 'Required' }), // Zod 스키마 인스턴스 — 런타임에서 검증
  supportsDarkMode: z.boolean().default(false),
});

export type ThemeManifest = z.infer<typeof themeManifestSchema>;

export interface LayoutProps {
  children: React.ReactNode;
  extraVars?: Record<string, unknown>;
}

export interface SkinProps {
  data: Record<string, unknown>;
  colorSet?: string;
}
