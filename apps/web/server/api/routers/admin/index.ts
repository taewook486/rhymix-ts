/**
 * admin 라우터 조합 — SPEC-ADMIN-001 Slice B + Slice D.
 *
 * Slice D 에서 menu / menuItem / log 라우터 추가됨.
 */
import { router } from '../../trpc';
import { adminModuleRouter } from './module';
import { adminMenuRouter } from './menu';
import { adminMenuItemRouter } from './menu-item';
import { adminLogRouter } from './log';

export const adminRouter = router({
  module:   adminModuleRouter,
  menu:     adminMenuRouter,
  menuItem: adminMenuItemRouter,
  log:      adminLogRouter,
  // TODO (Slice E): site: adminSiteRouter
  // TODO (Slice E): members: adminMembersRouter
});
