'use client';
/**
 * 캡차 설정 폼 (Client Component) — SPEC-ADMIN-002 REQ-ADMIN2-124.
 */
import { useState } from 'react';
import { useActionState } from 'react';
import { Button } from '@rhymix-ts/ui/components';
import { Input } from '@rhymix-ts/ui/components';
import { Label } from '@rhymix-ts/ui/components';
import { Textarea } from '@rhymix-ts/ui/components';
import { Checkbox } from '@rhymix-ts/ui/components';
import { updateCaptchaSettingsAction, type ActionState } from './actions';
import { toast } from 'sonner';

const initialActionState: ActionState = {};

type CaptchaSettings = {
  provider: 'none' | 'recaptcha' | 'turnstile' | 'simple_math';
  triggers: string[];
  siteKey: string | null;
  secret: string | null;
  threshold: number | null;
};

const TRIGGER_OPTIONS = [
  { value: 'document.create', label: '문서 작성' },
  { value: 'comment.create', label: '댓글 작성' },
  { value: 'user.signup', label: '회원 가입' },
  { value: 'user.login', label: '로그인' },
  { value: 'contact.send', label: '문의하기' },
];

export function CaptchaForm({ initialSettings }: { initialSettings: CaptchaSettings }) {
  const [provider, setProvider] = useState(initialSettings.provider);
  const [selectedTriggers, setSelectedTriggers] = useState<Set<string>>(
    new Set(initialSettings.triggers),
  );
  const [threshold, setThreshold] = useState(initialSettings.threshold ?? 0.5);

  const [state, formAction, isPending] = useActionState(
    updateCaptchaSettingsAction,
    initialActionState,
  );

  const handleTriggerToggle = (value: string) => {
    const newTriggers = new Set(selectedTriggers);
    if (newTriggers.has(value)) {
      newTriggers.delete(value);
    } else {
      newTriggers.add(value);
    }
    setSelectedTriggers(newTriggers);
  };

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-600" role="status">저장되었습니다.</p>
      )}

      {/* 공급자 선택 */}
      <div>
        <Label htmlFor="provider">캡차 공급자</Label>
        <select
          id="provider"
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as typeof provider)}
          className="mt-2 flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="none">사용 안함</option>
          <option value="recaptcha">reCAPTCHA</option>
          <option value="turnstile">Cloudflare Turnstile</option>
          <option value="simple_math">단순 수학 문제</option>
        </select>
      </div>

      {/* 트리거 조건 (다중 선택) */}
      <div>
        <Label className="text-base">캡차 적용 대상</Label>
        <p className="text-sm text-muted-foreground mb-3">
          캡차를 적용할 폼/액션을 선택합니다.
        </p>
        <div className="space-y-2">
          {TRIGGER_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={`trigger-${option.value}`}
                name="triggers"
                value={option.value}
                checked={selectedTriggers.has(option.value)}
                onCheckedChange={() => handleTriggerToggle(option.value)}
              />
              <label
                htmlFor={`trigger-${option.value}`}
                className="text-sm cursor-pointer"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
        <input
          type="hidden"
          name="triggers"
          value={Array.from(selectedTriggers).join(',')}
        />
      </div>

      {/* Site Key (reCAPTCHA, Turnstile 전용) */}
      {(provider === 'recaptcha' || provider === 'turnstile') && (
        <>
          <div>
            <Label htmlFor="siteKey">Site Key</Label>
            <Input
              id="siteKey"
              name="siteKey"
              defaultValue={initialSettings.siteKey ?? ''}
              placeholder="공급자에서 발급받은 Site Key 입력"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {provider === 'recaptcha' ? 'Google reCAPTCHA' : 'Cloudflare Turnstile'}에서
              발급받은 Site Key를 입력하세요.
            </p>
          </div>

          <div>
            <Label htmlFor="secret">Secret Key</Label>
            <Input
              id="secret"
              name="secret"
              type="password"
              defaultValue={initialSettings.secret ?? ''}
              placeholder="공급자에서 발급받은 Secret Key 입력"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {provider === 'recaptcha' ? 'Google reCAPTCHA' : 'Cloudflare Turnstile'}에서
              발급받은 Secret Key를 입력하세요.
            </p>
          </div>

          {/* Threshold (reCAPTCHA v3, Turnstile 전용) */}
          <div>
            <Label htmlFor="threshold">임계값 (Threshold): {threshold.toFixed(2)}</Label>
            <p className="text-xs text-muted-foreground mb-3">
              낮을수록 엄격하게 검사합니다 (0.0 ~ 1.0).
            </p>
            <input
              id="threshold"
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="mt-2 w-full"
            />
            <input type="hidden" name="threshold" value={threshold} />
          </div>
        </>
      )}

      <div className="pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  );
}
