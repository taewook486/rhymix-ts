/**
 * admin 라우터 조합 — SPEC-ADMIN-001 Slice B + Slice D + Slice E + Slice F + Slice H + Slice I,
 *                     SPEC-CONTENT-001 Slice B (T-009) + Slice C (카테고리 CRUD 추가)
 *                     + Slice D (trash, moderation 추가)
 *                     + Slice F (contentExtraKey CRUD 추가).
 *                     SPEC-ADMIN-EXTRAS-001 Slice A + Slice B (export/import, bulk ops, IP filter, favorites validation).
 *                     SPEC-ADMIN-002 Slice 1A (dashboard widgets).
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
 * SPEC-ADMIN-EXTRAS-001 Slice A + B 에서 export / import 라우터 추가됨.
 * SPEC-ADMIN-002 Slice 1A 에서 dashboard 라우터 추가됨 (REQ-ADMIN2-001~003, 007, 010).
 * SPEC-ADMIN-002 Slice 1C 에서 group 라우터 추가됨 (REQ-ADMIN2-040~042).
 * SPEC-ADMIN-002 Slice 2A 에서 layout 라우터 추가됨 (REQ-ADMIN2-020~022).
 */
import { router } from '../../trpc';
import { adminModuleRouter } from './module';
import { adminMenuRouter } from './menu';
import { adminMenuItemRouter } from './menu-item';
import { adminLogRouter } from './log';
import { adminLayoutRouter } from './layout';
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
import { adminExportRouter } from './export';
import { adminImportRouter } from './import';
import { adminDashboardRouter } from './dashboard';
import { adminDocumentRouter } from './document';
import { adminCommentRouter } from './comment';
import { adminGroupRouter } from './group';
import { adminSettingsRouter } from './settings';
import { adminFileRouter } from './file';

export const adminRouter = router({
  module:          adminModuleRouter,
  menu:            adminMenuRouter,
  menuItem:        adminMenuItemRouter,
  log:             adminLogRouter,
  layout:          adminLayoutRouter,
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
  export:          adminExportRouter,
  import:          adminImportRouter,
  dashboard:       adminDashboardRouter,
  document:        adminDocumentRouter,
  comment:         adminCommentRouter,
  group:           adminGroupRouter,
  settings:        adminSettingsRouter,
  file:            adminFileRouter,
});
