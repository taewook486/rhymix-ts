/**
 * 레거시 관리자 화면 지도 보충 + 커버리지 집계 (읽기 전용).
 *
 * crawl-admin.ts 는 GNB 에서 링크를 따라가므로, 레코드 번호 같은 파라미터가 있어야 열리는
 * 하위 화면은 지도에 남지 않는다. 이 스크립트는
 *   1) 레거시 소스의 modules/<모듈>/conf/module.xml 에 선언된 disp*Admin* 액션 전체를 읽고
 *   2) 지도(pages/*.json)에 없는 액션을 기준선 DB 의 표본 레코드 번호로 직접 방문해 기록하고
 *   3) 선언 대비 커버리지와 그룹별 고유 act 집계를 coverage.md 로 쓴다.
 *
 * 안전 원칙: disp* 조회 화면만 GET 으로 연다. 방문 전 레거시 소스에서 각 화면 함수에
 * DB 쓰기가 없는지 확인했다(dispLayoutAdminLayoutModify 는 delete_tmp 파라미터를 줄 때만
 * 임시 파일을 지우므로 그 파라미터를 넣지 않는다).
 *
 * 실행 (apps/web 에서, crawl-admin.ts 를 먼저 돌린 뒤):
 *   LEGACY_ADMIN_ID=admin LEGACY_ADMIN_PW=... LEGACY_SRC=/mnt/d/project/rhymix \
 *     node e2e/legacy-crawl/crawl-supplement.ts
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';

// @ts-expect-error TS5097 — Node 22 타입 제거 실행(node e2e/...ts)은 ESM 이라 .ts 확장자를 붙여야 모듈을 찾는다.
import { BASE_URL, OUT_DIR, inspect, login, slugify, type PageRecord } from './crawl-admin.ts';

const LEGACY_SRC = process.env.LEGACY_SRC ?? path.resolve(OUT_DIR, '../../../../rhymix');

/**
 * 파라미터 화면의 표본 값. 2026-11-28 기준선 DB(rhymix-db)에서 조회한 실제 레코드 번호다.
 * 레거시를 재설치하면 번호가 바뀌므로 그때는 이 표를 다시 맞춘다.
 * 값이 null 인 항목은 해당 레코드가 기준선에 0건이라 파라미터 없이 연다.
 */
const SAMPLE_PARAMS: Record<string, Record<string, string> | null> = {
  dispAddonAdminInfo: { selected_addon: 'autolink' },
  dispBoardAdminDeleteBoard: { module_srl: '51' },
  dispBoardAdminInsertBoard: { module_srl: '51' },
  dispCommentAdminDeclaredLogByCommentSrl: null, // 댓글 0건
  dispDocumentAdminAlias: { document_srl: '67' },
  dispDocumentAdminDeclaredLogByDocumentSrl: { target_srl: '67' },
  dispFileAdminEdit: null, // 파일 0건
  dispLayoutAdminEdit: { layout_srl: '106' },
  dispLayoutAdminInsert: { layout: 'default', type: 'P' },
  dispLayoutAdminLayoutModify: { layout_srl: '106' },
  dispMemberAdminInsert: { member_srl: '5' },
  dispModuleAdminInfo: { selected_module: 'board' },
  dispModuleAdminModuleAdditionSetup: { module_srls: '51' },
  dispModuleAdminModuleGrantSetup: { module_srls: '51' },
  dispModuleAdminModuleSetup: { module_srls: '51' },
  dispPageAdminContentModify: { module_srl: '49' },
  dispPageAdminDelete: { module_srl: '49' },
  dispPageAdminMobileContent: { module_srl: '49' },
  dispPageAdminMobileContentModify: { module_srl: '49' },
  dispPollAdminResult: null, // 설문 0건
  dispTrashAdminView: null, // 휴지통 0건
  dispWidgetAdminAddContent: { module_srl: '49' },
};

interface DeclaredAction {
  module: string;
  act: string;
}

function readDeclaredAdminActions(): DeclaredAction[] {
  const modulesDir = path.join(LEGACY_SRC, 'modules');
  const out: DeclaredAction[] = [];
  for (const mod of readdirSync(modulesDir)) {
    let xml: string;
    try {
      xml = readFileSync(path.join(modulesDir, mod, 'conf/module.xml'), 'utf-8');
    } catch {
      continue;
    }
    for (const m of xml.matchAll(/<action name="(disp\w*Admin\w*)"/g)) {
      out.push({ module: mod, act: m[1]! });
    }
  }
  return out;
}

function readPages(): PageRecord[] {
  const dir = path.join(OUT_DIR, 'pages');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf-8')) as PageRecord);
}

async function main(): Promise<void> {
  const id = process.env.LEGACY_ADMIN_ID ?? '';
  const pw = process.env.LEGACY_ADMIN_PW ?? '';
  if (!id || !pw) throw new Error('LEGACY_ADMIN_ID / LEGACY_ADMIN_PW 환경변수가 필요합니다.');

  const declared = readDeclaredAdminActions();
  const crawledBefore = new Set(readPages().map((p) => p.act).filter(Boolean) as string[]);
  const missing = declared.filter((d) => !crawledBefore.has(d.act));
  console.log(`[보충] 선언 ${declared.length} / 지도 ${crawledBefore.size} / 누락 ${missing.length}`);

  const browser = await chromium.launch();
  const page = await (await browser.newContext({ locale: 'ko-KR' })).newPage();
  try {
    await login(page);
    for (const d of missing) {
      const params = new URLSearchParams({ module: 'admin', act: d.act, ...(SAMPLE_PARAMS[d.act] ?? {}) });
      const url = `${BASE_URL}/index.php?${params.toString()}`;
      const record = (await inspect(page, url, '보충(파라미터 화면)')) as PageRecord & {
        supplement?: { module: string; sampleParams: Record<string, string> | null; bodyExcerpt: string };
      };
      // 관리자 껍데기(GNB)를 건너뛰고 본문 영역을 읽는다. 오류 화면은 #content 가 없을 수 있다.
      const bodyExcerpt = await page
        .locator('#content, body')
        .first()
        .innerText()
        .then((t) => t.replace(/\s+/g, ' ').trim().slice(0, 300))
        .catch(() => '');
      record.supplement = { module: d.module, sampleParams: SAMPLE_PARAMS[d.act] ?? null, bodyExcerpt };
      writeFileSync(
        path.join(OUT_DIR, 'pages', `${slugify(url)}.json`),
        JSON.stringify(record, null, 2),
        'utf-8',
      );
      console.log(`[보충] ${d.module}.${d.act} — ${record.title || '(제목 없음)'}${record.error ? ` · 오류: ${record.error}` : ''}`);
    }
  } finally {
    await browser.close();
  }

  writeCoverage(declared);
}

function writeCoverage(declared: DeclaredAction[]): void {
  const pages = readPages();
  const byAct = new Map<string, PageRecord[]>();
  for (const p of pages) {
    if (!p.act) continue;
    const arr = byAct.get(p.act) ?? [];
    arr.push(p);
    byAct.set(p.act, arr);
  }

  const md: string[] = [
    '# 레거시 관리자 화면 커버리지',
    '',
    `- 대상: ${BASE_URL} · 레거시 소스: \`${LEGACY_SRC}\``,
    `- 집계 시각: ${new Date().toISOString()}`,
    `- module.xml 선언 disp*Admin* 액션: ${declared.length}`,
    `- 지도에 근거가 있는 액션: ${declared.filter((d) => byAct.has(d.act)).length}`,
    `- 근거 없음: ${declared.filter((d) => !byAct.has(d.act)).length}`,
    `- 지도의 페이지 파일: ${pages.length} (고유 act ${byAct.size})`,
    '',
    '## 그룹별 고유 act',
    '',
    '같은 act 가 파라미터만 달리해 여러 번 방문된 경우 한 줄로 합쳤다. 영역 SPEC 의 판정 단위는 이 표의 행이다.',
    '',
    '| 그룹 | 고유 act | 페이지 파일 |',
    '|---|---:|---:|',
  ];
  const groups = new Map<string, { acts: Set<string>; files: number }>();
  for (const p of pages) {
    const g = groups.get(p.group) ?? { acts: new Set<string>(), files: 0 };
    if (p.act) g.acts.add(p.act);
    g.files += 1;
    groups.set(p.group, g);
  }
  for (const [g, v] of groups) md.push(`| ${g} | ${v.acts.size} | ${v.files} |`);

  md.push('', '## 모듈별 선언 액션과 근거', '', '| 모듈 | act | 그룹 | 근거 파일 수 | 제목 |', '|---|---|---|---:|---|');
  for (const d of [...declared].sort((a, b) => `${a.module}.${a.act}`.localeCompare(`${b.module}.${b.act}`))) {
    const ps = byAct.get(d.act) ?? [];
    const groupsOf = [...new Set(ps.map((p) => p.group))].join(', ') || '**근거 없음**';
    md.push(`| ${d.module} | \`${d.act}\` | ${groupsOf} | ${ps.length} | ${ps[0]?.title ?? '-'} |`);
  }

  const supplements = pages.filter((p) => p.group === '보충(파라미터 화면)') as (PageRecord & {
    supplement?: { module: string; sampleParams: Record<string, string> | null; bodyExcerpt: string };
  })[];
  if (supplements.length > 0) {
    md.push('', '## 보충 방문 결과 (본문 앞부분)', '', '오류 문구가 보이면 표본 레코드가 없거나 화면이 폐기된 것이다 — 판정 때 사람이 확인한다.', '');
    for (const s of supplements) {
      md.push(
        `- \`${s.act}\` (${s.supplement?.module ?? '-'}, 파라미터 ${JSON.stringify(s.supplement?.sampleParams ?? null)}) — ${s.title || '-'}`,
        `  - ${(s.supplement?.bodyExcerpt ?? '').slice(0, 200) || '(본문 없음)'}`,
      );
    }
  }
  writeFileSync(path.join(OUT_DIR, 'coverage.md'), md.join('\n') + '\n', 'utf-8');
  console.log(`[보충] coverage.md 작성`);
}

main().catch((err) => {
  console.error('[보충 실패]', err);
  process.exit(1);
});
