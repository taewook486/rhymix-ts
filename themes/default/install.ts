// SPEC-LAYOUT-001 Slice C — default 테마 DB 시드 스크립트
// REQ-LAYOUT-035, REQ-LAYOUT-036: Theme + Layout 행 upsert, 기존 assignment 삭제 금지

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient, Prisma } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * theme.json 파일 경로 (스크립트 기준 상대 경로).
 */
const THEME_JSON_PATH = path.resolve(__dirname, 'theme.json');

/**
 * default 테마를 DB에 upsert한다.
 *
 * - Theme(name="default"): 이미 존재하면 manifest 필드만 업데이트 (REQ-LAYOUT-036)
 * - Layout(name="default", layoutType=DESKTOP): upsert
 * - ThemeAssignment 행은 삭제하지 않음 (REQ-LAYOUT-036)
 *
 * REQ-LAYOUT-035, REQ-LAYOUT-036
 */
// @MX:ANCHOR: [AUTO] seedDefaultTheme — default 테마 시드 진입점
// @MX:REASON: install.ts CLI 진입점, 테스트 픽스처, CI seed에서 호출됨 (fan_in >= 3 예상)
export async function seedDefaultTheme(prisma: PrismaClient): Promise<void> {
  // theme.json 로드 — import assertions 대신 fs.readFileSync 사용 (호환성)
  const manifest = JSON.parse(readFileSync(THEME_JSON_PATH, 'utf-8')) as Record<string, unknown>;

  // Theme upsert — 이미 존재하면 manifest + tokensSchema 업데이트
  // REQ-LAYOUT-036: 기존 ThemeAssignment 삭제 금지
  const theme = await prisma.theme.upsert({
    where: { name: 'default' },
    create: {
      name: 'default',
      displayName: 'Default Theme',
      version: '1.0.0',
      manifest: manifest as Prisma.InputJsonValue,
      tokensSchema: (manifest['tokensSchema'] ?? {}) as Prisma.InputJsonValue,
      status: 'INSTALLED',
    },
    update: {
      manifest: manifest as Prisma.InputJsonValue,
      tokensSchema: (manifest['tokensSchema'] ?? {}) as Prisma.InputJsonValue,
      displayName: 'Default Theme',
      version: '1.0.0',
    },
  });

  console.log(`[seed] Theme upsert 완료: id=${theme.id}, name=${theme.name}`);

  // Layout upsert — themeId + name + layoutType 복합 유니크 키 사용
  const layout = await prisma.layout.upsert({
    where: {
      themeId_name_layoutType: {
        themeId: theme.id,
        name: 'default',
        layoutType: 'DESKTOP',
      },
    },
    create: {
      themeId: theme.id,
      name: 'default',
      title: 'Default Layout',
      layoutPath: 'themes/default/layouts/default',
      layoutType: 'DESKTOP',
      siteSrl: null,
      extraVars: Prisma.DbNull,
    },
    update: {
      title: 'Default Layout',
      layoutPath: 'themes/default/layouts/default',
    },
  });

  console.log(`[seed] Layout upsert 완료: id=${layout.id}, name=${layout.name}`);
}

/**
 * CLI 진입점 — 직접 실행 시 DB 연결 후 seedDefaultTheme 호출.
 * tsx themes/default/install.ts
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await seedDefaultTheme(prisma);
    console.log('[seed] default 테마 시드 완료.');
  } finally {
    await prisma.$disconnect();
  }
}

// 이 파일은 @rhymix-ts/theme-default 패키지의 유일한 export이므로
// `import { seedDefaultTheme } from '@rhymix-ts/theme-default'` 형태로도 로드된다.
// 아래는 `pnpm seed:default-theme`(tsx themes/default/install.ts) CLI 실행 시에만
// 동작해야 하며, 단순 import 시점에 실제 DB 연결을 시도해서는 안 된다.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error('[seed] 시드 실패:', err);
    process.exit(1);
  });
}
