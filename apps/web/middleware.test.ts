/**
 * Middleware install-gate tests (REQ-INSTALL-001, 020, 023) — RED-first.
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getInstallStatus = vi.fn();

vi.mock('@/lib/install/site-status', () => ({
  getInstallStatus: (...args: unknown[]) => getInstallStatus(...args),
}));

beforeEach(() => {
  getInstallStatus.mockReset();
  delete process.env.INSTALL_LOCK;
  vi.resetModules();
});

afterEach(() => {
  delete process.env.INSTALL_LOCK;
});

function makeReq(path: string): NextRequest {
  return new NextRequest(new URL(`http://example.com${path}`));
}

async function loadMiddleware() {
  return await import('./middleware');
}

describe('middleware', () => {
  it('the system shall return HTTP 410 on /install when INSTALL_LOCK=1', async () => {
    process.env.INSTALL_LOCK = '1';
    getInstallStatus.mockResolvedValue({ installed: true, site: null });
    const { middleware } = await loadMiddleware();
    const res = await middleware(makeReq('/install'));
    expect(res.status).toBe(410);
  });

  it('the system shall allow /api/install/rewrite-test/* even when INSTALL_LOCK=1', async () => {
    process.env.INSTALL_LOCK = '1';
    getInstallStatus.mockResolvedValue({ installed: true, site: null });
    const { middleware } = await loadMiddleware();
    const res = await middleware(makeReq('/api/install/rewrite-test/abc'));
    // NextResponse.next() returns 200 by default with x-middleware-next header.
    expect(res.status).toBe(200);
  });

  it('the system shall redirect to /install when not installed and request is outside install scope', async () => {
    getInstallStatus.mockResolvedValue({ installed: false, site: null });
    const { middleware } = await loadMiddleware();
    const res = await middleware(makeReq('/admin'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/install');
  });

  it('the system shall pass through /install routes when not installed', async () => {
    getInstallStatus.mockResolvedValue({ installed: false, site: null });
    const { middleware } = await loadMiddleware();
    const res = await middleware(makeReq('/install/check-env'));
    expect(res.status).toBe(200);
  });

  it('the system shall pass through /api/install/* routes when not installed', async () => {
    getInstallStatus.mockResolvedValue({ installed: false, site: null });
    const { middleware } = await loadMiddleware();
    const res = await middleware(makeReq('/api/install/license'));
    expect(res.status).toBe(200);
  });

  it('the system shall pass through ordinary routes when already installed', async () => {
    getInstallStatus.mockResolvedValue({
      installed: true,
      site: { id: 1, installedAt: new Date() },
    });
    const { middleware } = await loadMiddleware();
    const res = await middleware(makeReq('/admin/dashboard'));
    expect(res.status).toBe(200);
  });
});
