/**
 * tRPC HTTP 어댑터 Route Handler — SPEC-ADMIN-001 Slice B.
 *
 * Next.js App Router 에서 GET/POST 요청을 fetchRequestHandler 로 처리한다.
 */
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/api/root';
import { createContext } from '@/server/api/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
  });

export { handler as GET, handler as POST };
