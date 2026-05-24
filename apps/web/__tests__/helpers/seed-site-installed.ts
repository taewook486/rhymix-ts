/**
 * 테스트 헬퍼 — "설치된 Site" 픽스처.
 *
 * middleware install-gate(REQ-INSTALL-001, 020)가 추가된 이후 기존
 * ADMIN/AUTH/CONTENT 통합 테스트가 회귀하지 않도록 prisma.site.findFirst
 * mock에 installedAt=NOW() 값을 주입할 때 사용합니다.
 *
 * 사용 예시:
 *   vi.mock('@/lib/db/prisma', () => ({
 *     prisma: {
 *       site: { findFirst: () => siteInstalledFixture },
 *       domain: { findFirst: () => domainFixture },
 *     }
 *   }));
 */

/** prisma.site.findFirst가 반환하는 "설치 완료" 픽스처 값. */
export const siteInstalledFixture = {
  id: 1,
  installedAt: new Date('2026-01-01T00:00:00.000Z'),
  defaultLanguage: 'ko',
  timeZone: 'Asia/Seoul',
  scheme: 'https',
};

/** prisma.site.findFirst가 반환하는 "미설치" 픽스처 (설치 게이트 테스트용). */
export const siteNotInstalledFixture = null;
