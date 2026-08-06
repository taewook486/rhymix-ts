/**
 * token-form-builder.test.ts
 *
 * TDD 단위 테스트 — Zod 스키마를 폼 필드 디스크립터로 변환하는 유틸리티.
 * SPEC-THEME-POLISH-001 Section 2.3 (REQ-THEME-POLISH-020~029) 및 Section 5.4.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { buildFormFields, type FormField } from './token-form-builder';

describe('token-form-builder', () => {
  describe('buildFormFields 기본 동작', () => {
    it('ZodObject → FormField[] 변환 (flat structure)', () => {
      const schema = z.object({
        primary: z.string(), // COLOR_FIELD_NAMES에 포함 → color picker
        description: z.string(), // 일반 텍스트
        count: z.number(),
      });

      const fields = buildFormFields(schema);

      expect(fields).toHaveLength(3);
      expect(fields[0]).toMatchObject({
        name: 'primary',
        type: 'color', // primary는 color field
        label: 'Primary',
      });
      expect(fields[1]).toMatchObject({
        name: 'description',
        type: 'text',
        label: 'Description',
      });
      expect(fields[2]).toMatchObject({
        name: 'count',
        type: 'number',
        label: 'Count',
      });
    });

    it('필드 이름이 COLOR_FIELD_NAMES에 포함되면 color picker로 감지', () => {
      const schema = z.object({
        primary: z.string(),
        background: z.string(),
        description: z.string(),
      });

      const fields = buildFormFields(schema);

      expect(fields[0]!.type).toBe('color');
      expect(fields[1]!.type).toBe('color');
      expect(fields[2]!.type).toBe('text');
    });

    it('ZodNumber의 min/max 제약을 FormField min/max로 변환', () => {
      const schema = z.object({
        value: z.number().min(0).max(100),
        unlimited: z.number(),
      });

      const fields = buildFormFields(schema);

      expect(fields[0]).toMatchObject({
        name: 'value',
        type: 'number',
        min: 0,
        max: 100,
      });
      expect(fields[1]).toMatchObject({
        name: 'unlimited',
        type: 'number',
        min: undefined,
        max: undefined,
      });
    });
  });

  describe('nested object (group field) 처리', () => {
    it('z.object() → group field 재귀 처리', () => {
      const schema = z.object({
        colors: z.object({
          primary: z.string(), // COLOR_FIELD_NAMES → color
          background: z.string(), // COLOR_FIELD_NAMES → color
        }),
        spacing: z.object({
          unit: z.number().min(1).max(16),
        }),
      });

      const fields = buildFormFields(schema);

      expect(fields).toHaveLength(2);

      // colors group
      expect(fields[0]).toMatchObject({
        name: 'colors',
        type: 'group',
        label: 'Colors',
        children: [
          { name: 'colors.primary', type: 'color' },
          { name: 'colors.background', type: 'color' },
        ],
      });

      // spacing group
      expect(fields[1]).toMatchObject({
        name: 'spacing',
        type: 'group',
        label: 'Spacing',
        children: [
          { name: 'spacing.unit', type: 'number', min: 1, max: 16 },
        ],
      });
    });

    it('nested object 내부에서도 color field 감지', () => {
      const schema = z.object({
        theme: z.object({
          primary: z.string(), // color
          description: z.string(), // text (not in COLOR_FIELD_NAMES)
        }),
      });

      const fields = buildFormFields(schema);
      const themeGroup = fields[0]!;

      expect(themeGroup.type).toBe('group');
      expect(themeGroup.children).toHaveLength(2);
      expect(themeGroup.children![0]!.type).toBe('color');
      expect(themeGroup.children![1]!.type).toBe('text');
    });
  });

  describe('prefix 매개변수 (nested path)', () => {
    it('prefix + key 조합으로 name 생성', () => {
      const schema = z.object({
        primary: z.string(),
      });

      const fields = buildFormFields(schema, 'colors');

      expect(fields[0]!.name).toBe('colors.primary');
    });

    it('nested group에서 prefix 누적', () => {
      const schema = z.object({
        colors: z.object({
          primary: z.string(),
        }),
      });

      const fields = buildFormFields(schema, 'theme');

      expect(fields[0]!.name).toBe('theme.colors');
      expect(fields[0]!.children![0]!.name).toBe('theme.colors.primary');
    });
  });

  describe('label 자동 생성 (kebab-case → Title Case)', () => {
    it('snake_case → Title Case', () => {
      const schema = z.object({
        font_family_base: z.string(),
      });

      const fields = buildFormFields(schema);
      expect(fields[0]!.label).toBe('Font Family Base');
    });

    it('kebab-case → Title Case', () => {
      const schema = z.object({
        'font-family-base': z.string(),
      });

      const fields = buildFormFields(schema);
      expect(fields[0]!.label).toBe('Font Family Base');
    });

    it('camelCase → 분리하여 Title Case', () => {
      const schema = z.object({
        fontFamilyBase: z.string(),
      });

      const fields = buildFormFields(schema);
      expect(fields[0]!.label).toBe('Font Family Base');
    });
  });
});
