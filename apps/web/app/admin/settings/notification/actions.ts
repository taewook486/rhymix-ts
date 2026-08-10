'use server';
/**
 * Admin 알림 설정 Server Actions — SPEC-ADMIN-002 Slice 1F + Slice 2G (REQ-ADMIN2-110, REQ-ADMIN2-111).
 * SPEC-CONTENT-PARITY-001 M6 (REQ-CPAR-026~028): 전역 알림 이벤트 설정 추가.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-110, REQ-ADMIN2-111
 * @MX:SPEC: SPEC-CONTENT-PARITY-001 REQ-CPAR-026~028
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { auth } from '@/lib/auth/config';
import { getServerCaller } from '@/lib/trpc/server';

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
}

const UpdateNotificationSchema = z.object({
  senderName: z.string().min(1).max(100),
  senderEmail: z.string().email(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().default(false),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFrom: z.string().email().optional().or(z.literal('')),
});

export async function updateNotificationSettingsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UpdateNotificationSchema.safeParse({
    senderName: formData.get('senderName'),
    senderEmail: formData.get('senderEmail'),
    smtpHost: formData.get('smtpHost') || undefined,
    smtpPort: formData.get('smtpPort') || undefined,
    smtpSecure: formData.get('smtpSecure') === 'on',
    smtpUser: formData.get('smtpUser') || undefined,
    smtpPassword: formData.get('smtpPassword') || undefined,
    smtpFrom: formData.get('smtpFrom') || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const caller = await getServerCaller();
    await caller.admin.settings.updateNotification({
      ...parsed.data,
      smtpFrom: parsed.data.smtpFrom || undefined,
    });
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message };
    }
    return { error: '알림 설정 저장 중 오류가 발생했습니다.' };
  }
  revalidatePath('/admin/settings/notification');
  return {};
}

/**
 * 테스트 메일 발송 Server Action — SPEC-ADMIN-002 Slice 2G (REQ-ADMIN2-111)
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-111
 */
export async function sendTestEmailAction(
  _prev: ActionState | null,
  _formData: FormData,
): Promise<ActionState> {
  try {
    const caller = await getServerCaller();
    const settings = await caller.admin.settings.getNotification();

    // Check if SMTP is configured
    if (!settings.smtpHost || !settings.smtpPort) {
      return { error: 'SMTP 설정이 완료되지 않았습니다. 먼저 SMTP 설정을 저장해주세요.' };
    }

    // Import nodemailer from packages/auth for test email (bypass template system)
    const nodemailer = await import('nodemailer');

    // Get the password from settings if it exists (from database, not from View)
    // For test email, we need to use a temporary password if user just entered one
    const smtpPassword = _formData.get('smtpPassword') as string | null;

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure ?? false,
      auth: settings.smtpUser
        ? { user: settings.smtpUser, pass: smtpPassword || '' }
        : undefined,
    });

    // Get current admin's email for test
    const session = await auth();
    const userEmail = session?.user?.email || (session?.user as any)?.email;
    if (!userEmail) {
      return { error: '로그인된 사용자의 이메일을 찾을 수 없습니다.' };
    }

    // Send test email directly (HTML + text)
    const testEmailContent = {
      text: '这是一封测试邮件. 如果您收到此邮件,则SMTP配置正常.\n\nThis is a test email. If you receive this email, your SMTP configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">테스트 메일 / Test Email</h2>
          <p>这是一封测试邮件. 如果您收到此邮件,则SMTP配置正常.</p>
          <p>This is a test email. If you receive this email, your SMTP configuration is working correctly.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">SMTP Host: ${settings.smtpHost}:${settings.smtpPort}</p>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    };

    await transporter.sendMail({
      from: settings.smtpFrom || settings.senderEmail,
      to: userEmail,
      subject: '테스트 메일 / Test Email',
      ...testEmailContent,
    });

    return { success: true, message: '테스트 메일이 발송되었습니다. 이메일을 확인해주세요.' };
  } catch (err) {
    if (err instanceof Error) {
      return { error: `테스트 메일 발송 실패: ${err.message}` };
    }
    return { error: '테스트 메일 발송 중 오류가 발생했습니다.' };
  }
}

/**
 * 전역 알림 이벤트 설정 업데이트 Server Action — SPEC-CONTENT-PARITY-001 M6 (REQ-CPAR-026).
 *
 * @MX:SPEC: SPEC-CONTENT-PARITY-001 REQ-CPAR-026~028
 */
const UpdateGlobalEventsSchema = z.object({
  comment: z.boolean(),
  reply: z.boolean(),
  mention: z.boolean(),
  message: z.boolean(),
});

export async function updateGlobalEventsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UpdateGlobalEventsSchema.safeParse({
    comment: formData.get('comment') === 'on',
    reply: formData.get('reply') === 'on',
    mention: formData.get('mention') === 'on',
    message: formData.get('message') === 'on',
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const caller = await getServerCaller();
    await caller.admin.settings.notificationGlobalEvents.update({
      ...parsed.data,
    });
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message };
    }
    return { error: '전역 알림 이벤트 설정 저장 중 오류가 발생했습니다.' };
  }

  revalidatePath('/admin/settings/notification');
  return {};
}
