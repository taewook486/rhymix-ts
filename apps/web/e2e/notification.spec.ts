/**
 * E2E: 인앱 알림 센터 — SPEC-NOTIFICATION-001 REQ-NOTIF-065 (Slice A/B 공통 결손 항목).
 *
 * REQ-NOTIF-065: "게시판을 시드하고, 회원 A가 문서를 작성하고, 회원 B가 그 문서에
 * 댓글을 남긴 뒤, 회원 A로 (member)/notifications에 진입하여 정확히 1개의 미읽음
 * COMMENT 알림(B의 댓글을 참조)이 보이는지 확인하고, 읽음 처리 후 미읽음 카운트가
 * 0이 되는지 확인하는 e2e 테스트가 최소 1개 있어야 한다."
 *
 * AC-NOTIF-B1 (Slice B 확장): `@nickname` 멘션이 포함된 댓글은 문서 작성자에게 가는
 * COMMENT 알림과는 독립적으로, 멘션된 회원에게 별도의 MENTION 알림을 생성해야 한다.
 *
 * 댓글 작성 UI 결손에 대한 의도적 설계:
 *  - apps/web에는 댓글 작성 UI(CommentForm 등)가 존재하지 않는다
 *    (packages/board/src/routes/view-page.tsx의 댓글 섹션은 미구현 placeholder).
 *  - 따라서 댓글 생성은 실제 tRPC HTTP 엔드포인트(POST /api/trpc/content.comment.create)를
 *    BrowserContext.request로 호출하여 수행한다. 이는 protectedProcedure 인증 미들웨어,
 *    createComment, notificationHooks를 모두 실제로 거치는 production 코드 경로이며,
 *    스킵되는 것은 "버튼 클릭" UI 단계뿐이다 (해당 버튼 자체가 존재하지 않음).
 *  - 새 댓글 UI 컴포넌트는 만들지 않는다.
 *
 * 시드 전략:
 *  - seed-installed-site.ts: site + domain + admin (placeholder 비밀번호, 로그인 불필요)
 *  - seed-notification-fixtures.ts: 실제 로그인 가능한 회원(A/B/C) + 게시판
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { resetDb } from './support/db-reset';
import { seedInstalledSite } from './support/seed-installed-site';
import { seedMember, seedNotificationBoard } from './support/seed-notification-fixtures';

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

/**
 * /login 페이지에서 지정한 회원으로 로그인한다.
 * admin-2fa-enforcement.spec.ts의 loginAsAdmin 패턴을 그대로 따른다.
 */
async function loginAs(page: Page, userId: string, password: string): Promise<void> {
  await page.goto('/login');
  await page
    .locator('input[name="userId"], input[name="username"], input[type="text"]')
    .first()
    .fill(userId);
  await page
    .locator('input[name="password"], input[type="password"]')
    .first()
    .fill(password);
  await page.getByRole('button', { name: /로그인|Login|Sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

/**
 * `/{mid}/write` 폼을 통해 문서를 작성하고, 리다이렉트된 URL에서 documentId를 추출한다.
 * write/page.tsx의 createDocumentAction은 성공 시 `/${mid}/${documentId}`로 redirect한다.
 */
async function createDocumentViaUi(
  page: Page,
  mid: string,
  title: string,
  content: string,
): Promise<number> {
  await page.goto(`/${mid}/write`);
  await page.locator('input#title').fill(title);
  await page.locator('textarea#content').fill(content);
  await page.getByRole('button', { name: '작성' }).click();

  // 프로세스 기동 후 첫 sanitizeHtml() 호출은 isomorphic-dompurify(jsdom)를
  // 처음 로드하는 1회성 비용이 수십 초 걸릴 수 있다(serverExternalPackages로
  // 외부화되어 디스크에서 실제로 require되므로). 이후 호출은 빠르다.
  await expect(page).toHaveURL(new RegExp(`/${mid}/\\d+$`), { timeout: 90_000 });
  const match = page.url().match(/\/(\d+)$/);
  if (!match) {
    throw new Error(`문서 작성 후 URL에서 documentId를 추출할 수 없습니다: ${page.url()}`);
  }
  return Number(match[1]);
}

/**
 * 인증된 BrowserContext의 request로 content.comment.create tRPC 엔드포인트를 직접 호출한다.
 * (apps/web에 댓글 작성 UI가 없으므로 실제 production 코드 경로를 그대로 거치는
 * 유일한 방법 — protectedProcedure 인증은 context의 세션 쿠키로 충족된다.)
 */
async function createCommentViaTrpc(
  context: BrowserContext,
  documentId: number,
  content: string,
): Promise<void> {
  const response = await context.request.post('/api/trpc/content.comment.create', {
    headers: { 'Content-Type': 'application/json' },
    data: { json: { documentId, content } },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `content.comment.create 실패 (status=${response.status()}): ${body}`,
    );
  }
}

/** /notifications 페이지의 "미읽음" 배지 개수를 반환한다. */
async function countUnreadBadges(page: Page): Promise<number> {
  return page.locator('span', { hasText: '미읽음' }).count();
}

// ---------------------------------------------------------------------------
// 테스트
// ---------------------------------------------------------------------------

test.beforeEach(async () => {
  await resetDb();
});

test('REQ-NOTIF-065: 댓글 알림 — 미읽음 1개 표시 후 읽음 처리하면 0이 된다', async ({
  browser,
}) => {
  // jsdom 1회성 cold-load 대비 (createDocumentViaUi의 90s 대기 + 나머지 단계 여유)
  test.setTimeout(180_000);
  // 1. 사이트 + 회원 A(문서 작성자), B(댓글 작성자) + 게시판 시드
  const { siteId } = await seedInstalledSite({ hostname: 'localhost' });
  await seedMember({ userId: 'alice', password: 'alice-pw-1234', nickName: '앨리스' });
  await seedMember({ userId: 'bob', password: 'bob-pw-1234', nickName: '밥' });
  const { mid } = await seedNotificationBoard({ siteId });

  // 2. 회원 A로 로그인 → 문서 작성
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await loginAs(pageA, 'alice', 'alice-pw-1234');
  const documentId = await createDocumentViaUi(
    pageA,
    mid,
    'REQ-NOTIF-065 테스트 문서',
    '앨리스가 작성한 본문입니다.',
  );

  // 3. 회원 B로 로그인 → 같은 문서에 댓글 작성 (인증된 컨텍스트의 tRPC HTTP 호출)
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await loginAs(pageB, 'bob', 'bob-pw-1234');
  await createCommentViaTrpc(contextB, documentId, 'REQ-NOTIF-065 댓글 본문');

  // 4. 회원 A로 돌아가 /notifications 진입
  await pageA.goto('/notifications');

  // 5. 정확히 1개의 미읽음 COMMENT 알림이 밥의 닉네임을 참조하며 보여야 한다
  const unreadItems = pageA.locator('li', { hasText: '미읽음' });
  await expect(unreadItems).toHaveCount(1);
  await expect(unreadItems.first()).toContainText('밥');
  await expect(unreadItems.first()).toContainText('댓글');
  await expect(unreadItems.first()).toContainText('님이 댓글을 남겼습니다.');

  // 6. "읽음" 버튼 클릭
  await unreadItems.first().getByRole('button', { name: '읽음' }).click();

  // 7. 미읽음 배지가 더 이상 존재하지 않아야 한다 (unread count == 0)
  await expect(async () => {
    expect(await countUnreadBadges(pageA)).toBe(0);
  }).toPass({ timeout: 10_000 });

  await contextA.close();
  await contextB.close();
});

test('AC-NOTIF-B1: 멘션을 포함한 댓글은 문서 작성자(COMMENT)와 멘션 대상(MENTION)에게 독립적으로 알림을 보낸다', async ({
  browser,
}) => {
  // 1. 사이트 + 회원 A(문서 작성자), B(댓글 작성자), C(멘션 대상) + 게시판 시드
  const { siteId } = await seedInstalledSite({ hostname: 'localhost' });
  await seedMember({ userId: 'alice2', password: 'alice2-pw-1234', nickName: '앨리스투' });
  await seedMember({ userId: 'bob2', password: 'bob2-pw-1234', nickName: '밥투' });
  await seedMember({ userId: 'carol', password: 'carol-pw-1234', nickName: 'carol' });
  const { mid } = await seedNotificationBoard({ siteId, mid: 'notiftest2' });

  // 2. 회원 A로 로그인 → 문서 작성
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await loginAs(pageA, 'alice2', 'alice2-pw-1234');
  const documentId = await createDocumentViaUi(
    pageA,
    mid,
    'AC-NOTIF-B1 테스트 문서',
    '앨리스투가 작성한 본문입니다.',
  );

  // 3. 회원 B로 로그인 → @carol 멘션을 포함한 댓글 작성
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await loginAs(pageB, 'bob2', 'bob2-pw-1234');
  await createCommentViaTrpc(contextB, documentId, '@carol 확인 부탁드려요');

  // 4. 회원 C(멘션 대상)로 로그인 → 자신의 /notifications에서 MENTION 알림 1개 확인
  const contextC = await browser.newContext();
  const pageC = await contextC.newPage();
  await loginAs(pageC, 'carol', 'carol-pw-1234');
  await pageC.goto('/notifications');

  const unreadItemsC = pageC.locator('li', { hasText: '미읽음' });
  await expect(unreadItemsC).toHaveCount(1);
  await expect(unreadItemsC.first()).toContainText('밥투');
  await expect(unreadItemsC.first()).toContainText('멘션');
  await expect(unreadItemsC.first()).toContainText('님이 멘션했습니다.');

  // 5. 회원 A(문서 작성자)는 독립적으로 자신의 COMMENT 알림 1개를 받아야 한다
  await pageA.goto('/notifications');

  const unreadItemsA = pageA.locator('li', { hasText: '미읽음' });
  await expect(unreadItemsA).toHaveCount(1);
  await expect(unreadItemsA.first()).toContainText('밥투');
  await expect(unreadItemsA.first()).toContainText('댓글');
  await expect(unreadItemsA.first()).toContainText('님이 댓글을 남겼습니다.');

  await contextA.close();
  await contextB.close();
  await contextC.close();
});
