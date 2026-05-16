/**
 * Specification tests for CacheAdapter — SPEC-ADMIN-001 Slice F.
 *
 * F-2-1: NextJsCacheAdapter.revalidate('tag') → revalidateTag('tag') 호출
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// next/cache mock
const mockRevalidateTag = vi.fn();
vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

describe('NextJsCacheAdapter (Slice F)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('F-2-1: revalidate(tag) → revalidateTag(tag) 호출 (REQ-ADMIN-060)', async () => {
    const { NextJsCacheAdapter } = await import('./adapter');
    const adapter = new NextJsCacheAdapter();
    await adapter.revalidate('module:1');

    expect(mockRevalidateTag).toHaveBeenCalledOnce();
    expect(mockRevalidateTag).toHaveBeenCalledWith('module:1');
  });
});
