'use client';

/**
 * TokenEditor — Right pane of 3-pane admin theme editor.
 *
 * SPEC-THEME-POLISH-001 REQ-THEME-POLISH-020~029.
 * Zod schema → react-hook-form auto-form with live validation.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@rhymix-ts/ui';
import { themeTokensSchema, type ThemeTokens } from '@rhymix-ts/core';
import { buildFormFields, type FormField } from '@/lib/theme/token-form-builder';
import { loadTokens, saveTokens } from '@/app/admin/site/design/actions';

interface TokenEditorProps {
  siteId: number;
}

type ColorScheme = 'light' | 'dark';

export function TokenEditor({ siteId }: TokenEditorProps) {
  const [activeScheme, setActiveScheme] = useState<ColorScheme>('light');
  const [previewKey, setPreviewKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Form field introspection
  const [formFields, setFormFields] = useState<FormField[]>([]);

  useEffect(() => {
    // Zod schema introspection
    const fields = buildFormFields(themeTokensSchema);
    setFormFields(fields);
  }, []);

  // react-hook-form setup
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, isValid },
  } = useForm<ThemeTokens>({
    resolver: zodResolver(themeTokensSchema),
    mode: 'onChange', // Validate on change
    defaultValues: {} as ThemeTokens, // Loaded via useEffect with loadTokens
  });

  // Load current tokens on mount — SPEC-MENU-001 REQ-MENU-062
  useEffect(() => {
    const loadInitialTokens = async () => {
      setIsLoading(true);
      const result = await loadTokens({
        scope: 'site',
        refId: siteId,
      });

      if (result.success && result.tokens) {
        reset(result.tokens);
      } else {
        console.error('Failed to load tokens:', result.error);
      }
      setIsLoading(false);
    };

    loadInitialTokens();
  }, [siteId, reset]);

  // Preview key update on form change (debounced)
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      // TODO: staged token을 cache에 저장하고 previewKey 생성
      setPreviewKey(Date.now().toString());
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [watch(), isDirty]);

  const handleSave = async (data: ThemeTokens) => {
    const result = await saveTokens({
      scope: 'site',
      refId: siteId,
      tokens: data,
      siteId,
    });

    if (result.error) {
      alert(`저장 실패: ${result.error}`); // TODO: Toaster로 개선
    } else {
      // TODO: 성공 메시지 표시, revalidatePath 후 preview 갱신
      console.log('저장 성공');
    }
  };

  const handleDiscard = () => {
    reset();
    setPreviewKey('');
  };

  // Filter fields by color scheme
  const filteredFields = formFields.filter((field) => {
    // Light mode: light.* + top-level fields
    // Dark mode: dark.* only
    if (activeScheme === 'light') {
      return !field.name.startsWith('dark');
    } else {
      return field.name.startsWith('dark');
    }
  });

  // Recursively render form fields
  const renderField = (field: FormField): React.ReactNode => {
    const error = errors[field.name as keyof ThemeTokens];

    if (field.type === 'group' && field.children) {
      return (
        <fieldset key={field.name} className="border rounded-md p-4">
          <legend className="text-sm font-semibold px-2">{field.label}</legend>
          <div className="space-y-4">
            {field.children.map(renderField)}
          </div>
        </fieldset>
      );
    }

    if (field.type === 'color') {
      return (
        <div key={field.name} className="space-y-1">
          <label className="text-sm font-medium">{field.label}</label>
          <div className="flex gap-2">
            <input
              type="color"
              {...register(field.name as keyof ThemeTokens)}
              className="h-10 w-16 rounded border"
            />
            <input
              type="text"
              {...register(field.name as keyof ThemeTokens)}
              className={cn(
                'flex-1 px-3 py-2 border rounded text-sm',
                error && 'border-red-500'
              )}
              placeholder="#000000"
            />
          </div>
          {error && (
            <p className="text-red-500 text-xs">{error.message?.toString()}</p>
          )}
        </div>
      );
    }

    if (field.type === 'text') {
      return (
        <div key={field.name} className="space-y-1">
          <label className="text-sm font-medium">{field.label}</label>
          <input
            type="text"
            {...register(field.name as keyof ThemeTokens)}
            className={cn(
              'w-full px-3 py-2 border rounded text-sm',
              error && 'border-red-500'
            )}
          />
          {error && (
            <p className="text-red-500 text-xs">{error.message?.toString()}</p>
          )}
        </div>
      );
    }

    if (field.type === 'number') {
      return (
        <div key={field.name} className="space-y-1">
          <label className="text-sm font-medium">{field.label}</label>
          <input
            type="number"
            min={field.min}
            max={field.max}
            {...register(field.name as keyof ThemeTokens, { valueAsNumber: true })}
            className={cn(
              'w-full px-3 py-2 border rounded text-sm',
              error && 'border-red-500'
            )}
          />
          {error && (
            <p className="text-red-500 text-xs">{error.message?.toString()}</p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Loading state */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">토큰 로딩 중...</div>
        </div>
      )}

      {/* Tab bar */}
      {!isLoading && (
        <>
          <div className="flex border-b">
        <button
          type="button"
          onClick={() => setActiveScheme('light')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeScheme === 'light'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          라이트 모드
        </button>
        <button
          type="button"
          onClick={() => setActiveScheme('dark')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeScheme === 'dark'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          다크 모드
        </button>
      </div>

      {/* Form body */}
      <form onSubmit={handleSubmit(handleSave)} className="flex-1 overflow-y-auto p-4 space-y-6">
        {filteredFields.map(renderField)}

        {/* Bottom bar */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex items-center justify-between gap-4">
          <div>
            {isDirty && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                변경사항 있음
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!isDirty}
              className={cn(
                'px-4 py-2 text-sm rounded transition-colors',
                isDirty
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={!isDirty || !isValid}
              className={cn(
                'px-4 py-2 text-sm rounded transition-colors',
                isDirty && isValid
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              Save
            </button>
          </div>
        </div>
      </form>
        </>
      )}
    </div>
  );
}
