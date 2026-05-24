/**
 * admin 라우터 조합 — SPEC-ADMIN-001 Slice B + Slice D + Slice E + Slice F + Slice H + Slice I,
 *                     SPEC-CONTENT-001 Slice B (T-009) + Slice C (카테고리 CRUD 추가)
 *                     + Slice D (trash, moderation 추가)
 *                     + Slice F (contentExtraKey CRUD 추가).
 *
 * Slice D 에서 menu / menuItem / log 라우터 추가됨.
 * Slice E 에서 site / user 라우터 추가됨.
 * Slice F 에서 system / cache 라우터 추가됨.
 * Slice H 에서 favorite 라우터 추가됨.
 * Slice I 에서 widget 라우터 추가됨 (REQ-ADMIN-043).
 * SPEC-CONTENT-001 Slice B 에서 board 라우터 추가됨 (T-009).
 * SPEC-CONTENT-001 Slice C 에서 category 라우터 추가됨 (REQ-CONTENT-040).
 * SPEC-CONTENT-001 Slice D 에서 trash, moderation 라우터 추가됨.
 * SPEC-CONTENT-001 Slice F 에서 contentExtraKey 라우터 추가됨 (REQ-CONTENT-120).
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
import { adminBoardRouter } from './board';
import { adminCategoryRouter } from './category';
import { adminTrashRouter } from './trash';
import { adminModerationRouter } from './moderation';
import { adminContentExtraKeyRouter } from './content-extra-key';

export const adminRouter = router({
  module:          adminModuleRouter,
  menu:            adminMenuRouter,
  menuItem:        adminMenuItemRouter,
  log:             adminLogRouter,
  site:            adminSiteRouter,
  user:            adminUserRouter,
  system:          adminSystemRouter,
  cache:           adminCacheRouter,
  favorite:        adminFavoriteRouter,
  widget:          adminWidgetRouter,
  board:           adminBoardRouter,
  category:        adminCategoryRouter,
  trash:           adminTrashRouter,
  moderation:      adminModerationRouter,
  contentExtraKey: adminContentExtraKeyRouter,
});
