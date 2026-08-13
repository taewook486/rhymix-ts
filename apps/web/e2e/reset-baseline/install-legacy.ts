/**
 * 레거시 Rhymix 설치 마법사 자동 진행 스크립트.
 *
 * 목적: DB 초기화 직후의 레거시(http://localhost:8080)를 뉴버전과 **동일한 값**으로
 *       설치해, 두 화면 비교가 공정해지도록 기준선을 맞춘다.
 *
 * 설계: 레거시 설치는 단계 수와 필드 구성이 버전마다 다르므로 단계를 하드코딩하지 않는다.
 *       매 단계에서 form#body 의 필드를 읽어 아는 이름만 채우고 제출하며,
 *       각 단계의 act 와 필드 목록을 콘솔에 남겨 실패 시 원인을 바로 알 수 있게 한다.
 *
 * 실행:
 *   pnpm --filter @rhymix-ts/web exec tsx e2e/reset-baseline/install-legacy.ts
 */

import { chromium, type Page } from '@playwright/test';

const BASE_URL = process.env.LEGACY_BASE_URL ?? 'http://localhost:8080';
const MAX_STEPS = 12;

/**
 * 설치 폼에 채울 값. 키는 레거시 input name 과 일치한다.
 * DB 접속 정보는 컨테이너 내부 기준(compose 서비스명 `db`, 내부 포트 3306)이며
 * 초기화 전 config.php 에 있던 값과 동일하다 — 재설치 후 위상이 그대로 재현된다.
 */
const VALUES: Record<string, string> = {
  // 1단계 — 라이선스
  license_agreement: 'Y',
  // DB 접속 — 실제 필드명은 db_host/db_user/db_pass/db_prefix 다 (1차 실행에서 확인).
  db_type: 'mysql',
  db_host: 'db',
  db_port: '3306',
  db_user: 'rhymix',
  db_pass: 'rhymixpass',
  db_database: 'rhymix',
  db_prefix: 'rx_',
  // 관리자 계정 — 뉴버전과 동일
  admin_email: 'admin@example.com',
  email_address: 'admin@example.com',
  user_id: 'admin',
  password: 'Rhymix!2026',
  admin_password: 'Rhymix!2026',
  password2: 'Rhymix!2026',
  admin_password2: 'Rhymix!2026',
  nick_name: 'admin',
  user_name: 'admin',
  time_zone: '+0900',
};

interface FieldInfo {
  name: string;
  type: string;
  tag: string;
}

async function readForm(page: Page): Promise<{ act: string; fields: FieldInfo[] }> {
  const fields = await page
    .locator('form#body input, form#body select, form#body textarea, form input, form select')
    .evaluateAll((nodes) =>
      nodes.map((n) => {
        const el = n as HTMLInputElement;
        return {
          name: el.name ?? '',
          type: (el.type ?? el.tagName).toLowerCase(),
          tag: el.tagName.toLowerCase(),
        };
      }),
    );
  const act = fields.length > 0 ? await page.inputValue('input[name="act"]').catch(() => '') : '';
  return { act, fields };
}

async function fillStep(page: Page, fields: FieldInfo[]): Promise<string[]> {
  const filled: string[] = [];
  for (const f of fields) {
    if (!f.name || f.type === 'hidden' || f.type === 'submit') continue;
    const value = VALUES[f.name];
    if (value === undefined) continue;

    const loc = page.locator(`[name="${f.name}"]`).first();
    try {
      if (f.type === 'checkbox') {
        await loc.check();
      } else if (f.tag === 'select') {
        await loc.selectOption(value).catch(async () => {
          // 값이 목록에 없으면 라벨로 재시도 (타임존 표기가 버전마다 다름)
          await loc.selectOption({ label: value });
        });
      } else if (f.type === 'radio') {
        await page.locator(`[name="${f.name}"][value="${value}"]`).first().check();
      } else {
        await loc.fill(value);
      }
      filled.push(f.name);
    } catch {
      // 채우지 못한 필드는 로그로만 남기고 계속 — 필수라면 다음 단계에서 오류로 드러난다
    }
  }
  return filled;
}

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage({ locale: 'ko-KR' } as never);

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // 같은 act 가 반복되면 필수 필드를 못 채운 것 — 헛도는 대신 즉시 멈춘다.
    let lastAct = '';
    let repeat = 0;

    for (let step = 1; step <= MAX_STEPS; step += 1) {
      const title = (await page.title()).trim();
      const { act, fields } = await readForm(page);

      // 설치 중인지 판정 — 폼 기반 단계(module=install 히든)와 링크 기반 단계(act=...Install...)를
      // 모두 인정한다. 둘 다 아니면 설치가 끝나 일반 페이지로 나온 것이다.
      const hasInstallHidden = await page.locator('input[name="module"][value="install"]').count();
      const urlLooksInstall = /Install/i.test(page.url());
      if (hasInstallHidden === 0 && !urlLooksInstall) {
        console.log(`\n[완료] ${step - 1}단계에서 설치 종료 — 현재 화면: ${title}`);
        console.log(`       URL: ${page.url()}`);
        break;
      }

      repeat = act && act === lastAct ? repeat + 1 : 0;
      lastAct = act;
      if (repeat >= 2) {
        console.log(
          `[중단] act=${act} 단계가 ${repeat + 1}회 반복됩니다 — 필수 필드를 못 채우고 있습니다.\n` +
            `       위 "입력 가능 필드" 목록과 VALUES 의 키가 일치하는지 확인하세요.`,
        );
        break;
      }

      const filled = await fillStep(page, fields);
      console.log(
        `[${step}단계] act=${act || '(없음)'} · 제목="${title}"\n` +
          `         입력 가능 필드: ${fields
            .filter((f) => f.name && f.type !== 'hidden')
            .map((f) => `${f.name}(${f.type})`)
            .join(', ') || '(없음)'}\n` +
          `         채운 값: ${filled.join(', ') || '(없음)'}`,
      );

      const submit = page
        .locator('form#body button[type="submit"], form#body input[type="submit"], form button[type="submit"]')
        .first();

      if ((await submit.count()) > 0) {
        await Promise.all([page.waitForLoadState('domcontentloaded'), submit.click()]);
      } else {
        // 폼이 없는 단계(환경 자가진단 등)는 "다음" 링크로 넘어간다.
        const nextLinks = await page.locator('a[href*="Install"]').evaluateAll((nodes) =>
          nodes.map((n) => ({
            href: (n as HTMLAnchorElement).href,
            text: (n.textContent ?? '').replace(/\s+/g, ' ').trim(),
          })),
        );
        // 이미 지나온 단계로 되돌아가지 않도록 disp/proc 진행 방향 링크만 고른다.
        const forward = nextLinks.find((l) => !/License/i.test(l.href));
        if (!forward) {
          console.log(
            `[중단] 진행할 폼도 링크도 없습니다. 발견된 링크: ` +
              `${nextLinks.map((l) => `${l.text}→${l.href}`).join(' | ') || '(없음)'}`,
          );
          break;
        }
        console.log(`         (폼 없음 → 링크 이동: "${forward.text}")`);
        await page.goto(forward.href, { waitUntil: 'domcontentloaded' });
      }
      await page.waitForTimeout(800);

      // 레거시는 오류를 alert 대신 화면 문구로 노출하는 경우가 많다.
      const errorText = await page
        .locator('.message.error, .error, #rx_error')
        .first()
        .textContent()
        .catch(() => null);
      if (errorText && errorText.trim()) {
        console.log(`[오류 문구] ${errorText.trim().slice(0, 200)}`);
      }
    }

    await page.screenshot({ path: 'e2e/reset-baseline/legacy-install-final.png', fullPage: true });
    console.log('[스크린샷] e2e/reset-baseline/legacy-install-final.png');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[설치 실패]', err);
  process.exit(1);
});
