/**
 * Site resolution helper — SPEC-CAPTCHA-001 fix.
 *
 * `actions.ts` (signupAction) 와 `config.ts` (Credentials.authorize) 는 모두
 * SiteSetting/Terms 조회 전에 대상 siteId 가 필요하다. 기존에는 두 파일 모두
 * `const siteId = 1; // TODO` 하드코딩을 사용했는데, 이는 다중 사이트 배포에서
 * 잘못된 사이트의 CAPTCHA/약관 설정을 읽어오는 문제를 일으킨다.
 *
 * hostname→domain 해석(Site.domain 매핑)이 아직 없으므로, 임시로 가장 낮은
 * id 를 가진 Site 를 기본값으로 사용한다 — `apps/web/server/api/routers/public/captcha.ts`
 * 의 `getConfig` 와 동일한 폴백 규칙(orderBy id asc)을 따른다.
 *
 * @MX:TODO: [AUTO] hostname→domain 해석이 도입되면 이 함수는 request context 의
 *   siteId 를 우선 사용하도록 교체되어야 한다.
 */
import type { PrismaClient } from '@rhymix-ts/db';

/**
 * 기본 siteId 를 조회한다. Site 가 하나도 없으면 `1` 을 반환한다(설치 직후 등
 * 예외적인 상황에서도 다운스트림 조회가 조용히 실패하도록 하기 위함).
 */
export async function resolveDefaultSiteId(
  prisma: Pick<PrismaClient, 'site'>,
): Promise<number> {
  const site = await prisma.site.findFirst({ orderBy: { id: 'asc' } });
  return site?.id ?? 1;
}
