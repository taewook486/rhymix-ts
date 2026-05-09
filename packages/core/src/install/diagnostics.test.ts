/**
 * Environment diagnostics tests (REQ-INSTALL-012).
 * RED-first specification suite — see diagnostics.ts for implementation.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  type DiagnosticsIO,
  runEnvDiagnostics,
  PER_CHECK_TIMEOUT_MS,
} from './diagnostics';

/** Helper: build an IO double with sensible defaults; tests override fields. */
function buildIO(overrides: Partial<DiagnosticsIO> = {}): DiagnosticsIO {
  const base: DiagnosticsIO = {
    nodeVersion: 'v22.11.0',
    env: {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/rhymix',
      NEXTAUTH_SECRET: 'a'.repeat(64),
      NEXTAUTH_URL: 'https://example.com',
      SMTP_HOST: undefined,
    },
    canWrite: vi.fn().mockResolvedValue(true),
    canResolvePrismaClient: vi.fn().mockResolvedValue(true),
    tcpProbe: vi.fn().mockResolvedValue(true),
    rewriteHeadProbe: vi.fn().mockImplementation(async (nonce: string) => nonce),
  };
  return { ...base, ...overrides };
}

describe('runEnvDiagnostics', () => {
  it('the system shall return overall=ok when every required check passes (mail soft-fail allowed)', async () => {
    // With SMTP_HOST set + reachable, no warn is produced → overall=ok.
    const io = buildIO({
      env: {
        DATABASE_URL: 'postgresql://u:p@h:5432/d',
        NEXTAUTH_SECRET: 'a'.repeat(64),
        NEXTAUTH_URL: 'https://example.com',
        SMTP_HOST: 'smtp.example.com',
      },
      tcpProbe: vi.fn().mockResolvedValue(true),
    });
    const report = await runEnvDiagnostics(io);
    expect(report.overall).toBe('ok');
    // 9 checks (runtime, 3 env vars, 2 fs, db, mail, middleware)
    expect(report.results).toHaveLength(9);
    for (const r of report.results) {
      expect(r.status).toBe('ok');
    }
    expect(report.generatedAt).toBeInstanceOf(Date);
  });

  it('the system shall mark runtime.node as error when Node version < 22', async () => {
    const report = await runEnvDiagnostics(buildIO({ nodeVersion: 'v20.18.0' }));
    const node = report.results.find((r) => r.key === 'runtime.node');
    expect(node?.status).toBe('error');
    expect(report.overall).toBe('error');
  });

  it('the system shall mark env.NEXTAUTH_SECRET as error when shorter than 32 chars', async () => {
    const io = buildIO({
      env: {
        DATABASE_URL: 'postgresql://u:p@h:5432/d',
        NEXTAUTH_SECRET: 'too-short',
        NEXTAUTH_URL: 'https://example.com',
      },
    });
    const report = await runEnvDiagnostics(io);
    const secret = report.results.find((r) => r.key === 'env.NEXTAUTH_SECRET');
    expect(secret?.status).toBe('error');
    expect(report.overall).toBe('error');
  });

  it('the system shall mark env.DATABASE_URL as error when missing or invalid', async () => {
    const io = buildIO({
      env: {
        DATABASE_URL: '',
        NEXTAUTH_SECRET: 'a'.repeat(64),
        NEXTAUTH_URL: 'https://example.com',
      },
    });
    const report = await runEnvDiagnostics(io);
    const db = report.results.find((r) => r.key === 'env.DATABASE_URL');
    expect(db?.status).toBe('error');
  });

  it('the system shall mark env.NEXTAUTH_URL as error when not a valid URL', async () => {
    const io = buildIO({
      env: {
        DATABASE_URL: 'postgresql://u:p@h:5432/d',
        NEXTAUTH_SECRET: 'a'.repeat(64),
        NEXTAUTH_URL: 'not a url',
      },
    });
    const report = await runEnvDiagnostics(io);
    const url = report.results.find((r) => r.key === 'env.NEXTAUTH_URL');
    expect(url?.status).toBe('error');
  });

  it('the system shall mark fs.uploads as error when not writable', async () => {
    const canWrite = vi.fn().mockImplementation(async (p: string) => !p.includes('uploads'));
    const report = await runEnvDiagnostics(buildIO({ canWrite }));
    const fs = report.results.find((r) => r.key === 'fs.uploads');
    expect(fs?.status).toBe('error');
  });

  it('the system shall mark fs.next-cache as error when not writable', async () => {
    const canWrite = vi.fn().mockImplementation(async (p: string) => !p.includes('.next'));
    const report = await runEnvDiagnostics(buildIO({ canWrite }));
    const fs = report.results.find((r) => r.key === 'fs.next-cache');
    expect(fs?.status).toBe('error');
  });

  it('the system shall mark database.client as error when @prisma/client cannot be resolved', async () => {
    const report = await runEnvDiagnostics(
      buildIO({ canResolvePrismaClient: vi.fn().mockResolvedValue(false) }),
    );
    const db = report.results.find((r) => r.key === 'database.client');
    expect(db?.status).toBe('error');
  });

  it('the system shall warn (soft-fail) on mail.transport when SMTP_HOST is not set', async () => {
    const report = await runEnvDiagnostics(buildIO());
    const mail = report.results.find((r) => r.key === 'mail.transport');
    expect(mail?.status).toBe('warn');
    // overall escalates to warn when any check is warn (no errors)
    expect(report.overall).toBe('warn');
  });

  it('the system shall probe SMTP_HOST when present and mark warn on connect failure', async () => {
    const io = buildIO({
      env: {
        DATABASE_URL: 'postgresql://u:p@h:5432/d',
        NEXTAUTH_SECRET: 'a'.repeat(64),
        NEXTAUTH_URL: 'https://example.com',
        SMTP_HOST: 'smtp.example.com',
      },
      tcpProbe: vi.fn().mockResolvedValue(false),
    });
    const report = await runEnvDiagnostics(io);
    const mail = report.results.find((r) => r.key === 'mail.transport');
    expect(mail?.status).toBe('warn');
  });

  it('the system shall mark middleware.rewrite as error when nonce echo mismatches', async () => {
    const io = buildIO({
      rewriteHeadProbe: vi.fn().mockResolvedValue('different-nonce'),
    });
    const report = await runEnvDiagnostics(io);
    const mw = report.results.find((r) => r.key === 'middleware.rewrite');
    expect(mw?.status).toBe('error');
  });

  it('the system shall treat per-check timeouts as error and continue with siblings', async () => {
    const io = buildIO({
      canWrite: vi.fn().mockImplementation(
        () => new Promise(() => {}), // never resolves
      ),
    });
    const start = Date.now();
    const report = await runEnvDiagnostics(io);
    const elapsed = Date.now() - start;
    // Must not block past one timeout window
    expect(elapsed).toBeLessThan(PER_CHECK_TIMEOUT_MS + 500);
    const fs = report.results.find((r) => r.key === 'fs.uploads');
    expect(fs?.status).toBe('error');
    // Other checks still produced results
    const node = report.results.find((r) => r.key === 'runtime.node');
    expect(node).toBeDefined();
  });

  it('the system shall run checks in parallel (overall < 2x of single timeout)', async () => {
    const slow = (ms: number) =>
      new Promise<boolean>((resolve) => setTimeout(() => resolve(true), ms));
    const io = buildIO({
      canWrite: vi.fn().mockImplementation(() => slow(300)),
      canResolvePrismaClient: vi.fn().mockImplementation(() => slow(300)),
      tcpProbe: vi.fn().mockImplementation(() => slow(300)),
      rewriteHeadProbe: vi.fn().mockImplementation(
        async (n: string) => {
          await slow(300);
          return n;
        },
      ),
    });
    const start = Date.now();
    await runEnvDiagnostics(io);
    const elapsed = Date.now() - start;
    // All four 300ms ops in parallel — must finish well under serial 1200ms.
    expect(elapsed).toBeLessThan(900);
  });
});
