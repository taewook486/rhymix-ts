export interface PreviewState {
  active: boolean;
  themeName?: string;
  expiresAt?: Date;
}

export const PREVIEW_COOKIE_NAME = 'rx-theme-preview';
export const PREVIEW_TTL_MS = 30 * 60 * 1000; // 30분

interface PreviewPayload {
  themeName: string;
  expiresAt: number; // Unix timestamp (ms)
}

/**
 * 쿠키 값 문자열을 PreviewState로 파싱한다.
 * REQ-THEME-080
 */
export function parsePreviewCookie(cookieValue: string | undefined): PreviewState {
  if (cookieValue === undefined) {
    return { active: false };
  }

  try {
    const json = atob(cookieValue);
    const payload = JSON.parse(json) as unknown;

    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof (payload as Record<string, unknown>)['themeName'] !== 'string' ||
      typeof (payload as Record<string, unknown>)['expiresAt'] !== 'number'
    ) {
      return { active: false };
    }

    const { themeName, expiresAt } = payload as PreviewPayload;

    return {
      active: true,
      themeName,
      expiresAt: new Date(expiresAt),
    };
  } catch {
    return { active: false };
  }
}

/**
 * PreviewState를 쿠키 값 문자열로 직렬화한다 (JSON base64).
 * REQ-THEME-081
 */
export function serializePreviewCookie(themeName: string, now: Date = new Date()): string {
  const payload: PreviewPayload = {
    themeName,
    expiresAt: now.getTime() + PREVIEW_TTL_MS,
  };

  return btoa(JSON.stringify(payload));
}

/**
 * 프리뷰 상태가 아직 유효한지(만료되지 않았는지) 확인한다.
 * REQ-THEME-082
 */
export function isPreviewValid(state: PreviewState, now: Date = new Date()): boolean {
  if (!state.active) {
    return false;
  }

  if (state.expiresAt === undefined) {
    return false;
  }

  return state.expiresAt.getTime() > now.getTime();
}

/**
 * 새로운 프리뷰 상태를 생성한다.
 * REQ-THEME-080
 */
export function createPreviewState(themeName: string, now: Date = new Date()): PreviewState {
  return {
    active: true,
    themeName,
    expiresAt: new Date(now.getTime() + PREVIEW_TTL_MS),
  };
}
