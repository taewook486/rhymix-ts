/**
 * Specification tests for install wizard Zod schemas.
 * Covers REQ-INSTALL-052 (NEXTAUTH_SECRET length) and supporting forms.
 */
import { describe, it, expect } from 'vitest';
import {
  dbConfigSchema,
  adminConfigSchema,
  licenseAgreementSchema,
  installSessionSchema,
  envCheckResultSchema,
  NEXTAUTH_SECRET_MIN_LENGTH,
} from './schemas';

describe('dbConfigSchema', () => {
  const valid = {
    host: 'localhost',
    port: 5432,
    user: 'rhymix',
    pass: 's3cret',
    database: 'rhymix',
    schema: 'public',
  };

  it('accepts a fully populated config', () => {
    expect(dbConfigSchema.parse(valid)).toMatchObject(valid);
  });

  it('coerces port from string', () => {
    const parsed = dbConfigSchema.parse({ ...valid, port: '6543' });
    expect(parsed.port).toBe(6543);
  });

  it('rejects out-of-range port', () => {
    expect(() => dbConfigSchema.parse({ ...valid, port: 70000 })).toThrow();
    expect(() => dbConfigSchema.parse({ ...valid, port: 0 })).toThrow();
  });

  it('defaults schema to public', () => {
    const { schema, ...rest } = valid;
    void schema;
    const parsed = dbConfigSchema.parse(rest);
    expect(parsed.schema).toBe('public');
  });

  it('rejects missing host / database', () => {
    expect(() => dbConfigSchema.parse({ ...valid, host: '' })).toThrow();
    expect(() => dbConfigSchema.parse({ ...valid, database: '' })).toThrow();
  });
});

describe('adminConfigSchema', () => {
  const valid = {
    email: 'admin@example.com',
    password: 'StrongPass123',
    password2: 'StrongPass123',
    nickName: 'admin',
    userId: 'admin_user',
    timeZone: 'UTC',
    useSsl: 'always' as const,
    useSitelock: false,
  };

  it('accepts a valid admin payload', () => {
    expect(adminConfigSchema.parse(valid)).toMatchObject(valid);
  });

  it('rejects mismatched passwords', () => {
    expect(() =>
      adminConfigSchema.parse({ ...valid, password2: 'Different123' }),
    ).toThrow(/match/i);
  });

  it('rejects invalid email', () => {
    expect(() => adminConfigSchema.parse({ ...valid, email: 'not-an-email' })).toThrow();
  });

  it('rejects userId with disallowed characters', () => {
    expect(() => adminConfigSchema.parse({ ...valid, userId: 'admin user!' })).toThrow();
  });

  it('rejects too-short password', () => {
    expect(() =>
      adminConfigSchema.parse({ ...valid, password: 'short', password2: 'short' }),
    ).toThrow();
  });
});

describe('licenseAgreementSchema', () => {
  it('requires acceptance to be true', () => {
    expect(licenseAgreementSchema.parse({ accepted: true })).toEqual({ accepted: true });
    expect(() => licenseAgreementSchema.parse({ accepted: false })).toThrow();
  });

  it('rejects missing acceptance', () => {
    expect(() => licenseAgreementSchema.parse({})).toThrow();
  });
});

describe('installSessionSchema', () => {
  const valid = {
    language: 'en',
    step: 'license' as const,
    licenseAccepted: false,
  };

  it('accepts a minimal session', () => {
    expect(installSessionSchema.parse(valid)).toMatchObject(valid);
  });

  it('rejects unsupported language', () => {
    expect(() => installSessionSchema.parse({ ...valid, language: 'xx' })).toThrow();
  });

  it('rejects unknown step', () => {
    expect(() => installSessionSchema.parse({ ...valid, step: 'unknown' })).toThrow();
  });

  it('accepts every defined step', () => {
    for (const step of ['language', 'license', 'env-check', 'db', 'admin', 'finish'] as const) {
      expect(installSessionSchema.parse({ ...valid, step })).toMatchObject({ step });
    }
  });
});

describe('envCheckResultSchema', () => {
  const valid = {
    nodeVersionOk: true,
    writableConfigDir: true,
    nextAuthSecretLength: 64,
    databaseReachable: true,
  };

  it('accepts a healthy environment report', () => {
    expect(envCheckResultSchema.parse(valid)).toMatchObject(valid);
  });

  it(`rejects nextAuthSecretLength below ${NEXTAUTH_SECRET_MIN_LENGTH} (REQ-INSTALL-052)`, () => {
    expect(() =>
      envCheckResultSchema.parse({ ...valid, nextAuthSecretLength: NEXTAUTH_SECRET_MIN_LENGTH - 1 }),
    ).toThrow();
  });

  it(`accepts nextAuthSecretLength exactly at the ${NEXTAUTH_SECRET_MIN_LENGTH}-char threshold`, () => {
    expect(
      envCheckResultSchema.parse({ ...valid, nextAuthSecretLength: NEXTAUTH_SECRET_MIN_LENGTH }),
    ).toMatchObject({ nextAuthSecretLength: NEXTAUTH_SECRET_MIN_LENGTH });
  });

  it('exposes the documented constant', () => {
    expect(NEXTAUTH_SECRET_MIN_LENGTH).toBe(32);
  });

  it('rejects non-boolean health flags', () => {
    expect(() =>
      envCheckResultSchema.parse({ ...valid, nodeVersionOk: 'yes' as unknown as boolean }),
    ).toThrow();
  });
});
