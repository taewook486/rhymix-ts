/**
 * Specification tests for wizard step guards.
 * Covers REQ-INSTALL-021 (license gate), REQ-INSTALL-022 (db gate).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  },
}));

import { redirect } from 'next/navigation';
const redirectMock = redirect as unknown as ReturnType<typeof vi.fn>;

import type { WizardSession } from './wizard-session';
import { requireWizardStep } from './wizard-guards';

function makeSession(overrides: Partial<WizardSession> = {}): WizardSession {
  return {
    language: 'en',
    step: 'license',
    licenseAccepted: false,
    envChecksPass: false,
    dbConfigValidated: false,
    ...overrides,
  } as WizardSession;
}

describe('requireWizardStep', () => {
  beforeEach(() => {
    void redirectMock;
  });

  it('the system shall always allow the license step', () => {
    expect(() => requireWizardStep('license', makeSession())).not.toThrow();
  });

  it('the system shall redirect to /install when license has not been accepted before env-check', () => {
    expect(() => requireWizardStep('env-check', makeSession({ licenseAccepted: false }))).toThrow(
      /__REDIRECT__:\/install$/,
    );
  });

  it('the system shall allow env-check when license is accepted', () => {
    expect(() =>
      requireWizardStep('env-check', makeSession({ licenseAccepted: true })),
    ).not.toThrow();
  });

  it('the system shall redirect to /install/check-env when env diagnostics did not pass before db step', () => {
    expect(() =>
      requireWizardStep('db', makeSession({ licenseAccepted: true, envChecksPass: false })),
    ).toThrow(/__REDIRECT__:\/install\/check-env$/);
  });

  it('the system shall allow db step when license accepted and env checks pass', () => {
    expect(() =>
      requireWizardStep(
        'db',
        makeSession({ licenseAccepted: true, envChecksPass: true }),
      ),
    ).not.toThrow();
  });

  it('the system shall redirect to /install/db-config when db has not been validated before admin step', () => {
    expect(() =>
      requireWizardStep(
        'admin',
        makeSession({
          licenseAccepted: true,
          envChecksPass: true,
          dbConfigValidated: false,
        }),
      ),
    ).toThrow(/__REDIRECT__:\/install\/db-config$/);
  });

  it('the system shall allow admin step when all prior gates have passed', () => {
    expect(() =>
      requireWizardStep(
        'admin',
        makeSession({
          licenseAccepted: true,
          envChecksPass: true,
          dbConfigValidated: true,
        }),
      ),
    ).not.toThrow();
  });

  it('the system shall redirect cascadingly when license is missing for db or admin step', () => {
    expect(() => requireWizardStep('db', makeSession())).toThrow(/__REDIRECT__:\/install$/);
    expect(() => requireWizardStep('admin', makeSession())).toThrow(/__REDIRECT__:\/install$/);
  });
});
