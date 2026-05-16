/**
 * CacheAdapter — SPEC-ADMIN-001 Slice F.
 *
 * Next.js revalidateTag 를 추상화하여 테스트 가능하게 만드는 어댑터.
 * 운영 환경에서는 NextJsCacheAdapter 를 사용하고,
 * 테스트에서는 mock 으로 교체한다.
 *
 * @MX:NOTE: [AUTO] cache.purge 프로시저의 revalidateTag 단일 추상화 레이어.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-060
 */
import { revalidateTag } from 'next/cache';

/**
 * 캐시 무효화 인터페이스.
 */
export interface CacheAdapter {
  revalidate(tag: string): Promise<void>;
}

/**
 * Next.js revalidateTag 기반 구현체.
 *
 * Next.js 16 의 revalidateTag 는 두 번째 인수로 profile 이 필요하지만
 * 기본 캐시 무효화에는 첫 번째 인수(tag)만으로 충분하다.
 * 두 번째 인수 생략 시 타입 오류가 발생하므로 임시 any 캐스팅 사용.
 */
export class NextJsCacheAdapter implements CacheAdapter {
  async revalidate(tag: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)(tag);
  }
}

/**
 * 기본 CacheAdapter 싱글톤.
 * 테스트에서는 vi.mock('@/lib/cache/adapter') 로 교체한다.
 */
export const cacheAdapter: CacheAdapter = new NextJsCacheAdapter();
