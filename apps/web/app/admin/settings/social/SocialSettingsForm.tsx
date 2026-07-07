/**
 * 소셜 로그인 설정 폼 — SPEC-SOCIAL-LOGIN-001 (REQ-SOCIAL-005)
 *
 * Client Component for managing Kakao/Google OAuth provider settings.
 * Follows the same pattern as SecuritySettingsForm.
 *
 * @MX:NOTE: 소셜 로그인 설정 폼 — admin.settings.updateSocial tRPC 호출.
 * @MX:SPEC: SPEC-SOCIAL-LOGIN-001 REQ-SOCIAL-005
 */
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getServerCaller } from '@/lib/trpc/server';

const SocialSettingsSchema = z.object({
  kakao: z.object({
    enabled: z.boolean(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
  }),
  google: z.object({
    enabled: z.boolean(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
  }),
});

type SocialSettingsForm = z.infer<typeof SocialSettingsSchema>;

interface SocialSettingsFormProps {
  initial: SocialSettingsForm;
}

export function SocialSettingsForm({ initial }: SocialSettingsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SocialSettingsForm>({
    resolver: zodResolver(SocialSettingsSchema),
    defaultValues: initial,
  });

  const kakaoEnabled = watch('kakao.enabled');
  const googleEnabled = watch('google.enabled');

  const onSubmit = async (data: SocialSettingsForm) => {
    setIsSubmitting(true);
    try {
      const caller = await getServerCaller();
      await caller.admin.settings.updateSocial.mutate(data);

      toast.success('소셜 로그인 설정이 저장되었습니다.');
      router.refresh();
    } catch (error) {
      console.error('Failed to update social settings:', error);
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
      {/* Kakao Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">카카오 로그인</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('kakao.enabled')}
              className="w-4 h-4 border border-gray-300 rounded"
              disabled={isSubmitting}
            />
            <span className="text-sm">활성화</span>
          </label>
        </div>

        {kakaoEnabled && (
          <div className="space-y-4">
            <div>
              <label htmlFor="kakao-clientId" className="block text-sm font-medium text-gray-700 mb-1">
                Client ID
              </label>
              <input
                id="kakao-clientId"
                type="text"
                {...register('kakao.clientId')}
                placeholder="Kakao REST API Key"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              {errors.kakao?.clientId && (
                <p className="text-red-600 text-sm mt-1">{errors.kakao.clientId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="kakao-clientSecret" className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret
              </label>
              <input
                id="kakao-clientSecret"
                type="password"
                {...register('kakao.clientSecret')}
                placeholder="Kakao Client Secret"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              {errors.kakao?.clientSecret && (
                <p className="text-red-600 text-sm mt-1">{errors.kakao.clientSecret.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Google Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Google 로그인</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('google.enabled')}
              className="w-4 h-4 border border-gray-300 rounded"
              disabled={isSubmitting}
            />
            <span className="text-sm">활성화</span>
          </label>
        </div>

        {googleEnabled && (
          <div className="space-y-4">
            <div>
              <label htmlFor="google-clientId" className="block text-sm font-medium text-gray-700 mb-1">
                Client ID
              </label>
              <input
                id="google-clientId"
                type="text"
                {...register('google.clientId')}
                placeholder="Google OAuth Client ID"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              {errors.google?.clientId && (
                <p className="text-red-600 text-sm mt-1">{errors.google.clientId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="google-clientSecret" className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret
              </label>
              <input
                id="google-clientSecret"
                type="password"
                {...register('google.clientSecret')}
                placeholder="Google OAuth Client Secret"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              {errors.google?.clientSecret && (
                <p className="text-red-600 text-sm mt-1">{errors.google.clientSecret.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
