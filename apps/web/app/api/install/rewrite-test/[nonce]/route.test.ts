/**
 * Rewrite-test echo route (supports REQ-INSTALL-012) — RED-first.
 */
import { describe, expect, it } from 'vitest';

import { GET, HEAD } from './route';

describe('rewrite-test route', () => {
  it('the system shall echo the nonce in the x-install-rewrite-nonce header on GET', async () => {
    const params = Promise.resolve({ nonce: 'abc123' });
    const res = await GET(new Request('http://localhost/api/install/rewrite-test/abc123'), {
      params,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-install-rewrite-nonce')).toBe('abc123');
  });

  it('the system shall echo the nonce on HEAD as well', async () => {
    const params = Promise.resolve({ nonce: 'xyz789' });
    const res = await HEAD(new Request('http://localhost/api/install/rewrite-test/xyz789'), {
      params,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-install-rewrite-nonce')).toBe('xyz789');
  });

  it('the system shall return an empty body to avoid leaking implementation detail', async () => {
    const params = Promise.resolve({ nonce: 'n' });
    const res = await GET(new Request('http://localhost/x'), { params });
    const text = await res.text();
    expect(text).toBe('');
  });
});
