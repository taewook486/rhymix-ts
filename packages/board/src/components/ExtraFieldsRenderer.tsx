/**
 * ExtraFieldsRenderer.tsx — SPEC-CONTENT-001 Slice F
 *
 * 게시판 커스텀 필드(DocumentExtraKey) 를 네이티브 HTML 입력 요소로 렌더한다.
 * React Server Component (no 'use client' directive) — react-hook-form 미사용.
 *
 * @MX:NOTE [AUTO]: Slice G+ 에서 react-hook-form / conditional fields / a11y label association 강화 검토.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-120
 */
import React from 'react';
import type { DocumentExtraKey } from '@prisma/client';
import type { ExtraKeyOptions } from '../extra-keys';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ExtraFieldsRendererProps {
  keys: DocumentExtraKey[];
  /** 현재 값 (편집 모드 초기값). 미전달 시 defaultValue 만 적용. */
  values?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// ExtraFieldsRenderer
// ---------------------------------------------------------------------------

/**
 * DocumentExtraKey 배열을 이터레이트하여 각 타입에 맞는 HTML 입력 요소를 렌더한다.
 *
 * - 체크박스: name="extraVars[{varName}][]" (배열 형식)
 * - 그 외: name="extraVars[{varName}]"
 * - varIsRequired=true → required 속성 추가
 * - varOptions.defaultValue 있으면 defaultValue 속성으로 적용
 */
export function ExtraFieldsRenderer({ keys, values = {} }: ExtraFieldsRendererProps): React.ReactElement {
  return (
    <div className="extra-fields">
      {keys.map((key) => {
        const opts = key.varOptions as ExtraKeyOptions | null;
        const label = opts?.label ?? key.varName;
        const fieldName = `extraVars[${key.varName}]`;
        const currentValue = values[key.varName];

        return (
          <div key={key.id} className="extra-field">
            <label htmlFor={`extra-${key.varName}`}>{label}</label>
            {renderField(key, opts, fieldName, currentValue)}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 내부 렌더 헬퍼
// ---------------------------------------------------------------------------

function renderField(
  key: DocumentExtraKey,
  opts: ExtraKeyOptions | null,
  fieldName: string,
  currentValue: unknown,
): React.ReactElement {
  const required = key.varIsRequired;
  const defaultValue = opts?.defaultValue ?? undefined;

  switch (key.varType) {
    case 'text':
      return (
        <input
          id={`extra-${key.varName}`}
          type="text"
          name={fieldName}
          required={required}
          defaultValue={
            currentValue !== undefined
              ? String(currentValue)
              : defaultValue ?? undefined
          }
          placeholder={opts?.placeholder}
          maxLength={500}
        />
      );

    case 'textarea':
      return (
        <textarea
          id={`extra-${key.varName}`}
          name={fieldName}
          required={required}
          defaultValue={
            currentValue !== undefined
              ? String(currentValue)
              : defaultValue ?? undefined
          }
          placeholder={opts?.placeholder}
          maxLength={5000}
        />
      );

    case 'number':
      return (
        <input
          id={`extra-${key.varName}`}
          type="number"
          name={fieldName}
          required={required}
          defaultValue={
            currentValue !== undefined
              ? String(currentValue)
              : defaultValue ?? undefined
          }
          min={opts?.min !== undefined ? String(opts.min) : undefined}
          max={opts?.max !== undefined ? String(opts.max) : undefined}
          step={opts?.step !== undefined ? String(opts.step) : undefined}
        />
      );

    case 'select': {
      const options = opts?.options ?? [];
      return (
        <select
          id={`extra-${key.varName}`}
          name={fieldName}
          required={required}
          defaultValue={
            currentValue !== undefined
              ? String(currentValue)
              : defaultValue ?? undefined
          }
        >
          {!required && <option value="">-- 선택 --</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    case 'checkbox': {
      const options = opts?.options ?? [];
      const checkedValues = Array.isArray(currentValue)
        ? (currentValue as string[])
        : defaultValue
          ? (() => { try { return JSON.parse(defaultValue); } catch { return []; } })()
          : [];

      return (
        <div id={`extra-${key.varName}`} className="checkbox-group">
          {options.map((o) => (
            <label key={o.value}>
              <input
                type="checkbox"
                name={`extraVars[${key.varName}][]`}
                value={o.value}
                defaultChecked={checkedValues.includes(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      );
    }

    case 'date':
      return (
        <input
          id={`extra-${key.varName}`}
          type="date"
          name={fieldName}
          required={required}
          defaultValue={
            currentValue !== undefined
              ? String(currentValue)
              : defaultValue ?? undefined
          }
        />
      );

    case 'email':
      return (
        <input
          id={`extra-${key.varName}`}
          type="email"
          name={fieldName}
          required={required}
          defaultValue={
            currentValue !== undefined
              ? String(currentValue)
              : defaultValue ?? undefined
          }
          placeholder={opts?.placeholder}
        />
      );

    case 'url':
      return (
        <input
          id={`extra-${key.varName}`}
          type="url"
          name={fieldName}
          required={required}
          defaultValue={
            currentValue !== undefined
              ? String(currentValue)
              : defaultValue ?? undefined
          }
          placeholder={opts?.placeholder}
        />
      );

    default:
      return (
        <input
          id={`extra-${key.varName}`}
          type="text"
          name={fieldName}
          required={required}
          defaultValue={defaultValue ?? undefined}
        />
      );
  }
}
