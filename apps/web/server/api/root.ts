/**
 * tRPC 루트 라우터 — SPEC-ADMIN-001 Slice B + SPEC-CONTENT-001 Slice B + SPEC-CAPTCHA-001
 */
import { router } from './trpc';
import { adminRouter } from './routers/admin';
import { contentRouter } from './routers/content';
import { publicRouter } from './routers/public';

export const appRouter = router({
  admin: adminRouter,
  content: contentRouter,
  public: publicRouter,
});

export type AppRouter = typeof appRouter;
