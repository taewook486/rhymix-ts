/**
 * token-form-builder.ts
 *
 * Zod 스키마를 introspection 하여 react-hook-form과 호환되는 폼 필드
 * 디스크립터 리스트를 생성하는 유틸리티.
 *
 * SPEC-THEME-POLISH-001 Section 2.3 (REQ-THEME-POLISH-020~029) 및 Section 5.4.
 * 폼 필드 타입 매핑:
 * - z.string() + 이름이 color 관련 → color picker
 * - z.string() 그 외 → text input
 * - z.number() → number input (min/max)
 * - z.object() → group field (재귀)
 */

import type { ZodTypeAny, ZodObject, ZodString, ZodNumber } from 'zod';
import { z } from 'zod';

export type FieldType = 'color' | 'text' | 'number' | 'group';

export interface FormField {
  name: string; // dot-notation path, e.g. "colors.primary"
  label: string; // human-readable label
  type: FieldType;
  min?: number; // number fields only
  max?: number; // number fields only
  children?: FormField[]; // group fields only
}

// @MX:NOTE: [AUTO] 필드 이름이 이 Set에 포함되면 color picker로 처리
// SPEC-THEME-POLISH-001 Section 5.4 기반 color field 이름 목록
const COLOR_FIELD_NAMES = new Set([
  'primary',
  'background',
  'foreground',
  'accent',
  'surface',
  'text',
  'border',
  'ring',
  // 일반적인 color 토큰 이름 패턴
]);

/**
 * Zod 스키마를 분석하여 FormField 배열을 생성.
 *
 * @param schema - ZodObject 스키마
 * @param prefix - 중첩 경로 접두사 (재귀 호출용)
 * @returns FormField 배열
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   colors: z.object({
 *     primary: z.string(),
 *   }),
 *   spacing: z.object({
 *     unit: z.number().min(1).max(16),
 *   }),
 * });
 *
 * const fields = buildFormFields(schema);
 * // [
 * //   { name: 'colors', type: 'group', children: [
 * //     { name: 'colors.primary', type: 'color', label: 'Primary' }
 * //   ]},
 * //   { name: 'spacing', type: 'group', children: [
 * //     { name: 'spacing.unit', type: 'number', min: 1, max: 16, label: 'Unit' }
 * //   ]}
 * // ]
 * ```
 */
export function buildFormFields(
  schema: ZodObject<any>,
  prefix: string = '',
): FormField[] {
  const fields: FormField[] = [];
  const shape = schema.shape;

  for (const [key, zodType] of Object.entries(shape)) {
    const fieldName = prefix ? `${prefix}.${key}` : key;
    const label = toTitleCase(key);

    // ZodObject → group field (재귀)
    if (zodType instanceof z.ZodObject) {
      const children = buildFormFields(zodType, fieldName);
      fields.push({
        name: fieldName,
        label,
        type: 'group',
        children,
      });
      continue;
    }

    // ZodString → color 또는 text
    if (zodType instanceof z.ZodString) {
      const isColorField = COLOR_FIELD_NAMES.has(key);
      fields.push({
        name: fieldName,
        label,
        type: isColorField ? 'color' : 'text',
      });
      continue;
    }

    // ZodNumber → number (min/max 추출)
    if (zodType instanceof z.ZodNumber) {
      let min: number | undefined;
      let max: number | undefined;

      // @MX:NOTE: [AUTO] ZodNumber의 min/max 제약 조건을 추출
      // 내부 _def checks 배열에서 min/max 값을 찾음
      const checks = (zodType as any)._def.checks || [];
      for (const check of checks) {
        if (check.kind === 'min') min = check.value;
        if (check.kind === 'max') max = check.value;
      }

      fields.push({
        name: fieldName,
        label,
        type: 'number',
        min,
        max,
      });
      continue;
    }

    // 지원하지 않는 타입은 스킵 (ZodOptional, ZodNullable 등)
    // 실제로는 themeTokensSchema가 flat한 object만 사용하므로 문제 없음
  }

  return fields;
}

/**
 * kebab-case, snake_case, camelCase를 Title Case로 변환.
 *
 * @param input - "font-family-base" → "Font Family Base"
 * @returns Title Case 라벨
 */
function toTitleCase(input: string): string {
  // 1. snake_case → 공백으로 분리
  // 2. kebab-case → 공백으로 분리
  // 3. camelCase → 대문자 앞에 공백 삽입
  let words = input
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean);

  // 각 단어를 Title Case로 변환
  words = words.map((word) => {
    if (word.length === 0) return '';
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  });

  return words.join(' ');
}
