/**
 * @rhymix-ts/admin Package Entry Point
 *
 * Admin export/import, security, logging, favorites utilities.
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001
 */

// Export
export { exportFormatVersion, SUPPORTED_VERSIONS, adminExportBundleSchema, exportRequestSchema, type AdminExportBundle, type ExportRequest, type ImportDecisions } from './export/bundle-schema';
export { serializeBundle } from './export/serializer';

// Import
export { dryRun, type DryRunResult, type ImportPlanEntry, type ConflictReport } from './import/deserializer';
export { applyImport, type ApplyResult } from './import/apply';

// Security
export { getSiteAdminTwoFactorPolicy, checkAdmin2FA, invalidateAll2FAVerified, type TwoFactorVerifyResult } from './security/two-factor-gate';
export { getIpControlSettings, updateIpControlSettings, checkIpAccess, type IpControlSettings, type IpAccessResult } from './security/ip-control';

// Logs
export { parseIpFilter, matchesIpFilter, parseIpFilterForQuery, type ParsedIpFilter } from './logs/ip-filter';

// Favorites
export { FAVORITE_MAX_COUNT, validateFavoriteHref } from './favorites/actions';

// Settings (SPEC-ADMIN-002 Slice 1F)
export * from './settings';

// Admin Utilities (SPEC-ADMIN-002 Slice 2H)
export { invalidateAdminMenuCache, purgeExpiredSessions, type InvalidateMenuCacheResult, type PurgeExpiredSessionsOptions, type PurgeExpiredSessionsResult } from './admin-utils';

// Widgets
export { validatePresetProps } from './widgets/preset';

// Stats (SPEC-ADMIN-002 Slice 2F)
export * from './stats';
