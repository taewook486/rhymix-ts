/**
 * packages/board/src/extra-vars-schema.test.ts — SPEC-CONTENT-001 Slice F
 *
 * DZ-1 ~ DZ-10: 동적 Zod 스키마 생성 + LRU 캐시 검증.
 *
 * REQ-CONTENT-121: 런타임 Zod 검증.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// 헬퍼 — DocumentExtraKey mock 빌더
// ---------------------------------------------------------------------------

function makeKey(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    boardId: 10,
    varIdx: 0,
    varName: 'testField',
    varType: 'text',
    varIsRequired: true,
    varSearch: false,
    varSort: false,
    varOptions: null,
    langCode: 'ko',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// DZ-1: text 타입
// ---------------------------------------------------------------------------

describe('buildExtraVarsSchema — text 타입', () => {
  it('DZ-1: text 1개 → parse({ testField: "foo" }) 통과', async () => {
    const { buildExtraVarsSchema } = await import('./extra-vars-schema.js');
    const keys = [makeKey({ varName: 'testField', varType: 'text' })];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildExtraVarsSchema(keys as any);
    expect(() => schema.parse({ testField: 'foo' })).not.toThrow();
  });

  it('DZ-1b: text 타입 숫자 입력 → ZodError (string 요구)', async () => {
    const { buildExtraVarsSchema } = await import('./extra-vars-schema.js');
    const keys = [makeKey({ varName: 'testField', varType: 'text', varIsRequired: true })];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildExtraVarsSchema(keys as any);
    expect(() => schema.parse({ testField: 123 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DZ-2: number + min/max
// ---------------------------------------------------------------------------

describe('buildExtraVarsSchema — number 타입', () => {
  it('DZ-2: number + min=0 max=100 → in-range 통과, out-of-range ZodError', async () => {
    const { buildExtraVarsSchema } = await import('./extra-vars-schema.js');
    const keys = [makeKey({
      varName: 'price',
      varType: 'number',
      varOptions: { min: 0, max: 100 },
    })];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildExtraVarsSchema(keys as any);

    // 정상 범위
    expect(() => schema.parse({ price: 50 })).not.toThrow();
    // 초과
    expect(() => schema.parse({ price: 150 })).toThrow();
    // 미만
    expect(() => schema.parse({ price: -1 })).toThrow();
  });

  it('DZ-2b: number 타입 — 문자열 숫자는 coerce 로 변환', async () => {
    const { buildExtraVarsSchema } = await import('./extra-vars-schema.js');
    const keys = [makeKey({ varName: 'price', varType: 'number' })];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildExtraVarsSchema(keys as any);
    // z.coerce.number() 는 "50" → 50 으로 변환
    const result = schema.parse({ price: '50' });
    expect(typeof result.price).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// DZ-3: select + options
// ---------------------------------------------------------------------------

describe('buildExtraVarsSchema — select 타입', () => {
  it('DZ-3: select + options → 유효 value 통과, 알 수 없는 value ZodError', async () => {
    const { buildExtraVarsSchema } = await import('./extra-vars-schema.js');
    const keys = [makeKey({
      varName: 'rating',
      varType: 'select',
      varOptions: { options: [{ value: '1', label: '별1' }, { value: '5', label: '별5' }] },
    })];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildExtraVarsSchema(keys as any);

    expect(() => schema.parse({ rating: '1' })).not.toThrow();
    expect(() => schema.parse({ rating: '5' })).not.toThrow();
    expect(() => schema.parse({ rating: '3' })).toThrow(); // 정의에 없는 값
  });
});

// ---------------------------------------------------------------------------
// DZ-4: checkbox (multi) → array
// ---------------------------------------------------------------------------

describe('buildExtraVarsSchema — checkbox 타입', () => {
  it('DZ-4: checkbox → array 통과, 빈 배열도 통과', async () => {
    const { buildExtraVarsSchema } = await import('./extra-vars-schema.js');
    const keys = [makeKey({
      varName: 'tags',
      varType: 'checkbox',
      varOptions: { options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
    })];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildExtraVarsSchema(keys as any);

    expect(() => schema.parse({ tags: ['a', 'b'] })).not.toThrow();
    expect(() => schema.parse({ tags: [] })).not.toThrow();
    expect(() => schema.parse({ tags: ['a'] })).not.toThrow();
    // 정의에 없는 값
    expect(() => schema.parse({ tags: ['x'] })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DZ-5: required=true + 누락 → ZodError
// ---------------------------------------------------------------------------

describe('buildExtraVarsSchema — required', () => {
  it('DZ-5: required=true + 필드 누락 → ZodError', async () => {
    const { buildExtraVarsSchema } = await import('./extra-vars-schema.js');
    const keys = [makeKey({ varName: 'price', varType: 'number', varIsRequired: true })];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildExtraVarsSchema(keys as any);
    expect(() => schema.parse({})).toThrow();
  });

  // ---------------------------------------------------------------------------
  // DZ-6: required=false + 누락 → 통과
  // ---------------------------------------------------------------------------

  it('DZ-6: required=false + 필드 누락 → 통과', async () => {
    const { buildExtraVarsSchema } = await import('./extra-vars-schema.js');
    const keys = [makeKey({ varName: 'price', varType: 'number', varIsRequired: false })];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildExtraVarsSchema(keys as any);
    expect(() => schema.parse({})).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// DZ-7: defaultValue 있고 input 누락 → output 에 default 포함
// ---------------------------------------------------------------------------

describe('buildExtraVarsSchema — defaultValue', () => {
  it('DZ-7: defaultValue 있고 input 누락 → output 에 default 값 포함', async () => {
    const { buildExtraVarsSchema } = await import('./extra-vars-schema.js');
    const keys = [makeKey({
      varName: 'region',
      varType: 'text',
      varIsRequired: false,
      varOptions: { defaultValue: '서울' },
    })];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildExtraVarsSchema(keys as any);
    const result = schema.parse({});
    expect(result.region).toBe('서울');
  });
});

// ---------------------------------------------------------------------------
// DZ-8: 캐시 hit — 동일 keys 두 번 호출 시 동일 ZodObject 인스턴스
// ---------------------------------------------------------------------------

describe('buildExtraVarsSchema — 캐시', () => {
  beforeEach(async () => {
    // 각 테스트 전 캐시 클리어
    const { evictExtraVarsSchemaCache } = await import('./extra-vars-schema.js');
    evictExtraVarsSchemaCache(10);
  });

  it('DZ-8: 동일 keys 두 번 호출 → 동일 인스턴스 반환 (캐시 hit)', async () => {
    const { buildExtraVarsSchema } = await import('./extra-vars-schema.js');
    const keys = [makeKey({ varName: 'field1', varType: 'text' })];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema1 = buildExtraVarsSchema(keys as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema2 = buildExtraVarsSchema(keys as any);
    expect(schema1).toBe(schema2); // 동일 인스턴스
  });

  // ---------------------------------------------------------------------------
  // DZ-9: 캐시 evict
  // ---------------------------------------------------------------------------

  it('DZ-9: evictExtraVarsSchemaCache(boardId) 후 새 인스턴스 빌드', async () => {
    const { buildExtraVarsSchema, evictExtraVarsSchemaCache } = await import('./extra-vars-schema.js');
    const keys = [makeKey({ varName: 'field1', varType: 'text' })];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema1 = buildExtraVarsSchema(keys as any);

    evictExtraVarsSchemaCache(10); // boardId 10 캐시 evict

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema2 = buildExtraVarsSchema(keys as any);
    expect(schema1).not.toBe(schema2); // 새 인스턴스
  });
});

// ---------------------------------------------------------------------------
// DZ-10: strict 모드 — 알 수 없는 키 거부
// ---------------------------------------------------------------------------

describe('buildExtraVarsSchema — strict 모드', () => {
  it('DZ-10: 정의에 없는 키 포함 → ZodError', async () => {
    const { buildExtraVarsSchema, evictExtraVarsSchemaCache } = await import('./extra-vars-schema.js');
    evictExtraVarsSchemaCache(10);

    const keys = [makeKey({ varName: 'price', varType: 'number', varIsRequired: true })];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildExtraVarsSchema(keys as any);
    // 'unknownKey' 는 정의에 없음 → strict() 모드이므로 ZodError
    expect(() => schema.parse({ price: 100, unknownKey: 'x' })).toThrow();
  });

  it('DZ-10b: 빈 keys → z.object({}).strict() → 빈 object parse 통과', async () => {
    const { buildExtraVarsSchema, evictExtraVarsSchemaCache } = await import('./extra-vars-schema.js');
    evictExtraVarsSchemaCache(10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildExtraVarsSchema([] as any);
    expect(() => schema.parse({})).not.toThrow();
    // 빈 keys 인데 키가 있으면 strict 에러
    expect(() => schema.parse({ foo: 'bar' })).toThrow();
  });
});
