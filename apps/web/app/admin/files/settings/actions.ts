'use server';
/**
 * Admin 파일 설정 Server Action — SPEC-ADMIN-002 Slice 2B (REQ-ADMIN2-080, REQ-ADMIN2-081).
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-080, REQ-ADMIN2-081
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getServerCaller } from '@/lib/trpc/server';

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

const UploadSettingsSchema = z.object({
  allowedExtensions: z.array(z.string()),
  maxFileSize: z.coerce.number().int().min(1024).max(1073741824),
  maxAttachmentsPerPost: z.coerce.number().int().min(1).max(100),
  imageAutoResize: z.object({
    width: z.coerce.number().int().min(100).max(4096),
    height: z.coerce.number().int().min(100).max(4096),
  }),
});

const DownloadSettingsSchema = z.object({
  downloadPermission: z.enum(['unlimited', 'member_only', 'point_deduction']),
  pointDeduction: z.coerce.number().int().min(0).max(1000).optional(),
  hotlinkProtection: z.boolean(),
});

export async function updateUploadSettingsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const allowedExtensionsStr = formData.get('allowedExtensions') as string;
  const allowedExtensions = allowedExtensionsStr.split(',').map((e) => e.trim()).filter(Boolean);

  const parsed = UploadSettingsSchema.safeParse({
    allowedExtensions,
    maxFileSize: formData.get('maxFileSize'),
    maxAttachmentsPerPost: formData.get('maxAttachmentsPerPost'),
    imageAutoResize: {
      width: formData.get('resizeWidth'),
      height: formData.get('resizeHeight'),
    },
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const caller = await getServerCaller();
    await caller.admin.file.updateUploadSettings(parsed.data);
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message };
    }
    return { error: '업로드 설정 저장 중 오류가 발생했습니다.' };
  }

  revalidatePath('/admin/files/settings');
  return { success: true };
}

export async function updateDownloadSettingsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = DownloadSettingsSchema.safeParse({
    downloadPermission: formData.get('downloadPermission'),
    pointDeduction: formData.get('pointDeduction') || undefined,
    hotlinkProtection: formData.get('hotlinkProtection') === 'on',
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const caller = await getServerCaller();
    await caller.admin.file.updateDownloadSettings(parsed.data);
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message };
    }
    return { error: '다운로드 설정 저장 중 오류가 발생했습니다.' };
  }

  revalidatePath('/admin/files/settings');
  return { success: true };
}
