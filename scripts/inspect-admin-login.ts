/**
 * ASIS Rhymix Admin Inspector - 정밀 로그인 버전
 */

import { chromium } from 'playwright';

async function inspectWithProperLogin() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const page = await browser.newPage();

  console.log('🌐 http://localhost/ 접속...');
  await page.goto('http://localhost/', { waitUntil: 'networkidle' });
  await sleep(2000);

  // CSRF 토큰 추출
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
  console.log(`🔑 CSRF Token: ${csrfToken}`);

  // 현재 페이지 상태 확인
  const currentMid = await page.evaluate(() => (window as any).current_mid || 'unknown');
  console.log(`📍 Current MID: ${currentMid}`);

  // 로그인 폼 확인
  const loginFormVisible = await page.locator('form[action*="procMemberLogin"], form:has-text("로그인")').isVisible().catch(() => false);
  console.log(`📝 로그인 폼 visible: ${loginFormVisible}`);

  if (loginFormVisible) {
    console.log('🔐 로그인 진행...');

    // ID 입력
    await page.fill('input[name="user_id"]', 'comfit99@naver.com');
    console.log('✅ ID 입력 완료');

    // PW 입력
    await page.fill('input[name="password"]', 'rhymix123');
    console.log('✅ PW 입력 완료');

    // 스크린샷: 로그인 입력 후
    await page.screenshot({ path: 'screenshots/login-filled.png' });
    console.log('📸 스크린샷: screenshots/login-filled.png');

    // 로그인 버튼 클릭
    try {
      await page.click('button:has-text("로그인"), input[type="submit"]');
      console.log('✅ 로그인 버튼 클릭');

      // 페이지 이동 대기
      await sleep(5000);

      // 스크린샷: 로그인 후
      await page.screenshot({ path: 'screenshots/after-login.png', fullPage: true });
      console.log('📸 스크린샷: screenshots/after-login.png');

      // 현재 URL
      console.log(`📍 현재 URL: ${page.url()}`);
      console.log(`📍 현재 제목: ${await page.title()}`);

      // 로그인 확인
      const logoutButton = await page.locator('a:has-text("로그아웃"), a:has-text("Logout")').isVisible().catch(() => false);
      console.log(`✅ 로그인 성공: ${logoutButton}`);

      if (logoutButton) {
        // 관리자 페이지로 이동
        console.log('\n🔍 관리자 페이지로 이동...');

        // 관리자 링크 찾기
        const adminLinks = await page.locator('a').all();
        for (const link of adminLinks) {
          try {
            const text = await link.textContent();
            const href = await link.getAttribute('href');

            if (text && (text.includes('관리자') || text.includes('Admin') || href?.includes('admin'))) {
              console.log(`🔗 발견: ${text} -> ${href}`);

              if (href) {
                await link.click();
                await sleep(3000);

                // 스크린샷: 관리자 페이지
                await page.screenshot({ path: 'screenshots/admin-page.png', fullPage: true });
                console.log('📸 스크린샷: screenshots/admin-page.png');

                break;
              }
            }
          } catch (e) {}
        }

        // 관리자 페이지에서 모든 링크와 버튼 추출
        console.log('\n🔍 관리자 페이지 구조 분석...');

        const allText = await page.locator('body').textContent();
        console.log('페이지 내용 미리보기:');
        console.log(allText?.slice(0, 1000));

        // 모든 링크
        const links = await page.locator('a').all();
        console.log(`\n📋 총 ${links.length}개 링크 발견`);

        for (const link of links.slice(0, 50)) {
          try {
            const text = await link.textContent();
            const href = await link.getAttribute('href');
            if (text && text.trim() && text.trim().length < 100) {
              console.log(`   - ${text.trim()} -> ${href || 'no-href'}`);
            }
          } catch (e) {}
        }

        // 모든 버튼
        const buttons = await page.locator('button, input[type="submit"], input[type="button"]').all();
        console.log(`\n🔘 총 ${buttons.length}개 버튼 발견`);

        for (const btn of buttons.slice(0, 30)) {
          try {
            const text = await btn.textContent();
            const type = await btn.getAttribute('type');
            if (text && text.trim() && text.trim().length < 100) {
              console.log(`   - [${type || 'button'}] ${text.trim()}`);
            }
          } catch (e) {}
        }

        // 30초 대기 (사용자 확인용)
        console.log('\n⏸️ 30초 후 브라우저 닫기...');
        await sleep(30000);
      }
    } catch (e) {
      console.error('❌ 로그인 실패:', e);
    }
  } else {
    console.log('⚠️ 로그인 폼을 찾을 수 없습니다');

    // 이미 로그인된 상태인지 확인
    const logoutButton = await page.locator('a:has-text("로그아웃"), a:has-text("Logout")').isVisible().catch(() => false);
    if (logoutButton) {
      console.log('✅ 이미 로그인된 상태입니다!');
    }
  }

  await browser.close();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

inspectWithProperLogin().catch(console.error);
