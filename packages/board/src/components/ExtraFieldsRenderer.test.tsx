/**
 * packages/board/src/components/ExtraFieldsRenderer.test.tsx — SPEC-CONTENT-001 Slice F
 *
 * U-1 ~ U-7: ExtraFieldsRenderer 렌더 검증.
 *
 * @MX:TODO [AUTO]: Slice G+ 에서 react-hook-form / conditional fields / a11y label association 강화 검토
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-120
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);

// DOM을 각 테스트 후 정리 (globals: false 환경에서 autoCleanup 비활성)
afterEach(() => { cleanup(); });

// DocumentExtraKey mock helper
function makeKey(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    boardId: 10,
    varIdx: 0,
    varName: 'testField',
    varType: 'text',
    varIsRequired: false,
    varSearch: false,
    varSort: false,
    varOptions: null,
    langCode: 'ko',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// U-1: text/textarea 렌더
// ---------------------------------------------------------------------------

describe('ExtraFieldsRenderer — text/textarea', () => {
  it('U-1a: text 키 → <input type="text"> 렌더 + label', async () => {
    const { ExtraFieldsRenderer } = await import('./ExtraFieldsRenderer.js');
    const keys = [makeKey({ varName: 'myField', varType: 'text', varOptions: { label: '내 필드' } })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ExtraFieldsRenderer keys={keys as any} />);

    const input = document.querySelector('input[name="extraVars[myField]"]');
    expect(input).toBeTruthy();
    expect(input?.getAttribute('type')).toBe('text');
    // label 또는 필드 이름이 렌더됨
    expect(document.body.textContent).toContain('내 필드');
  });

  it('U-1b: textarea 키 → <textarea> 렌더', async () => {
    const { ExtraFieldsRenderer } = await import('./ExtraFieldsRenderer.js');
    const keys = [makeKey({ varName: 'description', varType: 'textarea', varOptions: { label: '설명' } })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ExtraFieldsRenderer keys={keys as any} />);

    const textarea = document.querySelector('textarea[name="extraVars[description]"]');
    expect(textarea).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// U-2: number + min/max 속성
// ---------------------------------------------------------------------------

describe('ExtraFieldsRenderer — number', () => {
  it('U-2: number 키 + min/max → <input type="number" min max> 속성 검증', async () => {
    const { ExtraFieldsRenderer } = await import('./ExtraFieldsRenderer.js');
    const keys = [makeKey({
      varName: 'price',
      varType: 'number',
      varOptions: { label: '가격', min: 0, max: 100000 },
    })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ExtraFieldsRenderer keys={keys as any} />);

    const input = document.querySelector('input[name="extraVars[price]"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input?.type).toBe('number');
    expect(input?.getAttribute('min')).toBe('0');
    expect(input?.getAttribute('max')).toBe('100000');
  });
});

// ---------------------------------------------------------------------------
// U-3: select + options
// ---------------------------------------------------------------------------

describe('ExtraFieldsRenderer — select', () => {
  it('U-3: select + options → <select> 안에 <option> 목록', async () => {
    const { ExtraFieldsRenderer } = await import('./ExtraFieldsRenderer.js');
    const keys = [makeKey({
      varName: 'rating',
      varType: 'select',
      varOptions: {
        label: '별점',
        options: [{ value: '1', label: '★' }, { value: '5', label: '★★★★★' }],
      },
    })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ExtraFieldsRenderer keys={keys as any} />);

    const select = document.querySelector('select[name="extraVars[rating]"]') as HTMLSelectElement;
    expect(select).toBeTruthy();
    const options = select.querySelectorAll('option');
    expect(options.length).toBeGreaterThanOrEqual(2);
    const values = Array.from(options).map((o) => o.value);
    expect(values).toContain('1');
    expect(values).toContain('5');
  });
});

// ---------------------------------------------------------------------------
// U-4: checkbox + options
// ---------------------------------------------------------------------------

describe('ExtraFieldsRenderer — checkbox', () => {
  it('U-4: checkbox + options → 각 option 별 <input type="checkbox"> + name="extraVars[xxx][]"', async () => {
    const { ExtraFieldsRenderer } = await import('./ExtraFieldsRenderer.js');
    const keys = [makeKey({
      varName: 'tags',
      varType: 'checkbox',
      varOptions: {
        label: '태그',
        options: [{ value: 'a', label: 'Tag A' }, { value: 'b', label: 'Tag B' }],
      },
    })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ExtraFieldsRenderer keys={keys as any} />);

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
    // name 은 extraVars[tags][] 형태
    checkboxes.forEach((cb) => {
      expect(cb.getAttribute('name')).toBe('extraVars[tags][]');
    });
    const values = Array.from(checkboxes).map((cb) => cb.getAttribute('value'));
    expect(values).toContain('a');
    expect(values).toContain('b');
  });
});

// ---------------------------------------------------------------------------
// U-5: date/email/url → 해당 type 속성
// ---------------------------------------------------------------------------

describe('ExtraFieldsRenderer — date/email/url', () => {
  it('U-5: date 키 → <input type="date">', async () => {
    const { ExtraFieldsRenderer } = await import('./ExtraFieldsRenderer.js');
    const keys = [makeKey({ varName: 'eventDate', varType: 'date' })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ExtraFieldsRenderer keys={keys as any} />);

    const input = document.querySelector('input[name="extraVars[eventDate]"]') as HTMLInputElement;
    expect(input?.type).toBe('date');
  });

  it('U-5b: email 키 → <input type="email">', async () => {
    const { ExtraFieldsRenderer } = await import('./ExtraFieldsRenderer.js');
    const keys = [makeKey({ varName: 'contactEmail', varType: 'email' })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ExtraFieldsRenderer keys={keys as any} />);

    const input = document.querySelector('input[name="extraVars[contactEmail]"]') as HTMLInputElement;
    expect(input?.type).toBe('email');
  });

  it('U-5c: url 키 → <input type="url">', async () => {
    const { ExtraFieldsRenderer } = await import('./ExtraFieldsRenderer.js');
    const keys = [makeKey({ varName: 'website', varType: 'url' })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ExtraFieldsRenderer keys={keys as any} />);

    const input = document.querySelector('input[name="extraVars[website]"]') as HTMLInputElement;
    expect(input?.type).toBe('url');
  });
});

// ---------------------------------------------------------------------------
// U-6: required=true → input 의 required 속성
// ---------------------------------------------------------------------------

describe('ExtraFieldsRenderer — required', () => {
  it('U-6: required=true → input required 속성 존재', async () => {
    const { ExtraFieldsRenderer } = await import('./ExtraFieldsRenderer.js');
    const keys = [makeKey({ varName: 'price', varType: 'number', varIsRequired: true })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ExtraFieldsRenderer keys={keys as any} />);

    const input = document.querySelector('input[name="extraVars[price]"]') as HTMLInputElement;
    expect(input?.required).toBe(true);
  });

  it('U-6b: required=false → required 속성 없음', async () => {
    const { ExtraFieldsRenderer } = await import('./ExtraFieldsRenderer.js');
    const keys = [makeKey({ varName: 'optionalField', varType: 'text', varIsRequired: false })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ExtraFieldsRenderer keys={keys as any} />);

    const input = document.querySelector('input[name="extraVars[optionalField]"]') as HTMLInputElement;
    expect(input?.required).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// U-7: defaultValue → input 의 defaultValue 적용
// ---------------------------------------------------------------------------

describe('ExtraFieldsRenderer — defaultValue', () => {
  it('U-7: text 키 + defaultValue → input 의 value 속성에 반영', async () => {
    const { ExtraFieldsRenderer } = await import('./ExtraFieldsRenderer.js');
    const keys = [makeKey({
      varName: 'region',
      varType: 'text',
      varOptions: { defaultValue: '서울' },
    })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ExtraFieldsRenderer keys={keys as any} />);

    const input = document.querySelector('input[name="extraVars[region]"]') as HTMLInputElement;
    // defaultValue 가 렌더에 반영되어야 함
    expect(input?.defaultValue).toBe('서울');
  });
});
