/**
 * Client IP extraction tests (REQ-INSTALL-024) — RED-first.
 *
 * 우선순위: x-forwarded-for 첫 번째 IP > x-real-ip > 'unknown'.
 */
import { describe, expect, it } from 'vitest';

import { extractClientIp } from './extract-ip';

describe('extractClientIp', () => {
  it('the system shall return the first IP from x-forwarded-for when present', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1, 10.0.0.2' });
    expect(extractClientIp(headers)).toBe('203.0.113.7');
  });

  it('the system shall trim whitespace around comma-separated x-forwarded-for entries', () => {
    const headers = new Headers({ 'x-forwarded-for': '  198.51.100.5  ,  10.0.0.1  ' });
    expect(extractClientIp(headers)).toBe('198.51.100.5');
  });

  it('the system shall fall back to x-real-ip when x-forwarded-for is absent', () => {
    const headers = new Headers({ 'x-real-ip': '192.0.2.50' });
    expect(extractClientIp(headers)).toBe('192.0.2.50');
  });

  it('the system shall return unknown when neither header is present', () => {
    const headers = new Headers();
    expect(extractClientIp(headers)).toBe('unknown');
  });

  it('the system shall prefer x-forwarded-for even when x-real-ip is also set', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.7',
      'x-real-ip': '192.0.2.50',
    });
    expect(extractClientIp(headers)).toBe('203.0.113.7');
  });

  it('the system shall return unknown when x-forwarded-for is empty string', () => {
    const headers = new Headers({ 'x-forwarded-for': '' });
    expect(extractClientIp(headers)).toBe('unknown');
  });

  it('the system shall return unknown when x-forwarded-for contains only whitespace and commas', () => {
    const headers = new Headers({ 'x-forwarded-for': '  ,  ,  ' });
    expect(extractClientIp(headers)).toBe('unknown');
  });
});
