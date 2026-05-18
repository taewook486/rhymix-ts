/**
 * tRPC 루트 라우터 — SPEC-ADMIN-001 Slice B + SPEC-CONTENT-001 Slice B.
 */
import { router } from './trpc';
import { adminRouter } from './routers/admin';
import { contentRouter } from './routers/content';

export const appRouter = router({
  admin: adminRouter,
  content: contentRouter,
});

export type AppRouter = typeof appRouter;
