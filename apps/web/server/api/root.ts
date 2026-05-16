/**
 * tRPC 루트 라우터 — SPEC-ADMIN-001 Slice B.
 */
import { router } from './trpc';
import { adminRouter } from './routers/admin';

export const appRouter = router({
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
