'use server';
/**
 * 고급 설정 Server Actions — SPEC-ADMIN-002 Slice 2D (REQ-ADMIN2-116/157/158).
 */
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function updateAdvancedSettingsAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();

  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const caller = await getServerCaller();

    // Extract routing settings
    const routingData = {
      siteTimezone: formData.get('siteTimezone') as string,
      defaultLanguage: formData.get('defaultLanguage') as string,
      cacheDriver: formData.get('cacheDriver') as 'file' | 'redis' | 'memcached',
    };

    // Extract localization settings
    const supportedLanguages = formData.getAll('supportedLanguages') as string[];
    const localizationData = {
      shortUrlPolicy: formData.get('shortUrlPolicy') as 'disabled' | 'xe_compat' | 'all',
      mobileViewEnabled: formData.get('mobileViewEnabled') === 'true',
      tabletAsMobile: formData.get('tabletAsMobile') === 'true',
      autoLanguageSelection: formData.get('autoLanguageSelection') === 'true',
      supportedLanguages,
      defaultLanguage: formData.get('defaultLanguage') as string,
      mobileViewport: formData.get('mobileViewport') as string,
    };

    // Extract performance settings
    const cacheControlOptions = formData.getAll('cacheControlOptions') as ("no-cache" | "no-store" | "must-revalidate")[];
    const performanceData = {
      sessionDbUse: formData.get('sessionDbUse') === 'true',
      sessionDelayStart: formData.get('sessionDelayStart') === 'true',
      templateCacheDelay: formData.get('templateCacheDelay') === 'true',
      thumbnailTarget: formData.get('thumbnailTarget') as 'attached' | 'all' | 'none',
      thumbnailMethod: formData.get('thumbnailMethod') as 'gd' | 'imagick' | 'none',
      cacheEnabled: formData.get('cacheEnabled') === 'true',
      cacheDefaultTtl: parseInt(formData.get('cacheDefaultTtl') as string, 10),
      cacheDeleteMethod: formData.get('cacheDeleteMethod') as 'folder' | 'content',
      cacheControlOptions,
      adminLayout: formData.get('adminLayout') as 'module' | 'admin',
      jsCompressionPolicy: formData.get('jsCompressionPolicy') as 'none' | 'common' | 'all',
      jsMergePolicy: formData.get('jsMergePolicy') as 'none' | 'css' | 'js' | 'both',
      cssCompressionPolicy: formData.get('cssCompressionPolicy') as 'none' | 'common' | 'all',
      cssMergePolicy: formData.get('cssMergePolicy') as 'none' | 'css' | 'js' | 'both',
      jqueryVersion: formData.get('jqueryVersion') as '2.2.4' | '3.7.1',
    };

    // Update all three settings in parallel
    await Promise.all([
      caller.admin.settings.updateAdvancedRouting(routingData),
      caller.admin.settings.updateAdvancedLocalization(localizationData),
      caller.admin.settings.updateAdvancedPerformance(performanceData),
    ]);

    revalidatePath('/admin/settings/advanced');

    return { success: true };
  } catch (error) {
    console.error('Advanced settings update error:', error);
    return { error: '설정 저장에 실패했습니다.' };
  }
}
