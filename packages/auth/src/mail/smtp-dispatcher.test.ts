/**
 * SmtpMailDispatcher 테스트 — REQ-MAIL-020~027
 *
 * SMTP 발송 성공/실패, 재시도 로직, 영구적 에러 처리, AuditLog 기록을 테스트한다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmtpMailDispatcher } from './smtp-dispatcher';
import { MailValidationError, MailDeliveryError } from './errors';

// PrismaClient mock storage
const mockAuditLogs: Array<{ action: string; metadata: Record<string, unknown> }> = [];

// Mock @rhymix-ts/db to export the mock prisma
vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    auditLog: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        mockAuditLogs.push({
          action: data.action,
          metadata: data.metadata,
        });
        return {};
      }),
    },
  },
}));

// nodemailer mock — REQ-MAIL-062
const mockSendMail = vi.fn();
const mockVerify = vi.fn();
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
      verify: mockVerify,
    })),
  },
}));

function makeDispatcher() {
  mockAuditLogs.length = 0; // Clear audit logs between tests
  return new SmtpMailDispatcher({
    host: 'smtp.example.com',
    port: 587,
    from: 'test@example.com',
    secure: false,
  });
}

const validMessage = {
  to: 'a@b.com',
  subject: 'Test Subject',
  template: 'signup-verify' as const,
  vars: { verifyUrl: 'https://example.com/verify/abc', userName: 'Alice' },
};

describe('SmtpMailDispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditLogs.length = 0;
  });

  it('발송 성공 시 resolve (REQ-MAIL-022)', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: '123' });
    const dispatcher = makeDispatcher();
    await expect(dispatcher.dispatch(validMessage)).resolves.toBeUndefined();
    expect(mockSendMail).toHaveBeenCalledOnce();
  });

  it('잘못된 이메일 → MailValidationError 즉시 (REQ-MAIL-025)', async () => {
    const dispatcher = makeDispatcher();
    await expect(
      dispatcher.dispatch({ ...validMessage, to: 'not-an-email' })
    ).rejects.toThrow(MailValidationError);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('transient 오류 → 3회 재시도 후 성공 (REQ-MAIL-040)', async () => {
    // 처음 2회 실패, 3번째 성공
    const transientErr = Object.assign(new Error('ECONNRESET'), { code: 'ECONNRESET' });
    mockSendMail
      .mockRejectedValueOnce(transientErr)
      .mockRejectedValueOnce(transientErr)
      .mockResolvedValueOnce({ messageId: '123' });

    vi.useFakeTimers();
    const dispatcher = makeDispatcher();
    const promise = dispatcher.dispatch(validMessage);

    // 타이머 진행 (1초 대기)
    await vi.advanceTimersByTimeAsync(1000);
    // 2초 대기
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).resolves.toBeUndefined();
    expect(mockSendMail).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('모든 재시도 소진 → MailDeliveryError + AuditLog 기록 (AC-MAIL-A3)', async () => {
    const transientErr = Object.assign(new Error('ECONNRESET'), { code: 'ECONNRESET' });
    mockSendMail
      .mockRejectedValueOnce(transientErr)
      .mockRejectedValueOnce(transientErr)
      .mockRejectedValueOnce(transientErr);

    vi.useFakeTimers();
    const dispatcher = makeDispatcher();
    // rejects 핸들러를 즉시 연결해야 unhandled rejection 경고를 방지할 수 있음
    const dispatchPromise = dispatcher.dispatch(validMessage);
    const assertion = expect(dispatchPromise).rejects.toThrow(MailDeliveryError);

    // 모든 재시도 대기 시간 진행
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    await assertion;
    expect(mockSendMail).toHaveBeenCalledTimes(3); // 총 3회 시도

    // Get prisma mock from the mocked module
    const { prisma } = await import('@rhymix-ts/db');
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();

    const auditCall = (prisma.auditLog.create as any).mock.calls[0][0];
    expect(auditCall.data.action).toBe('MAIL_DELIVERY_FAILED');
    expect(auditCall.data.metadata.recipient).toBe('a@b.com');
    expect(auditCall.data.metadata.template).toBe('signup-verify');
    expect(auditCall.data.metadata.attempts).toBe(3);
    vi.useRealTimers();
  });

  it('permanent 5xx 오류 → 재시도 없이 즉시 실패 (REQ-MAIL-041)', async () => {
    const permanentErr = Object.assign(new Error('550 User not found'), { responseCode: 550 });
    mockSendMail.mockRejectedValueOnce(permanentErr);

    const dispatcher = makeDispatcher();
    await expect(dispatcher.dispatch(validMessage)).rejects.toThrow(MailDeliveryError);
    expect(mockSendMail).toHaveBeenCalledTimes(1); // 재시도 없음
    // AuditLog는 기록됨 (attempts=1)
    const { prisma } = await import('@rhymix-ts/db');
    const auditCall = (prisma.auditLog.create as any).mock.calls[0][0];
    expect(auditCall.data.action).toBe('MAIL_DELIVERY_FAILED');
    expect(auditCall.data.metadata.attempts).toBe(1);
  });

  it('verify() 성공 시 true 반환 (REQ-MAIL-026)', async () => {
    mockVerify.mockResolvedValueOnce(undefined);
    const dispatcher = makeDispatcher();
    await expect(dispatcher.verify()).resolves.toBe(true);
    expect(mockVerify).toHaveBeenCalledOnce();
  });

  it('verify() 실패 시 false 반환 (REQ-MAIL-026)', async () => {
    mockVerify.mockRejectedValueOnce(new Error('Connection failed'));
    const dispatcher = makeDispatcher();
    await expect(dispatcher.verify()).resolves.toBe(false);
    expect(mockVerify).toHaveBeenCalledOnce();
  });

  it('영구적 에러는 5xx 범위 (REQ-MAIL-041)', async () => {
    // 500번대 에러는 영구적 에러로 간주
    const err500 = Object.assign(new Error('Internal Server Error'), { responseCode: 500 });
    const err503 = Object.assign(new Error('Service Unavailable'), { responseCode: 503 });
    const err550 = Object.assign(new Error('Mailbox unavailable'), { responseCode: 550 });

    mockSendMail.mockRejectedValueOnce(err500);
    let dispatcher = makeDispatcher();
    await expect(dispatcher.dispatch(validMessage)).rejects.toThrow(MailDeliveryError);
    expect(mockSendMail).toHaveBeenCalledTimes(1); // 재시도 없음

    // Reset mock for next test
    mockSendMail.mockReset();
    mockSendMail.mockRejectedValueOnce(err503);
    dispatcher = makeDispatcher();
    await expect(dispatcher.dispatch(validMessage)).rejects.toThrow(MailDeliveryError);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    // Reset mock for next test
    mockSendMail.mockReset();
    mockSendMail.mockRejectedValueOnce(err550);
    dispatcher = makeDispatcher();
    await expect(dispatcher.dispatch(validMessage)).rejects.toThrow(MailDeliveryError);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});
