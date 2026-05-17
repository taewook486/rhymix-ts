/**
 * admin 라우터 조합 — SPEC-ADMIN-001 Slice B + Slice D + Slice E + Slice F + Slice H + Slice I.
 *
 * Slice D 에서 menu / menuItem / log 라우터 추가됨.
 * Slice E 에서 site / user 라우터 추가됨.
 * Slice F 에서 system / cache 라우터 추가됨.
 * Slice H 에서 favorite 라우터 추가됨.
 * Slice I 에서 widget 라우터 추가됨 (REQ-ADMIN-043).
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
import { adminFavoriteRouter } from './favorite';
import { adminWidgetRouter } from './widget';

export const adminRouter = router({
  module:   adminModuleRouter,
  menu:     adminMenuRouter,
  menuItem: adminMenuItemRouter,
  log:      adminLogRouter,
  site:     adminSiteRouter,
  user:     adminUserRouter,
  system:   adminSystemRouter,
  cache:    adminCacheRouter,
  favorite: adminFavoriteRouter,
  widget:   adminWidgetRouter,
});
