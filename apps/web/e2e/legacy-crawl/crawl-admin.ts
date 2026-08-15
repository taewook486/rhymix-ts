/**
 * 레거시 Rhymix 관리자 화면 크롤러 (읽기 전용).
 *
 * 목적: 레거시(http://localhost:8080) 관리자 화면의 모든 링크·이벤트·폼·AJAX
 *       엔드포인트를 수집해 `.moai/reports/legacy-admin-map/` 에 기록한다.
 *       이 결과물이 SPEC-LEGACY-PARITY-* 시리즈 작성의 근거가 된다.
 *
 * 안전 원칙 (중요):
 *   - 절대 클릭하지 않는다. 버튼/폼은 DOM 에서 "읽기"만 한다.
 *   - GET 이동은 `disp*` 계열 조회 화면으로만 한다.
 *   - `proc*` 및 delete/insert/update/remove 계열 act 는 기록만 하고 이동하지 않는다.
 *   따라서 이 스크립트는 레거시 DB 를 변경하지 않는다.
 *
 * 실행:
 *   LEGACY_ADMIN_ID=admin LEGACY_ADMIN_PW=... \
 *     pnpm --filter @rhymix-ts/web exec tsx e2e/legacy-crawl/crawl-admin.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, type Page, type Browser } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const OUT_DIR = path.join(REPO_ROOT, '.moai/reports/legacy-admin-map');

const BASE_URL = process.env.LEGACY_BASE_URL ?? 'http://localhost:8080';
const ADMIN_ID = process.env.LEGACY_ADMIN_ID ?? '';
const ADMIN_PW = process.env.LEGACY_ADMIN_PW ?? '';
const MAX_PAGES = Number(process.env.LEGACY_CRAWL_MAX_PAGES ?? 400);
/**
 * 같은 act 의 파라미터 변형(메뉴 항목별 상세, 페이지 번호 등)을 몇 개까지 볼지.
 * 목적은 "화면 지도"이지 레코드 수집이 아니므로 소수의 표본이면 충분하다.
 */
const MAX_PER_ACT = Number(process.env.LEGACY_CRAWL_MAX_PER_ACT ?? 3);

/** 레거시 GNB 최상위 메뉴 키 → 한국어 라벨 (modules/admin/lang/ko.php:38-43). */
const GNB_GROUPS: Record<string, string> = {
  dashboard: '대시보드',
  menu: '사이트 제작/편집',
  user: '회원',
  content: '콘텐츠',
  configuration: '설정',
  advanced: '고급',
};

/** 이동하면 데이터가 바뀔 수 있는 act 패턴 — 기록만 하고 방문하지 않는다. */
const MUTATING_ACT = /^proc|delete|insert|update|remove|reset|restore|purge|logout/i;

interface LinkRecord {
  href: string;
  text: string;
  module: string | null;
  act: string | null;
  /**
   * visited: 실제 방문 / skipped-mutating: 변경 위험 / skipped-external: 외부 /
   * skipped-cap: 상한 초과 / skipped-other-group: 다른 그룹 소속이라 그쪽 차례에 방문
   */
  disposition:
    | 'visited'
    | 'queued'
    | 'skipped-mutating'
    | 'skipped-external'
    | 'skipped-cap'
    | 'skipped-act-cap'
    | 'skipped-chrome'
    | 'skipped-other-group';
}

interface EventRecord {
  tag: string;
  text: string;
  kind: 'onclick' | 'submit-button' | 'data-action' | 'anchor-js';
  /** onclick 속성 원문 또는 data-* 값 */
  handler: string;
  /** 핸들러 안에서 발견된 module.act 호출 대상 (exec_json/exec_xml 등) */
  targets: string[];
}

interface FormRecord {
  action: string;
  method: string;
  /** hidden 의 module/act 값 — 레거시는 대부분 여기로 대상이 정해진다 */
  moduleField: string | null;
  actField: string | null;
  fields: { name: string; type: string; required: boolean }[];
}

interface PageRecord {
  url: string;
  act: string | null;
  group: string;
  title: string;
  links: LinkRecord[];
  events: EventRecord[];
  forms: FormRecord[];
  /** 페이지 로드 중 실제로 발생한 XHR/fetch 요청 */
  xhr: { method: string; url: string }[];
  error?: string;
}

/** 핸들러 문자열에서 레거시 AJAX 호출 대상(module.act)을 뽑아낸다. */
function extractTargets(source: string): string[] {
  const found = new Set<string>();
  // 레거시 실측 기준 호출 헬퍼 4종 (exec_json / exec_xml / Rhymix.ajax / doCallModuleAction).
  const patterns = [
    /exec_json\s*\(\s*['"]([^'"]+)['"]/g,
    /exec_xml\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g,
    /Rhymix\.ajax\s*\(\s*['"]([^'"]+)['"]/g,
    /doCallModuleAction\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      found.add(m[2] ? `${m[1]}.${m[2]}` : m[1]!);
    }
  }
  return [...found];
}

function parseQuery(href: string): { module: string | null; act: string | null } {
  try {
    const u = new URL(href, BASE_URL);
    return { module: u.searchParams.get('module'), act: u.searchParams.get('act') };
  } catch {
    return { module: null, act: null };
  }
}

/** 관리자 화면(module=admin 또는 act=disp*Admin*)인지 판정. */
function isAdminUrl(href: string): boolean {
  const u = (() => {
    try {
      return new URL(href, BASE_URL);
    } catch {
      return null;
    }
  })();
  if (!u) return false;
  if (u.origin !== new URL(BASE_URL).origin) return false;
  const { module, act } = parseQuery(href);
  return module === 'admin' || (act !== null && /^disp.*Admin/i.test(act));
}

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/index.php?module=admin`, { waitUntil: 'domcontentloaded' });

  // 이미 로그인된 세션이면 로그인 폼이 없다.
  const idField = page.locator('input[name="user_id"], input[name="email_address"]').first();
  if ((await idField.count()) === 0) return;

  await idField.fill(ADMIN_ID);
  await page.locator('input[name="password"]').first().fill(ADMIN_PW);
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page.locator('form').first().evaluate((f: HTMLFormElement) => f.submit()),
  ]);

  // 로그인 제출은 리다이렉트를 연쇄로 일으킨다. 여기서 완전히 가라앉히지 않으면
  // 다음 goto 가 "interrupted by another navigation" 으로 실패한다.
  await page.waitForLoadState('load').catch(() => undefined);
  await page.waitForTimeout(1_000);

  const stillHasLogin = await page
    .locator('input[name="user_id"], input[name="email_address"]')
    .count();
  if (stillHasLogin > 0) {
    throw new Error('관리자 로그인 실패 — LEGACY_ADMIN_ID / LEGACY_ADMIN_PW 를 확인하세요.');
  }
}

interface GnbGroup {
  group: string;
  /** 그룹의 첫 화면 — 그룹 머리글 <a> 는 아코디언용 앵커(#...)라 하위 첫 링크를 쓴다. */
  landing: string | null;
  /** 그룹 <li> 안에 중첩된 <ul> 의 링크 — 이 그룹 소속임이 마크업으로 확정된 것들 */
  links: string[];
}

/**
 * GNB 를 구조 그대로 읽는다.
 *
 * 레거시 GNB(`#gnbNav`)는 그룹마다 <li> 하나이고 그 안에 해당 그룹의 하위 메뉴 <ul> 이
 * 중첩돼 있다(modules/admin/tpl/_header.html:53-69). 따라서 "이 화면이 어느 그룹인가"는
 * 추론할 필요 없이 마크업이 이미 답을 갖고 있다. 즐겨찾기도 같은 형태의 <li> 다.
 */
async function collectGnb(page: Page): Promise<GnbGroup[]> {
  await page.goto(`${BASE_URL}/index.php?module=admin`, { waitUntil: 'domcontentloaded' });

  const raw = await page.locator('#gnbNav > li').evaluateAll((lis) =>
    lis.map((li) => {
      const head = li.querySelector(':scope > a');
      const label = (head?.textContent ?? '').replace(/\s+/g, ' ').trim();
      const links = [...li.querySelectorAll(':scope > ul a[href]')].map(
        (a) => (a as HTMLAnchorElement).href,
      );
      return { label, links };
    }),
  );

  return raw
    .filter((g) => g.label.length > 0)
    .map((g) => {
      const links = g.links.map((h) => h.split('#')[0]!).filter((h) => isAdminUrl(h));
      return { group: g.label, landing: links[0] ?? null, links };
    });
}

/**
 * 헤더·푸터처럼 모든 화면에 공통으로 붙는 "껍데기" 링크를 찾는다.
 *
 * 이 링크들은 GNB 하위 메뉴에 없기 때문에 그룹 소속이 확정되지 않는다. 그대로 두면
 * 가장 먼저 순회한 그룹이 자기 것으로 채가서(예: 헤더의 "내 계정" → 사이트 제작/편집)
 * 영역 SPEC 이 틀린 근거를 갖게 된다. 모든 그룹 랜딩에 공통으로 등장하는 링크를
 * 껍데기로 판정해 그룹 귀속에서 제외한다.
 */
async function detectChrome(page: Page, gnb: GnbGroup[]): Promise<Set<string>> {
  const landings = gnb.map((g) => g.landing).filter((u): u is string => u !== null);
  if (landings.length < 2) return new Set();

  let common: Set<string> | null = null;
  for (const url of landings) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLAnchorElement).href));
    const set = new Set(hrefs.map((h) => h.split('#')[0]!).filter((h) => isAdminUrl(h)));
    if (common === null) {
      common = set;
    } else {
      for (const u of [...common]) if (!set.has(u)) common.delete(u);
    }
  }
  return common ?? new Set();
}

/** GNB 구조에서 곧바로 URL → 그룹 매핑을 만든다 (먼저 등장한 그룹이 소유). */
function buildGroupMapFromGnb(gnb: GnbGroup[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const g of gnb) {
    for (const url of g.links) {
      if (!map.has(url)) map.set(url, g.group);
    }
  }
  return map;
}

/** 한 화면을 읽어 링크·이벤트·폼·XHR 을 수집한다 (클릭하지 않는다). */
async function inspect(page: Page, url: string, group: string): Promise<PageRecord> {
  const xhr: { method: string; url: string }[] = [];
  const onRequest = (req: { resourceType(): string; method(): string; url(): string }) => {
    if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
      xhr.push({ method: req.method(), url: req.url() });
    }
  };
  page.on('request', onRequest);

  const record: PageRecord = {
    url,
    act: parseQuery(url).act,
    group,
    title: '',
    links: [],
    events: [],
    forms: [],
    xhr,
  };

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    record.title = (await page.title()).trim();

    // --- 링크 ---
    const rawLinks = await page.locator('a[href]').evaluateAll((nodes) =>
      nodes.map((n) => ({
        href: (n as HTMLAnchorElement).href,
        text: (n.textContent ?? '').replace(/\s+/g, ' ').trim(),
      })),
    );
    for (const l of rawLinks) {
      const { module, act } = parseQuery(l.href);
      record.links.push({ href: l.href, text: l.text, module, act, disposition: 'queued' });
    }

    // --- 이벤트 (클릭하지 않고 속성만 읽는다) ---
    record.events = await page
      .locator('[onclick], button, input[type="submit"], input[type="button"], [data-action]')
      .evaluateAll((nodes) =>
        nodes.map((n) => {
          const el = n as HTMLElement;
          const onclick = el.getAttribute('onclick') ?? '';
          const dataAction = el.getAttribute('data-action') ?? '';
          const kind = onclick
            ? 'onclick'
            : dataAction
              ? 'data-action'
              : el.tagName === 'A'
                ? 'anchor-js'
                : 'submit-button';
          return {
            tag: el.tagName.toLowerCase(),
            text: (el.textContent ?? (el as HTMLInputElement).value ?? '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 80),
            kind,
            handler: (onclick || dataAction).slice(0, 300),
            targets: [] as string[],
          };
        }),
      );
    for (const ev of record.events) ev.targets = extractTargets(ev.handler);

    // --- 폼 ---
    // 주의: 이 콜백 안에서 `const 이름 = () => {}` 형태의 함수를 만들지 말 것.
    //       tsx(esbuild)가 __name 헬퍼 호출을 주입하는데 브라우저 컨텍스트에는 그 헬퍼가
    //       없어서 ReferenceError: __name is not defined 로 죽는다.
    record.forms = await page.locator('form').evaluateAll((nodes) =>
      nodes.map((n) => {
        const f = n as HTMLFormElement;
        const named = [...f.querySelectorAll('input,select,textarea')] as HTMLInputElement[];
        let moduleField: string | null = null;
        let actField: string | null = null;
        for (const i of named) {
          if (i.name === 'module') moduleField = i.value;
          if (i.name === 'act') actField = i.value;
        }
        return {
          action: f.getAttribute('action') ?? '',
          method: (f.getAttribute('method') ?? 'get').toLowerCase(),
          moduleField,
          actField,
          fields: named.map((i) => ({
            name: i.name,
            type: i.type ?? i.tagName.toLowerCase(),
            required: i.required === true,
          })),
        };
      }),
    );

    // --- 인라인 스크립트에서 AJAX 대상 추가 수집 ---
    const scripts = await page
      .locator('script:not([src])')
      .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ''));
    const scriptTargets = extractTargets(scripts.join('\n'));
    if (scriptTargets.length > 0) {
      record.events.push({
        tag: 'script',
        text: '(인라인 스크립트)',
        kind: 'data-action',
        handler: '(inline script aggregate)',
        targets: scriptTargets,
      });
    }
  } catch (err) {
    record.error = err instanceof Error ? err.message : String(err);
  } finally {
    page.off('request', onRequest);
  }

  return record;
}

/**
 * 파일명 생성. act 만 쓰면 같은 act 의 다른 화면(srl/페이지 파라미터 차이)이
 * 서로 덮어쓰므로 전체 URL 해시를 붙여 충돌을 막는다.
 */
function slugify(url: string): string {
  const { module, act } = parseQuery(url);
  const base = (act ?? module ?? 'page').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60);
  let hash = 0;
  for (let i = 0; i < url.length; i += 1) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
  }
  return `${base}-${hash.toString(36)}`;
}

async function main(): Promise<void> {
  if (!ADMIN_ID || !ADMIN_PW) {
    throw new Error(
      'LEGACY_ADMIN_ID / LEGACY_ADMIN_PW 환경변수가 필요합니다. 재설치 때 정한 관리자 계정을 넣으세요.',
    );
  }

  mkdirSync(path.join(OUT_DIR, 'pages'), { recursive: true });

  const browser: Browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'ko-KR' });
  const page = await context.newPage();

  const pages: PageRecord[] = [];
  const visited = new Set<string>();
  const skipped: LinkRecord[] = [];
  /** act 별 방문 횟수 — MAX_PER_ACT 를 넘으면 같은 화면의 변형으로 보고 건너뛴다. */
  const actSeen = new Map<string, number>();

  try {
    await login(page);
    const gnb = await collectGnb(page);
    console.log(`[크롤] GNB 최상위 ${gnb.length}개 수집: ${gnb.map((g) => g.group).join(', ')}`);

    const groupMap = buildGroupMapFromGnb(gnb);
    console.log(`[크롤] 그룹 소속이 마크업으로 확정된 URL: ${groupMap.size}개`);

    const chrome = await detectChrome(page, gnb);
    console.log(`[크롤] 공통 껍데기(헤더·푸터) 링크: ${chrome.size}개 — 그룹 귀속에서 제외`);

    // 훑는 순서: 지정된 작업 순서를 먼저 따르고, GNB 에 있으나 목록에 없는 그룹
    // (대시보드 등)은 뒤에 붙인다. 대시보드는 관리자 링크를 전부 품고 있어 먼저 돌면
    // 다른 그룹 화면을 가로챈다.
    const PREFERRED = ['사이트 제작/편집', '회원', '콘텐츠', '즐겨찾기', '설정', '고급'];
    const found = gnb.map((g) => g.group);
    const crawlOrder = [
      ...PREFERRED.filter((g) => found.includes(g)),
      ...found.filter((g) => !PREFERRED.includes(g)),
    ];
    console.log(`[크롤] 순회 순서: ${crawlOrder.join(' → ')}`);

    for (const groupName of crawlOrder) {
      const entry = gnb.find((g) => g.group === groupName);
      if (!entry || !entry.landing || pages.length >= MAX_PAGES) continue;

      const queue: { url: string; group: string }[] = [{ url: entry.landing, group: groupName }];

      while (queue.length > 0 && pages.length < MAX_PAGES) {
        const item = queue.shift()!;
        const key = item.url.split('#')[0]!;
        if (visited.has(key)) continue;
        visited.add(key);

        const record = await inspect(page, key, groupMap.get(key) ?? item.group);
        pages.push(record);
        console.log(
          `[${pages.length}/${MAX_PAGES}] ${record.group} · ${record.act ?? '(act 없음)'} ` +
            `— 링크 ${record.links.length} / 이벤트 ${record.events.length} / 폼 ${record.forms.length}` +
            (record.error ? ` · 오류: ${record.error}` : ''),
        );

        for (const link of record.links) {
          const bare = link.href.split('#')[0]!;
          if (!isAdminUrl(bare)) {
            link.disposition = 'skipped-external';
            continue;
          }
          if (link.act && MUTATING_ACT.test(link.act)) {
            link.disposition = 'skipped-mutating';
            skipped.push(link);
            continue;
          }
          if (visited.has(bare)) {
            link.disposition = 'visited';
            continue;
          }
          // 다른 그룹 소속이 확정된 링크는 그 그룹 차례에 방문한다 — 여기서 가로채지 않는다.
          const owner = groupMap.get(bare);
          if (owner && owner !== groupName) {
            link.disposition = 'skipped-other-group';
            continue;
          }
          // 헤더·푸터 공통 링크는 어느 그룹의 것도 아니다. 마지막 공통 패스에서 따로 방문한다.
          if (!owner && chrome.has(bare)) {
            link.disposition = 'skipped-chrome';
            continue;
          }
          if (pages.length + queue.length >= MAX_PAGES) {
            link.disposition = 'skipped-cap';
            continue;
          }
          // 같은 act 를 이미 충분히 봤으면 파라미터 변형으로 간주하고 건너뛴다.
          const actKey = `${link.module ?? '-'}.${link.act ?? '-'}`;
          const seen = actSeen.get(actKey) ?? 0;
          if (seen >= MAX_PER_ACT) {
            link.disposition = 'skipped-act-cap';
            continue;
          }
          actSeen.set(actKey, seen + 1);
          link.disposition = 'queued';
          queue.push({ url: bare, group: groupName });
        }

        writeFileSync(
          path.join(OUT_DIR, 'pages', `${slugify(key)}.json`),
          JSON.stringify(record, null, 2),
          'utf-8',
        );
      }
    }

    // 마지막으로 공통 껍데기 화면을 별도 그룹으로 수집한다 — 어느 영역 SPEC 의 범위도 아니지만
    // 화면 자체는 존재하므로 지도에는 남긴다.
    for (const url of chrome) {
      if (visited.has(url) || pages.length >= MAX_PAGES) continue;
      // 껍데기 링크에도 변경성 act 가 섞여 있다(푸터의 procAdminLogout). 그룹 순회 루프와 달리
      // 이 패스는 링크 disposition 을 거치지 않으므로 여기서 다시 걸러야 한다. 로그아웃을 방문하면
      // 세션이 끊겨 이후 순서의 화면이 로그인 페이지로 기록된다.
      const { act } = parseQuery(url);
      if (act && MUTATING_ACT.test(act)) continue;
      visited.add(url);
      const record = await inspect(page, url, groupMap.get(url) ?? '공통(헤더/푸터)');
      pages.push(record);
      console.log(`[${pages.length}/${MAX_PAGES}] ${record.group} · ${record.act ?? '(act 없음)'}`);
      writeFileSync(
        path.join(OUT_DIR, 'pages', `${slugify(url)}.json`),
        JSON.stringify(record, null, 2),
        'utf-8',
      );
    }
  } finally {
    await browser.close();
  }

  // --- 요약 산출물 ---
  const byGroup = new Map<string, PageRecord[]>();
  for (const p of pages) {
    const arr = byGroup.get(p.group) ?? [];
    arr.push(p);
    byGroup.set(p.group, arr);
  }

  writeFileSync(
    path.join(OUT_DIR, 'index.json'),
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        crawledAt: new Date().toISOString(),
        pageCount: pages.length,
        skippedMutatingCount: skipped.length,
        groups: [...byGroup.entries()].map(([group, ps]) => ({ group, pageCount: ps.length })),
      },
      null,
      2,
    ),
    'utf-8',
  );

  const md: string[] = [
    '# 레거시 관리자 화면 지도',
    '',
    `- 대상: ${BASE_URL}`,
    `- 수집 시각: ${new Date().toISOString()}`,
    `- 방문 페이지: ${pages.length}`,
    `- 변경 위험으로 방문하지 않은 링크: ${skipped.length}`,
    '',
  ];
  for (const [group, ps] of byGroup) {
    md.push(`## ${group} (${ps.length}개 화면)`, '');
    md.push('| act | 제목 | 링크 | 이벤트 | 폼 | XHR |', '|---|---|---:|---:|---:|---:|');
    for (const p of ps) {
      md.push(
        `| \`${p.act ?? '-'}\` | ${p.title || '-'} | ${p.links.length} | ` +
          `${p.events.length} | ${p.forms.length} | ${p.xhr.length} |`,
      );
    }
    md.push('');
  }
  if (skipped.length > 0) {
    md.push('## 방문하지 않은 변경성 링크 (기록만)', '');
    for (const s of skipped.slice(0, 200)) {
      md.push(`- \`${s.act}\` — ${s.text || '(라벨 없음)'}`);
    }
    md.push('');
  }
  writeFileSync(path.join(OUT_DIR, 'summary.md'), md.join('\n'), 'utf-8');

  console.log(`\n[완료] ${pages.length}개 화면 → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('[크롤 실패]', err);
  process.exit(1);
});
