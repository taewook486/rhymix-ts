import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// SPEC-CAPTCHA-001: Dialog 컴포넌트를 루트 배럴에서도 노출 (TermsConsent가 '@rhymix-ts/ui'에서 직접 import).
export * from './components/dialog'
