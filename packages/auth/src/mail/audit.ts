/**
 * 메일 발송 실패 감사 로그 기록 — REQ-MAIL-042
 *
 * SMTP 전송 실패 시 AuditLog 테이블에 기록하여 관리자가 모니터링할 수 있게 한다.
 */

import { PrismaClient } from '@rhymix-ts/db';
import type { MailMessage } from '../mail';

/**
 * 메일 발송 실패 감사 로그 기록
 * @param prisma Prisma 클라이언트 인스턴스
 * @param message 발송에 실패한 메일 메시지
 * @param error 원인 에러 (SMTP 에러 또는 네트워크 에러)
 * @param attempts 시도 횟수
 */
export async function writeMailFailureAudit(
  prisma: PrismaClient,
  message: MailMessage,
  error: unknown,
  attempts: number,
): Promise<void> {
  // SMTP 응답 코드 추출 — 4xx/5xx SMTP 에러코드 또는 네트워크 에러는 'NETWORK'
  const errorCode =
    error instanceof Error &&
    typeof (error as any).responseCode === 'number' &&
    /^[45]\d{2}$/.test((error as any).responseCode.toString())
      ? (error as any).responseCode.toString()
      : 'NETWORK';

  await prisma.auditLog.create({
    data: {
      action: 'MAIL_DELIVERY_FAILED',
      actorId: null, // 메일 발송은 시스템 작업이므로 actor가 없음
      targetId: null,
      metadata: {
        template: message.template,
        errorCode,
        attempts,
        subject: message.subject,
        recipient: message.to, // 수신자 이메일 주소를 metadata에 저장
      },
      ip: null,
      userAgent: null,
    },
  });
}
