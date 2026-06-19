'use server';
/**
 * SEO 설정 Server Actions — SPEC-ADMIN-002 Slice 2D (REQ-ADMIN2-118/119).
 */
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function updateSeoSettingsAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();

  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const caller = await getServerCaller();

    await caller.admin.settings.updateSeo({
      defaultMetaTitle: formData.get('defaultMetaTitle') as string | undefined,
      defaultMetaDescription: formData.get('defaultMetaDescription') as string | undefined,
      ogTitle: formData.get('ogTitle') as string | undefined,
      ogDescription: formData.get('ogDescription') as string | undefined,
      ogImageUrl: formData.get('ogImageUrl') as string | undefined,
      canonicalUrlPolicy: formData.get('canonicalUrlPolicy') as 'none' | 'default' | 'custom',
      sitemapEnabled: formData.get('sitemapEnabled') === 'true',
    });

    revalidatePath('/admin/settings/seo');
    revalidatePath('/sitemap.xml');

    return { success: true };
  } catch (error) {
    console.error('SEO settings update error:', error);
    return { error: '설정 저장에 실패했습니다.' };
  }
}
