/**
 * Security 헤더 상수 테스트 (REQ-INSTALL-040).
 */
import { describe, expect, it } from 'vitest';

import { HSTS_HEADER_VALUE } from './headers';

describe('HSTS_HEADER_VALUE', () => {
  it('the system shall expose a one-year max-age with includeSubDomains and preload', () => {
    expect(HSTS_HEADER_VALUE).toBe('max-age=31536000; includeSubDomains; preload');
  });
});
