/**
 * 사이트 설정 가져오기 Route Handler — SPEC-ADMIN-001 Slice H-2.
 *
 * POST /api/admin/import?dryRun=true|false
 * 관리자 세션 확인 후 ExportBundle 을 검증하고 DB 에 적용하거나 미리보기를 반환한다.
 *
 * @MX:NOTE: [AUTO] dryRun=true 이면 $transaction 없이 충돌 분석 결과만 반환.
 *           dryRun=false 이면 $transaction callback 으로 원자적 적용.
 *           충돌 분석(findMany)은 트랜잭션 외부에서 미리 수행한다.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-081
 */
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { prisma } from '@rhymix-ts/db';

// ---------------------------------------------------------------------------
// ExportBundle 스키마 (Slice H-1 의 번들 구조와 동일)
// ---------------------------------------------------------------------------

const ExportBundleSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  site: z
    .object({
      id: z.number(),
      defaultLanguage: z.string(),
      timeZone: z.string(),
    })
    .nullable()
    .optional(),
  domains: z.array(
    z.object({
      id: z.number(),
      hostname: z.string(),
      isDefault: z.boolean(),
      forceHttps: z.boolean(),
    }),
  ),
  menus: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      isAdminMenu: z.boolean(),
      items: z.array(
        z.object({
          id: z.number(),
          parentId: z.number().nullable(),
          title: z.string(),
          url: z.string(),
          listOrder: z.number(),
        }),
      ),
    }),
  ),
  moduleInstances: z.array(
    z.object({
      id: z.number(),
      mid: z.string(),
      moduleCode: z.string(),
      name: z.string(),
    }),
  ),
});

type ExportBundle = z.infer<typeof ExportBundleSchema>;

// ---------------------------------------------------------------------------
// 충돌 분석 헬퍼 (트랜잭션 외부에서 실행)
// ---------------------------------------------------------------------------

interface PreviewResult {
  domains: { create: number; update: number; skip: number };
  moduleInstances: { create: number; skip: number };
}

async function analyzeConflicts(bundle: ExportBundle): Promise<{
  preview: PreviewResult;
  existingHostnames: Set<string>;
  existingMids: Set<string>;
}> {
  const [existingDomains, existingModules] = await Promise.all([
    prisma.domain.findMany({ select: { hostname: true } }),
    prisma.moduleInstance.findMany({ select: { mid: true } }),
  ]);

  const existingHostnames = new Set(existingDomains.map((d: { hostname: string }) => d.hostname));
  const existingMids = new Set(existingModules.map((m: { mid: string }) => m.mid));

  const domainCreate = bundle.domains.filter((d) => !existingHostnames.has(d.hostname)).length;
  const domainUpdate = bundle.domains.filter((d) => existingHostnames.has(d.hostname)).length;

  const moduleCreate = bundle.moduleInstances.filter((m) => !existingMids.has(m.mid)).length;
  const moduleSkip = bundle.moduleInstances.filter((m) => existingMids.has(m.mid)).length;

  return {
    preview: {
      domains: { create: domainCreate, update: domainUpdate, skip: 0 },
      moduleInstances: { create: moduleCreate, skip: moduleSkip },
    },
    existingHostnames,
    existingMids,
  };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: Request): Promise<Response> {
  // 1. 세션 확인
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  // 2. 관리자 권한 확인
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
  });
  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // 3. dryRun 파라미터
  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dryRun') !== 'false';

  // 4. Body 파싱 및 스키마 검증
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const parsed = ExportBundleSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid bundle schema', details: parsed.error.flatten() }),
      { status: 400 },
    );
  }

  const bundle = parsed.data;

  // 5. 충돌 분석 (트랜잭션 외부에서 미리 수행)
  const { preview, existingHostnames, existingMids } = await analyzeConflicts(bundle);

  // 6. dryRun=true → 충돌 미리보기 반환
  if (dryRun) {
    return new Response(JSON.stringify({ dryRun: true, preview }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 7. Site 업데이트 (트랜잭션 외부 — 싱글턴이므로 독립 처리)
  const existingSite = await prisma.site.findFirst();
  if (bundle.site && existingSite) {
    await prisma.site.update({
      where: { id: existingSite.id },
      data: {
        defaultLanguage: bundle.site.defaultLanguage,
        timeZone: bundle.site.timeZone,
      },
    });
  }

  // 8. dryRun=false → $transaction callback 으로 Domain + ModuleInstance 원자적 적용
  await prisma.$transaction(async (tx) => {
    // Domain 적용 (hostname 기준 create/update)
    for (const domain of bundle.domains) {
      if (existingHostnames.has(domain.hostname)) {
        await tx.domain.update({
          where: { hostname: domain.hostname } as Parameters<typeof tx.domain.update>[0]['where'],
          data: { forceHttps: domain.forceHttps, isDefault: domain.isDefault },
        });
      } else {
        await tx.domain.create({
          data: {
            hostname: domain.hostname,
            isDefault: domain.isDefault,
            forceHttps: domain.forceHttps,
            siteId: existingSite?.id ?? 1,
          },
        });
      }
    }

    // ModuleInstance 적용 (mid 기준 skip)
    for (const mi of bundle.moduleInstances) {
      if (!existingMids.has(mi.mid)) {
        await tx.moduleInstance.create({
          data: {
            mid: mi.mid,
            moduleCode: mi.moduleCode,
            name: mi.name,
            siteId: existingSite?.id ?? 1,
          },
        });
      }
    }
  });

  return new Response(JSON.stringify({ dryRun: false, applied: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
