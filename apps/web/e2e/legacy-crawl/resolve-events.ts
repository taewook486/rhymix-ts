/**
 * 크롤로 수집한 이벤트 핸들러를 레거시 JS 소스와 대조해 서버 호출 대상을 밝힌다.
 *
 * 배경: 크롤러는 onclick 속성을 그대로 수집한다. 그런데 레거시 버튼은 대부분
 *       `doClearSession()` 처럼 **이름 붙은 함수**를 부르고, 실제 서버 호출
 *       (`exec_json('session.procSessionAdminClear', ...)`)은 외부 JS 파일 안에 있다.
 *       그래서 화면만 봐서는 버튼이 무엇을 하는지 알 수 없다.
 *
 * 방법: 레거시 소스가 로컬에 있으므로 함수 이름 → 정의 → 본문의 exec_json 대상을 추출한다.
 *       본문이 또 다른 함수를 부르면 정해진 깊이까지 따라간다.
 *
 * 브라우저를 쓰지 않는다 — 파일만 읽는다.
 *
 * 실행: pnpm dlx tsx e2e/legacy-crawl/resolve-events.ts
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const MAP_DIR = path.join(REPO_ROOT, '.moai/reports/legacy-admin-map');
const LEGACY_ROOT = process.env.LEGACY_SOURCE_ROOT ?? '/mnt/d/project/rhymix';
/** 함수가 다른 함수를 부를 때 몇 단계까지 따라갈지. */
const MAX_DEPTH = 3;

/** 자바스크립트 예약어·내장 — 함수 호출처럼 보이지만 찾을 필요가 없다. */
const IGNORE = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'function',
  'alert', 'confirm', 'parseInt', 'parseFloat', 'String', 'Number', 'Array',
  'jQuery', '$', 'setTimeout', 'setInterval', 'console', 'Math', 'Date',
]);

interface EventRecord {
  tag: string;
  text: string;
  kind: string;
  handler: string;
  targets: string[];
}
interface PageRecord {
  url: string;
  act: string | null;
  group: string;
  title: string;
  events: EventRecord[];
}

/** 레거시의 모든 .js 파일 경로를 모은다. */
function collectJsFiles(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.git' || name === 'tests') continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) collectJsFiles(full, acc);
    else if (name.endsWith('.js') && !name.endsWith('.min.js')) acc.push(full);
  }
  return acc;
}

/** 여는 중괄호 위치에서 시작해 짝이 맞는 닫는 중괄호까지의 본문을 잘라낸다. */
function extractBody(source: string, braceStart: number): string {
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const c = source[i];
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(braceStart, i + 1);
    }
  }
  return source.slice(braceStart);
}

/** 함수 이름 → { 본문, 정의 파일 } 색인을 만든다. */
function indexFunctions(files: string[]): Map<string, { body: string; file: string }> {
  const index = new Map<string, { body: string; file: string }>();
  const re = /function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g;

  for (const file of files) {
    let src: string;
    try {
      src = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const name = m[1]!;
      if (index.has(name)) continue; // 먼저 찾은 정의를 쓴다
      const braceStart = src.indexOf('{', m.index + m[0].length - 1);
      index.set(name, { body: extractBody(src, braceStart), file: path.relative(LEGACY_ROOT, file) });
    }
    re.lastIndex = 0;
  }
  return index;
}

/** 코드 조각에서 module.act 형태의 서버 호출 대상을 뽑는다. */
function findTargets(code: string): string[] {
  const found = new Set<string>();
  // 레거시 소스 실측 기준 호출 헬퍼 4종: exec_json(103) / exec_xml(67) /
  // Rhymix.ajax(10) / doCallModuleAction(2).
  const patterns: RegExp[] = [
    /exec_json\s*\(\s*['"]([^'"]+)['"]/g,
    /exec_xml\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g,
    /Rhymix\.ajax\s*\(\s*['"]([^'"]+)['"]/g,
    /doCallModuleAction\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g,
    /['"]act['"]\s*[:=]\s*['"](proc[A-Za-z]+)['"]/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      found.add(m[2] ? `${m[1]}.${m[2]}` : m[1]!);
    }
  }
  return [...found];
}

/** 코드 조각이 부르는 사용자 정의 함수 이름을 뽑는다. */
function findCalls(code: string): string[] {
  const found = new Set<string>();
  const re = /([A-Za-z_$][\w$]*)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const name = m[1]!;
    if (!IGNORE.has(name)) found.add(name);
  }
  return [...found];
}

interface Resolution {
  targets: string[];
  definedIn: string | null;
  submitsForm: boolean;
  via: string[];
}

function resolve(
  name: string,
  index: Map<string, { body: string; file: string }>,
  depth = 0,
  seen = new Set<string>(),
): Resolution {
  if (depth > MAX_DEPTH || seen.has(name)) {
    return { targets: [], definedIn: null, submitsForm: false, via: [] };
  }
  seen.add(name);

  const def = index.get(name);
  if (!def) return { targets: [], definedIn: null, submitsForm: false, via: [] };

  const targets = new Set(findTargets(def.body));
  const submitsForm = /\.submit\s*\(/.test(def.body);
  const via: string[] = [];

  if (targets.size === 0) {
    for (const callee of findCalls(def.body)) {
      if (callee === name) continue;
      const sub = resolve(callee, index, depth + 1, seen);
      if (sub.targets.length > 0) {
        via.push(callee);
        for (const t of sub.targets) targets.add(t);
      }
    }
  }

  return { targets: [...targets], definedIn: def.file, submitsForm, via };
}

function main(): void {
  // 1) 크롤 결과에서 핸들러가 부르는 함수 이름을 모은다.
  const pagesDir = path.join(MAP_DIR, 'pages');
  const pageFiles = readdirSync(pagesDir).filter((f) => f.endsWith('.json'));
  const usage = new Map<string, { count: number; screens: Set<string>; labels: Set<string> }>();

  for (const f of pageFiles) {
    const page = JSON.parse(readFileSync(path.join(pagesDir, f), 'utf-8')) as PageRecord;
    for (const ev of page.events) {
      if (!ev.handler || ev.handler === '(inline script aggregate)') continue;
      for (const name of findCalls(ev.handler)) {
        const rec = usage.get(name) ?? { count: 0, screens: new Set(), labels: new Set() };
        rec.count += 1;
        rec.screens.add(`${page.group}/${page.act ?? '-'}`);
        if (ev.text) rec.labels.add(ev.text.slice(0, 40));
        usage.set(name, rec);
      }
    }
  }
  console.log(`[해석] 화면 ${pageFiles.length}개에서 핸들러 함수 ${usage.size}종 발견`);

  // 2) 레거시 JS 를 색인한다.
  const jsFiles = collectJsFiles(LEGACY_ROOT);
  const index = indexFunctions(jsFiles);
  console.log(`[해석] JS 파일 ${jsFiles.length}개에서 함수 정의 ${index.size}개 색인`);

  // 3) 이름별로 서버 호출 대상을 푼다.
  const rows = [...usage.entries()]
    .map(([name, use]) => ({ name, use, res: resolve(name, index) }))
    .sort((a, b) => b.use.count - a.use.count);

  const resolved = rows.filter((r) => r.res.targets.length > 0);
  const formOnly = rows.filter((r) => r.res.targets.length === 0 && r.res.submitsForm);
  const unknown = rows.filter((r) => r.res.targets.length === 0 && !r.res.submitsForm);

  console.log(
    `[해석] 서버 대상 확인 ${resolved.length}종 / 폼 제출 ${formOnly.length}종 / 미해결 ${unknown.length}종`,
  );

  // 4) 산출물
  writeFileSync(
    path.join(MAP_DIR, 'events.json'),
    JSON.stringify(
      rows.map((r) => ({
        handler: r.name,
        uses: r.use.count,
        screens: [...r.use.screens],
        labels: [...r.use.labels],
        targets: r.res.targets,
        definedIn: r.res.definedIn,
        submitsForm: r.res.submitsForm,
        resolvedVia: r.res.via,
      })),
      null,
      2,
    ),
    'utf-8',
  );

  const md: string[] = [
    '# 레거시 관리자 이벤트 → 서버 호출 대응표',
    '',
    `- 핸들러 함수: ${usage.size}종 (화면 ${pageFiles.length}개에서 수집)`,
    `- 서버 대상 확인: ${resolved.length}종 / 폼 제출: ${formOnly.length}종 / 미해결: ${unknown.length}종`,
    `- 레거시 소스: ${LEGACY_ROOT} (JS ${jsFiles.length}개, 함수 ${index.size}개 색인)`,
    '',
    '## 서버 호출이 확인된 핸들러',
    '',
    '| 핸들러 | 사용 | 서버 대상 | 정의 위치 |',
    '|---|---:|---|---|',
    ...resolved.map(
      (r) =>
        `| \`${r.name}\` | ${r.use.count} | ${r.res.targets.map((t) => `\`${t}\``).join(', ')} | ` +
        `${r.res.definedIn ?? '-'}${r.res.via.length ? ` (경유: ${r.res.via.join('→')})` : ''} |`,
    ),
    '',
    '## 폼 제출로 동작하는 핸들러 (대상은 폼의 act)',
    '',
    '| 핸들러 | 사용 | 정의 위치 |',
    '|---|---:|---|',
    ...formOnly.map((r) => `| \`${r.name}\` | ${r.use.count} | ${r.res.definedIn ?? '-'} |`),
    '',
    '## 미해결 — 정의를 찾지 못했거나 서버 호출이 없는 핸들러',
    '',
    '| 핸들러 | 사용 | 정의 위치 |',
    '|---|---:|---|',
    ...unknown
      .slice(0, 120)
      .map((r) => `| \`${r.name}\` | ${r.use.count} | ${r.res.definedIn ?? '(정의 못 찾음)'} |`),
    '',
  ];
  writeFileSync(path.join(MAP_DIR, 'events.md'), md.join('\n'), 'utf-8');
  console.log(`[완료] ${path.join(MAP_DIR, 'events.md')}`);
}

main();
