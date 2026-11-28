/**
 * 보안 설정 Server Action 테스트 — CAPTCHA 저장.
 *
 * 이 테스트가 존재하는 이유: updateCaptchaSettingsAction 이 console.log('[Mock] …') 만
 * 하고 `{}`(성공)를 돌려줬다. 화면은 admin.settings.getCaptcha 로 값을 읽는데 쓰는 쪽이
 * 연결되어 있지 않아, 저장한 값이 새로고침하면 사라졌다.
 * 필드 대응(손실 없음): captchaSignupEnabled→signupEnabled, captchaLoginEnabled→loginEnabled,
 * captchaSiteKey→turnstileSiteKey, captchaSecretKey→turnstileSecretKey,
 * captchaLoginThreshold→loginCaptchaThreshold.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

const mockUpdateCaptcha = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn().mockResolvedValue({
    admin: { settings: { updateCaptcha: (...a: unknown[]) => mockUpdateCaptcha(...a) } },
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

async function loadActions() {
  return import('./actions');
}

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

const filled = {
  captchaSignupEnabled: 'on',
  captchaLoginEnabled: 'on',
  captchaSiteKey: 'site-key',
  captchaSecretKey: 'secret-key',
  captchaLoginThreshold: '3',
};

describe('updateCaptchaSettingsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCaptcha.mockResolvedValue({ success: true });
  });

  it('입력을 admin.settings.updateCaptcha 로 손실 없이 저장한다', async () => {
    const { updateCaptchaSettingsAction } = await loadActions();

    const state = await updateCaptchaSettingsAction(null, fd(filled));

    expect(mockUpdateCaptcha).toHaveBeenCalledTimes(1);
    expect(mockUpdateCaptcha).toHaveBeenCalledWith({
      signupEnabled: true,
      loginEnabled: true,
      turnstileSiteKey: 'site-key',
      turnstileSecretKey: 'secret-key',
      loginCaptchaThreshold: 3,
    });
    expect(state).toEqual({});
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/settings/security');
  });

  it('체크를 끄면 false 로 저장한다', async () => {
    const { updateCaptchaSettingsAction } = await loadActions();

    await updateCaptchaSettingsAction(
      null,
      fd({ captchaSiteKey: 'a', captchaSecretKey: 'b', captchaLoginThreshold: '5' }),
    );

    expect(mockUpdateCaptcha).toHaveBeenCalledWith(
      expect.objectContaining({ signupEnabled: false, loginEnabled: false }),
    );
  });

  it('빈 키는 보내지 않아 저장된 키를 지우지 않는다 (라우터: undefined = 유지)', async () => {
    const { updateCaptchaSettingsAction } = await loadActions();

    await updateCaptchaSettingsAction(
      null,
      fd({ captchaSiteKey: '', captchaSecretKey: '', captchaLoginThreshold: '5' }),
    );

    const arg = mockUpdateCaptcha.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.turnstileSiteKey).toBeUndefined();
    expect(arg.turnstileSecretKey).toBeUndefined();
  });

  it('임계값이 범위(1~10) 밖이면 저장소를 호출하지 않는다', async () => {
    const { updateCaptchaSettingsAction } = await loadActions();

    const state = await updateCaptchaSettingsAction(null, fd({ ...filled, captchaLoginThreshold: '11' }));

    expect(state.fieldErrors?.captchaLoginThreshold).toBeDefined();
    expect(mockUpdateCaptcha).not.toHaveBeenCalled();
  });

  it('저장소가 거부하면(키 없이 활성화 등) 성공으로 보이지 않고 사유를 돌려준다', async () => {
    mockUpdateCaptcha.mockRejectedValue(
      new TRPCError({ code: 'BAD_REQUEST', message: 'CAPTCHA를 활성화하려면 키를 입력해야 합니다.' }),
    );
    const { updateCaptchaSettingsAction } = await loadActions();

    const state = await updateCaptchaSettingsAction(null, fd(filled));

    expect(state).toEqual({ error: 'CAPTCHA를 활성화하려면 키를 입력해야 합니다.' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
