/**
 * admin 라우터 조합 — SPEC-ADMIN-001 Slice B.
 *
 * Slice C 에서 menu / log / system / site 라우터가 추가될 예정.
 */
import { router } from '../../trpc';
import { adminModuleRouter } from './module';

export const adminRouter = router({
  module: adminModuleRouter,
  // TODO (Slice C): menu: adminMenuRouter
  // TODO (Slice C): site: adminSiteRouter
  // TODO (Slice C): log: adminLogRouter
});
