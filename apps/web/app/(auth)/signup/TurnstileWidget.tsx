'use client';

/**
 * Cloudflare Turnstile CAPTCHA 위젯 — SPEC-CAPTCHA-001.
 *
 * Cloudflare Turnstile JavaScript API를 로드하고 위젯을 렌더링한다.
 * 성공 시 토큰을 부모 컴포넌트로 전달한다.
 *
 * Test site key: 1x00000000000000000000AA
 *
 * @MX:NOTE: [AUTO] Turnstile Client Component — Cloudflare JS API wrapper.
 * @MX:SPEC: SPEC-CAPTCHA-001 REQ-CAPTCHA-003, REQ-CAPTCHA-004
 */
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import Script from 'next/script';


export interface TurnstileWidgetProps {
  /** Turnstile Site Key */
  siteKey: string;
  /** 토큰 생성 성공 콜백 */
  onSuccess: (token: string) => void;
  /** 위젯 테마 (기본: light) */
  theme?: 'light' | 'dark';
  /** 위젯 크기 (기본: normal) */
  size?: 'normal' | 'compact';
}

export interface TurnstileWidgetRef {
  /** 위젯 재설정 */
  reset: () => void;
}

/**
 * Cloudflare Turnstile 위젯 컴포넌트.
 *
 * 사용:
 * ```tsx
 * const turnstileRef = useRef<TurnstileWidgetRef>(null);
 * <TurnstileWidget ref={turnstileRef} siteKey="xxx" onSuccess={(token) => setToken(token)} />
 * ```
 */
export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  ({ siteKey, onSuccess, theme = 'light', size = 'normal' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const resetRef = useRef<(() => void) | null>(null);

    // Expose reset function via ref
    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && resetRef.current) {
          resetRef.current();
        }
      },
    }));

    // Initialize Turnstile widget after script loads
    React.useEffect(() => {
      if (!siteKey || typeof window === 'undefined') return;

      const turnstile = window.turnstile;
      if (!turnstile || !containerRef.current) return;

      // Render Turnstile widget
      const widgetId = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size,
        callback: (token: string) => {
          onSuccess(token);
        },
        'error-callback': () => {
          // Turnstile error - token will be null
          onSuccess('');
        },
        'expired-callback': () => {
          // Token expired - trigger reset
          if (widgetIdRef.current) {
            turnstile.reset(widgetIdRef.current);
          }
        },
      });

      widgetIdRef.current = widgetId;
      resetRef.current = () => {
        if (widgetIdRef.current) {
          turnstile.reset(widgetIdRef.current);
        }
      };

      // Cleanup on unmount
      return () => {
        if (widgetIdRef.current) {
          turnstile.remove(widgetIdRef.current);
        }
      };
    }, [siteKey, theme, size, onSuccess]);

    // Don't render if siteKey is empty
    if (!siteKey) {
      return null;
    }

    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
        />
        <div ref={containerRef} />
      </>
    );
  },
);

TurnstileWidget.displayName = 'TurnstileWidget';
