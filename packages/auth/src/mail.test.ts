/**
 * Specification tests for the MailDispatcher abstraction.
 * SPEC-AUTH-001 Slice B — 이메일 발송 인터페이스 (실제 SMTP/Resend는 SPEC-INFRA-001).
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  InMemoryMailDispatcher,
  type MailMessage,
  NoopMailDispatcher,
} from './mail';

const sample: MailMessage = {
  to: 'alice@example.com',
  subject: '환영합니다',
  template: 'signup-verify',
  vars: { verifyUrl: 'https://example.com/v/abc', userName: 'alice' },
};

describe('InMemoryMailDispatcher', () => {
  let dispatcher: InMemoryMailDispatcher;

  beforeEach(() => {
    dispatcher = new InMemoryMailDispatcher();
  });

  it('records dispatched messages in the order they were sent', async () => {
    await dispatcher.dispatch(sample);
    await dispatcher.dispatch({ ...sample, to: 'bob@example.com' });
    expect(dispatcher.sent).toHaveLength(2);
    expect(dispatcher.sent[0]?.to).toBe('alice@example.com');
    expect(dispatcher.sent[1]?.to).toBe('bob@example.com');
  });

  it('reset() clears the recorded messages list', async () => {
    await dispatcher.dispatch(sample);
    expect(dispatcher.sent).toHaveLength(1);
    dispatcher.reset();
    expect(dispatcher.sent).toHaveLength(0);
  });

  it('does not mutate the input message after dispatch', async () => {
    const message: MailMessage = {
      to: 'a@b.com',
      subject: 's',
      template: 'signup-verify',
      vars: { verifyUrl: 'u', userName: 'n' },
    };
    const snapshot = JSON.stringify(message);
    await dispatcher.dispatch(message);
    expect(JSON.stringify(message)).toBe(snapshot);
    // Defensive copy: mutating the recorded entry must not affect the caller.
    const recorded = dispatcher.sent[0]!;
    recorded.vars.verifyUrl = 'tampered';
    expect(message.vars.verifyUrl).toBe('u');
  });
});

describe('NoopMailDispatcher', () => {
  it('resolves without throwing', async () => {
    const dispatcher = new NoopMailDispatcher();
    await expect(dispatcher.dispatch(sample)).resolves.toBeUndefined();
  });

  it('does not expose any sent collection', () => {
    const dispatcher = new NoopMailDispatcher();
    expect((dispatcher as unknown as { sent?: unknown }).sent).toBeUndefined();
  });
});
