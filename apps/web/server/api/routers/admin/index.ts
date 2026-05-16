/**
 * admin 라우터 조합 — SPEC-ADMIN-001 Slice B + Slice D + Slice E + Slice F.
 *
 * Slice D 에서 menu / menuItem / log 라우터 추가됨.
 * Slice E 에서 site / user 라우터 추가됨.
 * Slice F 에서 system / cache 라우터 추가됨.
 */
import { router } from '../../trpc';
import { adminModuleRouter } from './module';
import { adminMenuRouter } from './menu';
import { adminMenuItemRouter } from './menu-item';
import { adminLogRouter } from './log';
import { adminSiteRouter } from './site';
import { adminUserRouter } from './user';
import { adminSystemRouter } from './system';
import { adminCacheRouter } from './cache';

export const adminRouter = router({
  module:   adminModuleRouter,
  menu:     adminMenuRouter,
  menuItem: adminMenuItemRouter,
  log:      adminLogRouter,
  site:     adminSiteRouter,
  user:     adminUserRouter,
  system:   adminSystemRouter,
  cache:    adminCacheRouter,
});
