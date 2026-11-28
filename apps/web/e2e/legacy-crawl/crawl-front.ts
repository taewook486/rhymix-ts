/**
 * 레거시 방문자(비관리자) 화면 지도 (읽기 전용 원칙, 예외는 아래에 명시).
 *
 * 레거시 소스의 modules/<모듈>/conf/module.xml 에서 Admin 이 아닌 disp* 액션을 모두 읽어
 * 비회원과 관리자 두 신분으로 각각 연다. 결과는 `.moai/reports/legacy-front-map/` 에 남는다.
 *
 * 방문하지 않는 액션:
 *   - install 모듈 전체 — 설치 마법사이며 dispInstallCheckEnv 등이 파일을 쓴다
 *   - dispMemberLogout — 세션이 끊긴다
 *
 * 알려진 부수효과(되돌림 필요):
 *   - 글 보기(document_srl 을 준 dispBoardContent / dispBoardContentView)는 조회수를 올린다.
 *     표본 글을 줄 때는 크롤 뒤 조회수를 원래 값으로 돌려놓는다(기준선 덤프로 복원).
 *   - dispMemberScrappedDocument 는 폴더 없는 스크랩을 기본 폴더로 옮기는 UPDATE 를 실행한다
 *     (스크랩 0건이면 바뀌는 행이 없다).
 *
 * 실행 (apps/web 에서):
 *   LEGACY_ADMIN_ID=admin LEGACY_ADMIN_PW=... LEGACY_SRC=/mnt/d/project/rhymix \
 *   LEGACY_FRONT_SAMPLES='{"mid":"board","document_srl":"..."}' \
 *     node e2e/legacy-crawl/crawl-front.ts
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium, type Page } from '@playwright/test';

// @ts-expect-error TS5097 — Node 22 타입 제거 실행(node e2e/...ts)은 ESM 이라 .ts 확장자를 붙여야 모듈을 찾는다.
import { BASE_URL, OUT_DIR as ADMIN_OUT_DIR, inspect, login, type PageRecord } from './crawl-admin.ts';

const OUT_DIR = path.join(path.dirname(ADMIN_OUT_DIR), 'legacy-front-map');
const LEGACY_SRC = process.env.LEGACY_SRC ?? path.resolve(ADMIN_OUT_DIR, '../../../../rhymix');

interface Samples {
  mid: string;
  document_srl?: string;
  comment_srl?: string;
  member_srl?: string;
  file_srl?: string;
}
const SAMPLES: Samples = { mid: 'board', ...(JSON.parse(process.env.LEGACY_FRONT_SAMPLES ?? '{}') as Partial<Samples>) };

const SKIP_MODULES = new Set(['install']);
const SKIP_ACTS = new Set(['dispMemberLogout']);

interface FrontAction {
  module: string;
  act: string;
  /** module.xml 의 permission 속성 (없으면 null) */
  permission: string | null;
  route: string | null;
}

function readFrontActions(): FrontAction[] {
  const modulesDir = path.join(LEGACY_SRC, 'modules');
  const out: FrontAction[] = [];
  for (const mod of readdirSync(modulesDir)) {
    let xml: string;
    try {
      xml = readFileSync(path.join(modulesDir, mod, 'conf/module.xml'), 'utf-8');
    } catch {
      continue;
    }
    for (const m of xml.matchAll(/<action name="(disp\w+)"([^>]*)>/g)) {
      const act = m[1]!;
      if (/Admin/.test(act)) continue;
      const attrs = m[2] ?? '';
      out.push({
        module: mod,
        act,
        permission: /permission="([^"]*)"/.exec(attrs)?.[1] ?? null,
        route: /route="([^"]*)"/.exec(attrs)?.[1] ?? null,
      });
    }
  }
  return out;
}

/** 액션별 URL. board 모듈은 게시판 mid 문맥이 필요하고, 나머지는 act 만으로 열린다. */
function urlFor(a: FrontAction): string {
  const p = new URLSearchParams();
  if (a.module === 'board' || a.module === 'document' || a.module === 'comment') p.set('mid', SAMPLES.mid);
  p.set('act', a.act);
  const needsDoc = /Write|Delete|Comment|UpdateLog$|ContentView|FileList|Print|CommentPage|NoticeList/.test(a.act);
  if (needsDoc && SAMPLES.document_srl) p.set('document_srl', SAMPLES.document_srl);
  if (/Declare|VoteLog/.test(a.act) && (SAMPLES.document_srl ?? SAMPLES.comment_srl)) {
    p.set('target_srl', (a.act === 'dispCommentDeclare' ? SAMPLES.comment_srl : SAMPLES.document_srl) ?? '');
  }
  if (/ReplyComment|ModifyComment|DeleteComment/.test(a.act) && SAMPLES.comment_srl) p.set('comment_srl', SAMPLES.comment_srl);
  if (a.act === 'dispBoardVoteLog') p.set('target', 'document');
  return `${BASE_URL}/index.php?${p.toString()}`;
}

async function excerpt(page: Page): Promise<string> {
  return page
    .locator('#content, .rd_body, .xe-content, main, body')
    .first()
    .innerText()
    .then((t) => t.replace(/\s+/g, ' ').trim().slice(0, 300))
    .catch(() => '');
}

interface Visit {
  who: 'guest' | 'admin';
  url: string;
  title: string;
  excerpt: string;
  forms: number;
  links: number;
  error?: string;
}

async function visitAll(actions: FrontAction[], who: Visit['who']): Promise<Map<string, Visit>> {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ locale: 'ko-KR' })).newPage();
  const result = new Map<string, Visit>();
  try {
    if (who === 'admin') await login(page);
    for (const a of actions) {
      const url = urlFor(a);
      const rec: PageRecord = await inspect(page, url, `방문자(${who})`);
      const v: Visit = {
        who,
        url,
        title: rec.title,
        excerpt: await excerpt(page),
        forms: rec.forms.length,
        links: rec.links.length,
        ...(rec.error ? { error: rec.error } : {}),
      };
      result.set(a.act, v);
      writeFileSync(
        path.join(OUT_DIR, 'pages', `${a.act}-${who}.json`),
        JSON.stringify({ ...rec, module: a.module, permission: a.permission, route: a.route, excerpt: v.excerpt }, null, 2),
        'utf-8',
      );
      console.log(`[방문자/${who}] ${a.module}.${a.act} — ${v.title}${v.error ? ` · 오류: ${v.error}` : ''}`);
    }
  } finally {
    await browser.close();
  }
  return result;
}

async function main(): Promise<void> {
  if (!process.env.LEGACY_ADMIN_ID || !process.env.LEGACY_ADMIN_PW) {
    throw new Error('LEGACY_ADMIN_ID / LEGACY_ADMIN_PW 환경변수가 필요합니다.');
  }
  mkdirSync(path.join(OUT_DIR, 'pages'), { recursive: true });

  const all = readFrontActions();
  const actions = all.filter((a) => !SKIP_MODULES.has(a.module) && !SKIP_ACTS.has(a.act));
  console.log(`[방문자] 선언 ${all.length} / 방문 대상 ${actions.length} / 표본 ${JSON.stringify(SAMPLES)}`);

  const guest = await visitAll(actions, 'guest');
  const admin = await visitAll(actions, 'admin');

  const cell = (v: Visit | undefined): string =>
    v ? `${v.title || '-'} · 폼 ${v.forms} · ${(v.error ?? v.excerpt).slice(0, 80).replace(/\|/g, '/')}` : '-';
  const md: string[] = [
    '# 레거시 방문자 화면 지도',
    '',
    `- 대상: ${BASE_URL} · 레거시 소스: \`${LEGACY_SRC}\``,
    `- 수집 시각: ${new Date().toISOString()}`,
    `- module.xml 선언 비관리자 disp 액션: ${all.length} (방문 ${actions.length}, 제외: install 모듈·dispMemberLogout)`,
    `- 표본: \`${JSON.stringify(SAMPLES)}\``,
    '- 신분: 비회원(guest), 관리자(admin). 일반 회원 계정은 기준선에 없어 관리자 화면으로 회원 화면을 본다.',
    '',
    '| 모듈 | act | permission | 비회원 | 관리자 |',
    '|---|---|---|---|---|',
  ];
  for (const a of actions) {
    md.push(`| ${a.module} | \`${a.act}\` | ${a.permission ?? '-'} | ${cell(guest.get(a.act))} | ${cell(admin.get(a.act))} |`);
  }
  md.push('', '## 방문하지 않은 액션', '');
  for (const a of all.filter((x) => !actions.includes(x))) md.push(`- ${a.module}.\`${a.act}\``);
  writeFileSync(path.join(OUT_DIR, 'summary.md'), md.join('\n') + '\n', 'utf-8');
  writeFileSync(
    path.join(OUT_DIR, 'index.json'),
    JSON.stringify({ baseUrl: BASE_URL, crawledAt: new Date().toISOString(), declared: all.length, visited: actions.length, samples: SAMPLES }, null, 2),
    'utf-8',
  );
  console.log(`[방문자] 완료 → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('[방문자 크롤 실패]', err);
  process.exit(1);
});
