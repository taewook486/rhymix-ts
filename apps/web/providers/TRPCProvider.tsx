'use client'
/**
 * 클라이언트 tRPC Provider — SPEC-ADMIN-001 Slice E-1.
 *
 * DnD optimistic update + 클라이언트 tRPC 호출을 위한 단일 진입점.
 *
 * @MX:NOTE: [AUTO] 클라이언트 tRPC Provider 단일 진입점.
 *           모든 클라이언트 컴포넌트에서 trpc.xxx.useQuery/useMutation 호출 시
 *           이 Provider 내부에 있어야 한다.
 * @MX:SPEC: SPEC-ADMIN-001 Slice E-1
 */
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import superjson from 'superjson'
import type { AppRouter } from '@/server/api/root'

// @MX:ANCHOR: [AUTO] 클라이언트 tRPC 훅 단일 출처.
// @MX:REASON: 모든 클라이언트 컴포넌트가 이 인스턴스를 공유해야 React Query 캐시가 단일하게 관리됨.
export const trpc = createTRPCReact<AppRouter>()

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  )
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
