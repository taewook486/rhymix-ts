/**
 * extra-vars-schema.ts — SPEC-CONTENT-001 Slice F
 *
 * 동적 Zod 스키마 생성 + LRU 캐시.
 *
 * @MX:ANCHOR [AUTO]: 동적 Zod 생성의 단일 진입점. fan_in >= 4 (createDocument, updateDocument,
 *                    content.document 라우터, content.extraKeys 라우터 + 향후 search.ts).
 * @MX:REASON: 게시판 별로 다른 Zod 스키마를 런타임에 빌드한다. 호출 경로가 많으므로
 *             구현 변경 시 전체 검증 흐름에 영향을 준다. SPEC: REQ-CONTENT-121.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-121
 */
import { z } from 'zod';
import type { DocumentExtraKey } from '@prisma/client';
import type { ExtraKeyOptions } from './extra-keys.js';

// ---------------------------------------------------------------------------
// LRU 캐시 (최대 100 entry)
// ---------------------------------------------------------------------------

// Map 기반 간단한 LRU (삽입 순서 보장, 초과 시 가장 오래된 항목 제거)
const SCHEMA_CACHE = new Map<string, z.ZodObject<z.ZodRawShape>>();
const MAX_CACHE = 100;

function buildCacheKey(keys: DocumentExtraKey[]): string {
  const signature = keys.map((k) => [
    k.boardId,
    k.varIdx,
    k.varName,
    k.varType,
    k.varIsRequired,
    JSON.stringify(k.varOptions),
  ]);
  return JSON.stringify(signature);
}

/**
 * boardId 와 연결된 캐시 entry 를 모두 제거한다.
 *
 * @MX:NOTE [AUTO]: createExtraKey / updateExtraKey / deleteExtraKey / reorderExtraKeys
 *                 성공 후 이 함수를 호출해야 stale 스키마를 사용하지 않게 된다.
 */
export function evictExtraVarsSchemaCache(boardId: number): void {
  // boardId 가 signature 의 첫 번째 원소로 포함된 key 를 모두 삭제
  for (const k of [...SCHEMA_CACHE.keys()]) {
    // cacheKey 에 boardId 가 포함되어 있으면 제거
    // 단순하게 boardId 검색: JSON 직렬화 결과에 boardId 숫자가 포함되어 있는지 확인
    if (k.includes(`[${boardId},`)) {
      SCHEMA_CACHE.delete(k);
    }
  }
}

// ---------------------------------------------------------------------------
// buildExtraVarsSchema
// ---------------------------------------------------------------------------

/**
 * DocumentExtraKey 배열로부터 런타임 Zod ZodObject 를 생성한다.
 *
 * - 빈 keys → z.object({}).strict()
 * - 캐시 hit → 캐시에서 반환 (동일 인스턴스)
 * - 캐시 miss → 빌드 후 LRU 캐시에 저장
 * - 알 수 없는 키 거부 (.strict() 적용)
 */
export function buildExtraVarsSchema(
  keys: DocumentExtraKey[],
): z.ZodObject<z.ZodRawShape> {
  const cacheKey = buildCacheKey(keys);

  const cached = SCHEMA_CACHE.get(cacheKey);
  if (cached) {
    // LRU: 최근 사용으로 갱신 (delete → set)
    SCHEMA_CACHE.delete(cacheKey);
    SCHEMA_CACHE.set(cacheKey, cached);
    return cached;
  }

  // 빈 keys
  if (keys.length === 0) {
    const schema = z.object({}).strict();
    setCacheEntry(cacheKey, schema);
    return schema;
  }

  // 각 key 의 varType 에 따른 Zod 타입 빌드
  const shape: z.ZodRawShape = {};

  for (const key of keys) {
    const opts = key.varOptions as ExtraKeyOptions | null;
    let field: z.ZodTypeAny = buildFieldType(key.varType, opts);

    // required=false → optional + optional default
    if (!key.varIsRequired) {
      // defaultValue 가 있으면 .default() 적용
      if (opts?.defaultValue !== undefined && opts.defaultValue !== null) {
        const defaultVal = parseDefaultValue(key.varType, opts.defaultValue);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        field = (field as z.ZodTypeAny).optional().default(defaultVal as any);
      } else {
        field = field.optional();
      }
    }

    shape[key.varName] = field;
  }

  const schema = z.object(shape).strict();
  setCacheEntry(cacheKey, schema);
  return schema;
}

// ---------------------------------------------------------------------------
// 내부 헬퍼
// ---------------------------------------------------------------------------

function buildFieldType(varType: string, opts: ExtraKeyOptions | null): z.ZodTypeAny {
  switch (varType) {
    case 'text':
      return z.string().max(500);

    case 'textarea':
      return z.string().max(5000);

    case 'number': {
      let num = z.coerce.number();
      if (opts?.min !== undefined) num = num.min(opts.min);
      if (opts?.max !== undefined) num = num.max(opts.max);
      return num;
    }

    case 'select': {
      const optionValues = (opts?.options ?? []).map((o) => o.value) as [string, ...string[]];
      if (optionValues.length === 0) return z.string();
      return z.enum(optionValues);
    }

    case 'checkbox': {
      const optionValues = (opts?.options ?? []).map((o) => o.value) as [string, ...string[]];
      if (optionValues.length === 0) return z.array(z.string());
      return z.array(z.enum(optionValues));
    }

    case 'date':
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD format');

    case 'email':
      return z.string().email();

    case 'url':
      return z.string().url();

    default:
      return z.string();
  }
}

function parseDefaultValue(varType: string, defaultValue: string): unknown {
  switch (varType) {
    case 'number':
      return Number(defaultValue);
    case 'checkbox':
      try { return JSON.parse(defaultValue); } catch { return []; }
    default:
      return defaultValue;
  }
}

function setCacheEntry(key: string, schema: z.ZodObject<z.ZodRawShape>): void {
  // LRU 용량 초과 시 가장 오래된 항목 제거
  if (SCHEMA_CACHE.size >= MAX_CACHE) {
    const oldestKey = SCHEMA_CACHE.keys().next().value;
    if (oldestKey) SCHEMA_CACHE.delete(oldestKey);
  }
  SCHEMA_CACHE.set(key, schema);
}
