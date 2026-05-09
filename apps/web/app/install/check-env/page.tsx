/**
 * SPEC-INSTALL-001 / Step 2: 환경 자가진단 페이지.
 *
 * 서버 컴포넌트로 동작하며, 렌더 시점에 `runEnvDiagnostics`를 실제 IO에
 * 바인딩하여 호출합니다. REQ-INSTALL-010, REQ-INSTALL-012.
 */
import { access, constants, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { connect } from 'node:net';

import Link from 'next/link';

import { type DiagnosticsIO, runEnvDiagnostics } from '@rhymix-ts/core';

import { DiagnosticsTable } from './diagnostics-table';

export const dynamic = 'force-dynamic';

async function canWritePath(rel: string): Promise<boolean> {
  const abs = path.resolve(process.cwd(), rel);
  try {
    await mkdir(abs, { recursive: true });
    await access(abs, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function canResolvePrismaClient(): Promise<boolean> {
  // Turbopack의 monorepo isolated linker에서 `@prisma/client` 직접 import는
  // 정적 분석 단계에서 실패합니다. 워크스페이스 패키지 `@rhymix-ts/db`가
  // 이미 PrismaClient 싱글턴을 노출하므로 이를 통해 가용성을 검증합니다.
  try {
    const { prisma } = await import('@rhymix-ts/db');
    return Boolean(prisma);
  } catch {
    return false;
  }
}

function tcpProbe(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port, timeout: 1000 });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function rewriteHeadProbe(nonce: string): Promise<string> {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/install/rewrite-test/${nonce}`, {
      method: 'HEAD',
      cache: 'no-store',
    });
    return res.headers.get('x-install-rewrite-nonce') ?? '';
  } catch {
    return '';
  }
}

function buildIO(): DiagnosticsIO {
  return {
    nodeVersion: `v${process.versions.node}`,
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      SMTP_HOST: process.env.SMTP_HOST,
    },
    canWrite: canWritePath,
    canResolvePrismaClient,
    tcpProbe,
    rewriteHeadProbe,
  };
}

export default async function CheckEnvPage() {
  const report = await runEnvDiagnostics(buildIO());
  const hasError = report.overall === 'error';

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold">설치 2단계 — 환경 자가진단</h1>
      <p className="mt-2 text-sm text-[rgb(var(--color-muted))]">
        서버 환경이 Rhymix-TS 실행에 적합한지 확인합니다.
      </p>

      <section className="mt-8 rounded-md border bg-white/5 p-4">
        <DiagnosticsTable report={report} />
      </section>

      <div className="mt-8 flex items-center justify-between">
        <Link
          href="/install"
          className="rounded-md border px-4 py-2 text-sm hover:bg-black/5"
        >
          이전
        </Link>
        <div className="flex gap-2">
          <Link
            href="/install/check-env"
            className="rounded-md border px-4 py-2 text-sm hover:bg-black/5"
          >
            다시 진단
          </Link>
          {hasError ? (
            <button
              type="button"
              className="rounded-md bg-gray-300 px-4 py-2 text-sm text-gray-600"
              disabled
              aria-disabled="true"
            >
              다음
            </button>
          ) : (
            <Link
              href="/install/db-config"
              className="rounded-md bg-[rgb(var(--color-primary))] px-4 py-2 text-sm text-white hover:opacity-90"
            >
              다음
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
