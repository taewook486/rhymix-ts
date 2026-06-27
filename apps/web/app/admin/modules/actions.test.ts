/**
 * Admin 모듈 Server Actions 테스트 (C-9, C-10).
 * RED 단계: actions.ts 가 없으므로 두 테스트 모두 실패.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- mocks ---
vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}))

vi.mock('@rhymix-ts/core/addons', () => ({
  runAdminAction: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/admin/site-context', () => ({
  getCurrentSiteId: vi.fn().mockResolvedValue(1),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}))

import { getServerCaller } from '@/lib/trpc/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const mockGetServerCaller = getServerCaller as unknown as ReturnType<typeof vi.fn>
const mockRevalidatePath = revalidatePath as unknown as ReturnType<typeof vi.fn>
const mockRedirect = redirect as unknown as ReturnType<typeof vi.fn>

describe('createModuleAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('C-9: 유효 FormData 로 createModuleAction 을 호출하면 tRPC admin.module.create 가 호출되고 redirect 된다', async () => {
    // Arrange
    const mockCreate = vi.fn().mockResolvedValue({ id: 1 })
    const mockCaller = {
      admin: { module: { create: mockCreate } },
    }
    mockGetServerCaller.mockResolvedValue(mockCaller)
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`)
    })

    const formData = new FormData()
    formData.set('siteId', '1')
    formData.set('moduleCode', 'board')
    formData.set('mid', 'notice')
    formData.set('name', '공지')

    // Act
    const { createModuleAction } = await import('./actions')
    let redirectError: Error | null = null
    try {
      await createModuleAction(null, formData)
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('NEXT_REDIRECT:')) {
        redirectError = e
      }
    }

    // Assert
    expect(mockCreate).toHaveBeenCalledWith({
      siteId: 1,
      moduleCode: 'board',
      mid: 'notice',
      name: '공지',
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/modules')
    expect(redirectError).not.toBeNull()
    expect(redirectError!.message).toBe('NEXT_REDIRECT:/admin/modules')
  })
})

describe('deleteModuleAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('C-10: deleteModuleAction 이 성공하면 revalidatePath 가 호출되고 { ok: true } 를 반환한다', async () => {
    // Arrange
    const mockDelete = vi.fn().mockResolvedValue(undefined)
    const mockCaller = {
      admin: { module: { delete: mockDelete } },
    }
    mockGetServerCaller.mockResolvedValue(mockCaller)

    // Act
    const { deleteModuleAction } = await import('./actions')
    const result = await deleteModuleAction(5)

    // Assert
    expect(mockDelete).toHaveBeenCalledWith({ instanceId: 5 })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/modules')
    expect(result).toEqual({ ok: true })
  })

  it('C-10b: deleteModuleAction 이 TRPCError CONFLICT 를 throw 하면 { error: string } 을 반환한다', async () => {
    // Arrange
    const { TRPCError } = await import('@trpc/server')
    const mockDelete = vi.fn().mockRejectedValue(
      new TRPCError({ code: 'CONFLICT', message: 'this instance is the index module' })
    )
    const mockCaller = {
      admin: { module: { delete: mockDelete } },
    }
    mockGetServerCaller.mockResolvedValue(mockCaller)

    // Act
    const { deleteModuleAction } = await import('./actions')
    const result = await deleteModuleAction(5)

    // Assert
    expect(result).toEqual({ error: 'this instance is the index module' })
  })
})
