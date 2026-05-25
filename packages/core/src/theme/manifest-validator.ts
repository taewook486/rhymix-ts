import { themeManifestSchema, type ThemeManifest } from './types';

export type ManifestParseResult =
  | { ok: true; manifest: ThemeManifest }
  | { ok: false; error: 'MANIFEST_INVALID'; field: string; message: string };

// REQ-THEME-001/002/003
export function parseManifest(input: unknown): ManifestParseResult {
  const result = themeManifestSchema.safeParse(input);
  if (result.success) {
    return { ok: true, manifest: result.data };
  }
  const firstError = result.error.errors[0];
  return {
    ok: false,
    error: 'MANIFEST_INVALID',
    field: firstError?.path.join('.') || 'root',
    message: firstError?.message ?? 'Invalid manifest',
  };
}
