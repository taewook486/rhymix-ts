# SPEC-CONTENT-001 — Slice F 플랜

**Status**: ready
**Methodology**: TDD (RED → GREEN → REFACTOR)
**Base**: main = f939e80 (CONTENT-001 Slice E 완료, 744 tests)
**Depends on**: Slice A (`DocumentExtraKey` 스키마 + `Document.extraVars` Json 컬럼), Slice B (Document CRUD + tRPC `content.document`), Slice C (Board permission 컨텍스트 + `protectedAdminProcedure`)
**Scope**: Custom Fields 단독 — `DocumentExtraKey` 도메인 + 동적 Zod 생성 + `createDocument`/`updateDocument` 검증 통합 + 글쓰기 폼 렌더러
**Spec source**: `.moai/specs/SPEC-CONTENT-001/spec.md` REQ-CONTENT-120, REQ-CONTENT-121, AC-CONTENT-063 (검색은 Slice G 이월)

---

## 1. 목표 (What & Why)

Slice A 가 `DocumentExtraKey` 모델과 `Document.extraVars Json` 컬럼을 정의했지만, 두 가지 핵심 기능이 비어 있다:

1. **정의 CRUD 가 없다** — admin 이 게시판에 "가격(price, number)", "이벤트일자(eventDate, date)", "별점(rating, select 1~5)" 같은 필드를 추가할 방법이 없음. 현재 schema 만 존재.
2. **검증이 없다** — `Document.extraVars Json` 은 글쓰기 시 그냥 패스스루. 잘못된 타입 / 누락된 required / 정의되지 않은 키가 그대로 저장될 수 있음.

Slice F 는 이 두 결손을 닫는다:

- **DocumentExtraKey 도메인** (`extra-keys.ts`) — `list/create/update/delete/reorder` CRUD.
- **동적 Zod 생성** (`extra-vars-schema.ts`) — `buildExtraVarsSchema(keys)`: 게시판의 키 정의 배열을 받아 런타임 Zod ZodObject 를 만든다. 캐시 + 무효화.
- **createDocument/updateDocument 통합** — 글 작성 시 boardId 의 키 정의를 조회 → 동적 Zod 로 `input.extraVars` 검증 → 통과 시 저장.
- **글쓰기 폼 렌더러** (`ExtraFieldsRenderer`) — 게시판 키 정의를 props 로 받아 타입별 input 을 렌더. server-side 에서 키 조회 후 client component 로 props 전달.

이 슬라이스 완료 후, 게시판은 **모듈 인스턴스 단위로 완전 동적 스키마** 를 갖게 된다. spec.md REQ-CONTENT-120/121 충족.

**범위에서 제외 (Heads-up → Slice G)**:
- **검색 통합** (REQ-CONTENT-063 / AC-CONTENT-063 — `extra_vars` GIN 검색): 본 슬라이스는 정의 + 검증 + 폼만. 검색 predicate 통합은 Slice G 의 search.ts 확장으로 이월.
- **react-hook-form / conditional fields / drag-drop reorder UI**: ExtraFieldsRenderer 의 1차 구현은 native `<form>` + `useActionState` 패턴 유지 (Slice B/E 와 일관). 고도화는 Slice G+ 이월.

---

## 2. Pre-Flight Findings

### Q1 — 지원할 필드 타입 목록 (REQ-CONTENT-120 `var_type`)

**spec.md 근거**:
- Domain Model: `DocumentExtraKey.varType String  // text | number | select | checkbox | date | url | email` (schema.prisma 와 일치).
- REQ-CONTENT-120 본문: "field definitions in `DocumentExtraKey` (var_name, var_type, var_is_required, var_search, var_sort, var_options)".
- AC-CONTENT-063 예시: `var_type: "number"`, range 검색.

**결정 — Slice F 지원 7개 타입** (spec.md 명시 목록과 1:1 일치):

| varType | UI input | Zod 매핑 | varOptions 사용 |
|---------|----------|---------|----------------|
| `text` | `<input type="text">` | `z.string()` (max 500 기본) | — |
| `textarea` | `<textarea>` | `z.string()` (max 5000) | — |
| `number` | `<input type="number">` | `z.coerce.number()` + min/max | `{ min?, max?, step? }` |
| `select` | `<select>` | `z.enum([...options])` | `{ options: [{value, label}] }` (필수) |
| `checkbox` | `<input type="checkbox">` (multi) | `z.array(z.enum([...options]))` | `{ options: [{value, label}] }` (필수) |
| `date` | `<input type="date">` | `z.string().regex(YYYY-MM-DD)` 또는 `z.coerce.date()` | — |
| `email` | `<input type="email">` | `z.string().email()` | — |
| `url` | `<input type="url">` | `z.string().url()` | — |

**spec.md 와의 정합 + Slice F 추가 (`textarea`)**: spec.md 본문에는 textarea 명시 없으나 `text` 와 사용성 차이가 큼 (장문 입력 필수). Slice F 는 textarea 를 추가하되 spec.md 목록과 충돌하지 않게 처리 — `varType="textarea"` 는 schema 상 `String` 컬럼에 그대로 저장되므로 마이그레이션 영향 없음. spec.md 본문 미세 갱신은 sync phase 에서 동반.

**미지원 (Slice G 이월 후보)**:
- `multi-select` (단일 select 외) — REQ-CONTENT-120 명시 없음, `checkbox` 다중 선택으로 대체 가능.
- `radio` — `select` 와 의미 중복. 필요 시 UI 토글로 처리 가능.
- `datetime` — `date` + UI 확장. spec.md 명시 없음.

### Q2 — DocumentExtraKey schema 확장 필요 여부

**Slice A 의 현재 필드** (schema.prisma:728~745):
```
id, boardId, varIdx, varName, varType,
varIsRequired Boolean,
varSearch Boolean,    // Slice G 검색용 — Slice F 는 사용하지 않음
varSort Boolean,      // Slice G 정렬용 — Slice F 는 사용하지 않음
varOptions Json?,     // select/checkbox 의 옵션 — Slice F 가 사용
langCode String       // 다국어 — Slice F 는 default "ko" 만 처리
```

**결정 — 본 슬라이스 마이그레이션 불필요**.

근거:
- `varOptions Json?` 이 이미 존재 → select/checkbox 의 `{ options, min, max, ... }` 를 모두 수용 가능.
- `varIsRequired` 가 이미 boolean → required 처리 가능.
- `label`/`defaultValue`/`validation` 같은 추가 필드를 따로 두지 않고 `varOptions` Json 안에 통합 저장:
  ```json
  {
    "label": "가격",
    "defaultValue": "0",
    "min": 0,
    "max": 1000000,
    "options": [{"value": "low", "label": "저가"}, ...]
  }
  ```
- listOrder 는 `varIdx Int` 가 이미 사실상의 정렬 키 역할 — reorder 는 varIdx 재할당.

**varOptions 의 내부 스키마** (TypeScript 측 Zod 로 정의, DB 는 Json):

```ts
// packages/board/src/extra-keys.ts
const ExtraKeyOptionsSchema = z.object({
  label: z.string().min(1).max(80).optional(),         // 폼에 표시될 label (없으면 varName 사용)
  defaultValue: z.string().nullable().optional(),       // 초기값 (문자열로 통일)
  min: z.number().optional(),                           // number 타입의 최솟값
  max: z.number().optional(),                           // number 타입의 최댓값
  step: z.number().optional(),                          // number 타입의 step
  pattern: z.string().optional(),                       // text 타입의 정규식
  options: z.array(z.object({                           // select/checkbox 의 선택지
    value: z.string().min(1),
    label: z.string().min(1),
  })).optional(),
  placeholder: z.string().optional(),
});
```

이 스키마는 `createExtraKey` / `updateExtraKey` 가 varOptions 입력을 받을 때 검증한다.

**Slice G 영향 없음**: `varSearch`/`varSort` 컬럼은 그대로 보존, Slice G 가 search.ts 에서 활용 시작.

### Q3 — 동적 Zod 생성 함수 (REQ-CONTENT-121)

**시그니처**:
```ts
// packages/board/src/extra-vars-schema.ts
export function buildExtraVarsSchema(
  keys: DocumentExtraKey[],
): z.ZodObject<z.ZodRawShape>;
```

**구현 핵심**:
- `keys` 를 순회하며 각 key 의 `varType` + `varOptions` 로 ZodType 을 결정.
- `varIsRequired === false` 면 `.optional()` 래핑.
- defaultValue 가 있으면 `.default(parsedDefault)` 적용.
- 최종 `z.object({ [varName]: ZodType, ... })` 반환.
- **알 수 없는 키 거부** — `.strict()` 적용 → 게시판이 정의하지 않은 키를 글쓰기 input 이 보내면 ZodError.

**캐시 전략** (`buildExtraVarsSchema` 가 호출될 때마다 Zod 재조립은 비용 — 게시글 매번 동작):
- LRU 캐시 (`packages/board/src/extra-vars-schema.ts` 내부 `Map<cacheKey, ZodObject>`).
- `cacheKey = ${boardId}:${maxUpdatedAt}` — 키 정의 변경 시 자동 무효화.
  - `maxUpdatedAt` 은 `DocumentExtraKey` 의 변경 추적이 없으므로 (현재 schema 에 updatedAt 컬럼 없음 — Q2 결정에 따라 추가하지 않음), **cacheKey = `${boardId}:${keys.length}:${JSON.stringify(keys.map(k=>[k.varIdx,k.varType,k.varOptions]))}` 의 hash** 로 대체. content-addressable.
- LRU 최대 100 entry (게시판 수 상한 가정).

**캐시 무효화 시점**:
- `createExtraKey` / `updateExtraKey` / `deleteExtraKey` / `reorderExtraKeys` 호출 후 → 해당 boardId 의 모든 캐시 entry evict.
- 명시적 `evictExtraVarsSchemaCache(boardId)` helper export.

**대안 — 무효화 생략**: content-addressable cacheKey 이므로 키 변경 시 자연스럽게 새 entry 가 생성됨. 옛 entry 는 LRU 로 자동 제거. **결정: explicit evict 도 제공 (테스트 결정성 + 운영 디버깅)**.

### Q4 — createDocument/updateDocument 통합 방식

**현재 시그니처** (document.ts L126~137):
```ts
const CreateDocumentSchema = z.object({
  moduleInstanceId, authorId, title, content, nickName, status, actor, categoryId, tags,
});
```

→ `extraVars` 입력이 없음. Slice F 가 추가.

**결정 — 통합 패턴**:

```ts
// document.ts
const CreateDocumentSchema = z.object({
  // ... 기존 ...
  extraVars: z.record(z.string(), z.unknown()).optional(),  // 1차 unknown — 동적 Zod 가 2차 검증
});

export async function createDocument(input, ctx) {
  const parsed = CreateDocumentSchema.parse(input);
  const board = await ctx.prisma.board.findUniqueOrThrow({ where: { moduleInstanceId } });

  // 권한 검사 (기존) ...

  // ★ Slice F 추가: extraVars 검증
  let validatedExtraVars: Record<string, unknown> = {};
  if (parsed.extraVars !== undefined) {
    const keys = await ctx.prisma.documentExtraKey.findMany({
      where: { boardId: board.id, langCode: 'ko' },
      orderBy: { varIdx: 'asc' },
    });
    if (keys.length === 0 && Object.keys(parsed.extraVars).length > 0) {
      // 게시판에 정의된 키가 없는데 input 이 키를 보냄 → 거부
      throw new ExtraVarsNotConfiguredError(board.id);
    }
    if (keys.length > 0) {
      const schema = buildExtraVarsSchema(keys);
      validatedExtraVars = schema.parse(parsed.extraVars);  // ZodError throw 시 tRPC 가 BAD_REQUEST 매핑
    }
  } else if (await hasRequiredExtraKeys(board.id, ctx.prisma)) {
    // input 에 extraVars 가 없는데 게시판이 required 키를 가짐 → 거부
    throw new ExtraVarsRequiredError(board.id);
  }

  // ... 기존 categoryId 트랜잭션 + create ...
  // create data 에 extraVars: validatedExtraVars 포함
}
```

**`updateDocument` 도 동일 패턴**:
- input 에 `extraVars` 가 있을 때만 검증 + 저장.
- 기존 저장값과 머지 여부는 spec.md 모호 → **Slice F 는 전체 교체** (PATCH semantics 가 아닌 PUT). updateDocument 의 다른 필드들도 동일한 부분 업데이트 패턴이지만 extraVars 만은 "전체 교체" 가 안전 (부분 머지는 required 검증과 충돌).

**트랜잭션 경계**:
- extraVars 검증은 트랜잭션 외부 (read-only — keys 조회 + Zod parse).
- 검증 통과 후 기존 create 트랜잭션 (categoryId 처리) 에 그대로 합류.

**에러 클래스 신규**:
```ts
export class ExtraVarsRequiredError extends Error {
  readonly code = 'EXTRA_VARS_REQUIRED';
  constructor(public readonly boardId: number) {
    super(`Board ${boardId} has required extra keys but extraVars input is missing`);
  }
}
export class ExtraVarsNotConfiguredError extends Error {
  readonly code = 'EXTRA_VARS_NOT_CONFIGURED';
  constructor(public readonly boardId: number) {
    super(`Board ${boardId} has no extra keys defined but extraVars input is non-empty`);
  }
}
// ZodError (extraVars 검증 실패) 는 별도 sentinel 없이 그대로 throw → tRPC BAD_REQUEST 자동 변환
```

### Q5 — Form 렌더러 통합

**현재 글쓰기 폼** (`packages/board/src/routes/write-page.tsx`):
- Server Component. props 로 `action: string` (Server Action URL) 만 받음.
- form 안에 hidden `moduleInstanceId`, `title`, `content` 만 input. 첨부/카테고리/태그/extraVars 모두 미구현.

**결정 — 통합 패턴**:

1. `BoardWritePage` 가 server-side 에서 board 의 extra keys 를 조회:
   ```tsx
   export async function BoardWritePage(props) {
     const board = await ctx.prisma.board.findUnique({ where: { moduleInstanceId: props.instance.id } });
     const extraKeys = await ctx.prisma.documentExtraKey.findMany({
       where: { boardId: board!.id, langCode: 'ko' },
       orderBy: { varIdx: 'asc' },
     });
     return (
       <main>
         <form ...>
           <input name="title" ... />
           <textarea name="content" ... />
           {extraKeys.length > 0 && <ExtraFieldsRenderer keys={extraKeys} />}
           <button type="submit">작성</button>
         </form>
       </main>
     );
   }
   ```

2. `ExtraFieldsRenderer` 는 **Server Component 도 가능** (interactive state 가 없으면) — 본 슬라이스는 native `<input>` + form submit 패턴 유지하므로 client component 불필요.
   - input `name` 은 `extraVars[${varName}]` 형식 (Server Action 측에서 `formData.getAll('extraVars[price]')` 같은 패턴으로 수집).
   - 또는 단일 hidden `extraVarsJson` 으로 client JS 가 직렬화 → server 가 JSON.parse. **결정: 첫 번째 방식 (FormData entry 별 수집) 채택** — JS-free fallback 가능, Slice B/E 의 useActionState 패턴 일관.

3. Server Action (`apps/web/app/[mid]/write/page.tsx` 등) 가 FormData 에서 `extraVars[*]` 키를 모아 객체로 변환 후 tRPC `content.document.create({ extraVars: { ... } })` 호출.

**Slice F 의 폼 입력 → extraVars 매핑 헬퍼**:
```ts
// packages/board/src/extra-vars-form.ts (or 같은 파일)
export function collectExtraVarsFromFormData(
  formData: FormData,
  keys: DocumentExtraKey[],
): Record<string, unknown>;
```
- 각 key 의 `varType` 에 맞춰 FormData 에서 추출 (number 는 string → number 변환, checkbox 는 `getAll`, etc.).
- 변환 자체는 raw — 최종 검증은 도메인의 `buildExtraVarsSchema(...).parse(...)` 가 수행.

**각 타입별 input 렌더 예시** (한국어 코멘트):

```tsx
// ExtraFieldsRenderer.tsx (Server Component)
function ExtraFieldsRenderer({ keys }: { keys: DocumentExtraKey[] }) {
  return (
    <fieldset>
      <legend>추가 정보</legend>
      {keys.map((k) => {
        const opts = k.varOptions as ExtraKeyOptions | null;
        const label = opts?.label ?? k.varName;
        const required = k.varIsRequired;
        const inputName = `extraVars[${k.varName}]`;

        switch (k.varType) {
          case 'text':
            return <input name={inputName} type="text" required={required} defaultValue={opts?.defaultValue ?? ''} />;
          case 'textarea':
            return <textarea name={inputName} required={required} defaultValue={opts?.defaultValue ?? ''} />;
          case 'number':
            return <input name={inputName} type="number" min={opts?.min} max={opts?.max} step={opts?.step} required={required} />;
          case 'select':
            return (
              <select name={inputName} required={required}>
                {opts?.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            );
          case 'checkbox':
            return opts?.options?.map(o => (
              <label key={o.value}>
                <input type="checkbox" name={`${inputName}[]`} value={o.value} />
                {o.label}
              </label>
            ));
          case 'date': return <input name={inputName} type="date" required={required} />;
          case 'email': return <input name={inputName} type="email" required={required} />;
          case 'url': return <input name={inputName} type="url" required={required} />;
        }
      })}
    </fieldset>
  );
}
```

react-hook-form / conditional rendering / drag-drop 은 Slice G+ 이월.

### Q6 — admin tRPC for extra keys 관리

**결정 — admin.content.extraKey CRUD 라우터 신규**:

```
apps/web/server/api/routers/admin/content-extra-key.ts
└── adminContentExtraKeyRouter
    ├── list(boardId)              → DocumentExtraKey[]
    ├── create({ boardId, varName, varType, varIsRequired, varSearch, varSort, varOptions, langCode? })
    ├── update({ id, ...partial })
    ├── delete({ id })
    └── reorder({ boardId, idsInOrder: number[] })  // varIdx 재할당
```

권한: 모든 procedure `protectedAdminProcedure` (Slice C `protectedAdminProcedure` 재사용).

**별도로 content (글쓰기 폼 측) 가 키를 읽을 수 있어야 함**:

```
apps/web/server/api/routers/content/extra-keys.ts
└── contentExtraKeysRouter
    └── list({ boardId })           → DocumentExtraKey[]  (publicProcedure — 익명도 볼 수 있어야 폼 렌더 가능)
```

**기존 admin 라우터 등록** (`apps/web/server/api/routers/admin/index.ts`):
- `import { adminContentExtraKeyRouter } from './content-extra-key';`
- `extraKey: adminContentExtraKeyRouter,`

**기존 content 라우터 등록** (`apps/web/server/api/routers/content/index.ts`):
- `import { contentExtraKeysRouter } from './extra-keys';`
- `extraKeys: contentExtraKeysRouter,`

---

## 3. 구현 파일 목록

### 3.1 packages/board/src/extra-keys.ts (신규)

```ts
import { z } from 'zod';
import type { PrismaClient, DocumentExtraKey } from '@prisma/client';

// ---------- varOptions 내부 스키마 ----------

const ExtraKeyOptionsSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  defaultValue: z.string().nullable().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  pattern: z.string().optional(),
  options: z.array(z.object({
    value: z.string().min(1).max(80),
    label: z.string().min(1).max(80),
  })).optional(),
  placeholder: z.string().max(200).optional(),
}).strict();

export type ExtraKeyOptions = z.infer<typeof ExtraKeyOptionsSchema>;

// ---------- Errors ----------

export class ExtraKeyDuplicateNameError extends Error {
  readonly code = 'EXTRA_KEY_DUPLICATE_NAME';
  constructor(public readonly boardId: number, public readonly varName: string) {
    super(`Extra key '${varName}' already exists on board ${boardId}`);
  }
}

export class ExtraKeyOptionsRequiredError extends Error {
  readonly code = 'EXTRA_KEY_OPTIONS_REQUIRED';
  constructor(public readonly varType: string) {
    super(`varType '${varType}' requires varOptions.options to be defined`);
  }
}

// ---------- listExtraKeys ----------

export async function listExtraKeys(
  input: { boardId: number; langCode?: string },
  ctx: { prisma: PrismaClient },
): Promise<DocumentExtraKey[]>;

// ---------- createExtraKey ----------

const CreateExtraKeySchema = z.object({
  boardId: z.number().int().positive(),
  varName: z.string().min(1).max(50).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),  // JS identifier
  varType: z.enum(['text', 'textarea', 'number', 'select', 'checkbox', 'date', 'email', 'url']),
  varIsRequired: z.boolean().default(false),
  varSearch: z.boolean().default(false),  // Slice G 가 사용
  varSort: z.boolean().default(false),    // Slice G 가 사용
  varOptions: ExtraKeyOptionsSchema.nullable().optional(),
  langCode: z.string().default('ko'),
});

export async function createExtraKey(
  input: z.input<typeof CreateExtraKeySchema>,
  ctx: { prisma: PrismaClient },
): Promise<DocumentExtraKey>;
// 핵심: select/checkbox 면 varOptions.options 필수 검증 → ExtraKeyOptionsRequiredError
//      boardId+varName+langCode 중복 → ExtraKeyDuplicateNameError
//      varIdx 자동 할당 = max(현재 board 의 varIdx) + 1
//      성공 후 evictExtraVarsSchemaCache(boardId)

// ---------- updateExtraKey ----------

export async function updateExtraKey(
  input: { id: number, varName?, varType?, ..., varOptions? },
  ctx: { prisma: PrismaClient },
): Promise<DocumentExtraKey>;
// 핵심: 성공 후 evictExtraVarsSchemaCache(boardId)

// ---------- deleteExtraKey ----------

export async function deleteExtraKey(
  input: { id: number },
  ctx: { prisma: PrismaClient },
): Promise<{ id: number }>;
// 핵심: 성공 후 evictExtraVarsSchemaCache(boardId)
//       기존 Document.extraVars 의 해당 키는 그대로 두고 (단순 삭제) — 향후 cleanup cron 이월 (Heads-up)

// ---------- reorderExtraKeys ----------

export async function reorderExtraKeys(
  input: { boardId: number, idsInOrder: number[] },
  ctx: { prisma: PrismaClient },
): Promise<DocumentExtraKey[]>;
// 핵심: 트랜잭션 내 모든 id 의 varIdx 를 0..N-1 로 재할당. 중복/누락 검출.
//       성공 후 evictExtraVarsSchemaCache(boardId)
```

### 3.2 packages/board/src/extra-keys.test.ts (신규)

**EK-1 ~ EK-7 (도메인)**:

- **EK-1** `createExtraKey` 7개 타입 각각 정상 생성 → row + varIdx 자동 할당.
- **EK-2** 동일 boardId + varName + langCode 중복 → `ExtraKeyDuplicateNameError`.
- **EK-3** `varType: 'select'` + `varOptions.options` 누락 → `ExtraKeyOptionsRequiredError`.
- **EK-4** `updateExtraKey` — label/required/options 부분 업데이트.
- **EK-5** `deleteExtraKey` — row 제거 + 다른 row 영향 없음.
- **EK-6** `reorderExtraKeys` — 5개 키의 순서를 뒤집어 호출 → 모든 varIdx 가 0..4 로 재할당 + listExtraKeys 결과가 새 순서.
- **EK-7** `listExtraKeys(boardId)` — varIdx 오름차순 + langCode 필터.

### 3.3 packages/board/src/extra-vars-schema.ts (신규)

```ts
import { z } from 'zod';
import type { DocumentExtraKey } from '@prisma/client';
import type { ExtraKeyOptions } from './extra-keys.js';

// ---------- LRU cache (최대 100 entry) ----------

const SCHEMA_CACHE = new Map<string, z.ZodObject<z.ZodRawShape>>();
const MAX_CACHE = 100;

function cacheKey(boardId: number, keys: DocumentExtraKey[]): string {
  const signature = keys.map(k => [k.varIdx, k.varName, k.varType, k.varIsRequired, k.varOptions]);
  return `${boardId}:${JSON.stringify(signature)}`;
}

export function evictExtraVarsSchemaCache(boardId: number): void {
  for (const k of [...SCHEMA_CACHE.keys()]) {
    if (k.startsWith(`${boardId}:`)) SCHEMA_CACHE.delete(k);
  }
}

// ---------- buildExtraVarsSchema (ANCHOR) ----------

export function buildExtraVarsSchema(
  keys: DocumentExtraKey[],
): z.ZodObject<z.ZodRawShape>;
// 핵심:
//   - 빈 keys → z.object({}).strict()
//   - 캐시 hit → 캐시 반환
//   - 캐시 miss → 빌드 + 저장 (LRU 한도 초과 시 첫 entry 제거)
//   - 각 key.varType 별 매핑:
//       text/textarea → z.string().max(...)
//       number        → z.coerce.number().min(min).max(max)
//       select        → z.enum([...options.value])
//       checkbox      → z.array(z.enum([...options.value]))
//       date          → z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
//       email         → z.string().email()
//       url           → z.string().url()
//   - varIsRequired === false → .optional()
//   - varOptions.defaultValue 있고 required=false → .default(parsedDefault)
//   - 최종 z.object(shape).strict()  // 알 수 없는 키 거부
```

### 3.4 packages/board/src/extra-vars-schema.test.ts (신규)

**DZ-1 ~ DZ-10 (동적 Zod)**:

- **DZ-1** text 타입 1개 → `parse({ name: "foo" })` 통과.
- **DZ-2** number + min/max → `parse({ price: 50 })` (in range) 통과, out-of-range ZodError.
- **DZ-3** select + options → `parse({ rating: "5" })` 통과, 알 수 없는 value ZodError.
- **DZ-4** checkbox (multi) → `parse({ tags: ["a","b"] })` 통과, 빈 배열도 통과 (required 별도 처리).
- **DZ-5** required=true + 누락 → ZodError.
- **DZ-6** required=false + 누락 → 통과 (또는 default 적용).
- **DZ-7** defaultValue 있고 input 누락 → output 에 default 값 포함.
- **DZ-8** 캐시 hit — 동일 keys 로 두 번 호출 시 동일 ZodObject 인스턴스 반환.
- **DZ-9** 캐시 evict — `evictExtraVarsSchemaCache(boardId)` 호출 후 새 인스턴스 빌드.
- **DZ-10** 알 수 없는 키 (`strict` 모드) → `parse({ unknownKey: "x" })` ZodError.

### 3.5 packages/board/src/document.ts (수정)

**변경 사항**:

1. `CreateDocumentSchema` 에 `extraVars: z.record(z.string(), z.unknown()).optional()` 추가.
2. `createDocument` 본문에 Q4 의 검증 블록 추가 (board.id 조회 → keys 조회 → buildExtraVarsSchema → parse).
3. 검증 통과 시 `validatedExtraVars` 를 `prisma.document.create({ data: { ..., extraVars: validatedExtraVars } })` 에 포함.
4. `UpdateDocumentSchema` 에 `extraVars: z.record(z.string(), z.unknown()).optional()` 추가.
5. `updateDocument` 본문에 동일 검증 블록 추가 (input.extraVars 가 있을 때만).
6. 신규 에러: `ExtraVarsRequiredError`, `ExtraVarsNotConfiguredError` export.
7. helper: `hasRequiredExtraKeys(boardId, prisma)` 신규 — 게시판에 required 키가 하나라도 있는지 확인.

**기존 회귀 방지**:
- `extraVars` input 이 undefined 면 키 정의 조회 + required 체크 (required 없으면 통과 → 기존 동작 그대로).
- 키 정의가 0개인 게시판 + extraVars input 도 없음 → 기존 동작 그대로.

### 3.6 packages/board/src/document.test.ts (확장)

**DD-1 ~ DD-6 (Document 통합)** — 기존 테스트 회귀 + 신규:

- **DD-1** `createDocument({ extraVars: { price: 100, eventDate: '2026-06-01' } })` — 게시판에 (price: number, eventDate: date) 키 정의 후 호출 → 검증 통과 + `prisma.document.create.data.extraVars` 가 정확히 저장.
- **DD-2** `createDocument({ extraVars: { price: 'not-a-number' } })` → ZodError throw.
- **DD-3** 게시판에 키 미정의 + `createDocument({ extraVars: { foo: 1 } })` → `ExtraVarsNotConfiguredError`.
- **DD-4** 게시판에 required 키 있음 + `createDocument({ /* extraVars 누락 */ })` → `ExtraVarsRequiredError`.
- **DD-5** 게시판에 required 키 없음 + `createDocument({ /* extraVars 누락 */ })` → 통과 (기존 동작).
- **DD-6** `updateDocument({ extraVars: { price: 200 } })` — 기존 `{ price: 100, eventDate: '...' }` 가 `{ price: 200 }` 로 **전체 교체** (PUT semantics).

기존 Slice B/C 의 document.test.ts 회귀: `extraVars` input 미지정 케이스가 모두 통과해야 함.

### 3.7 packages/board/src/index.ts (수정)

신규 export:
```ts
export {
  listExtraKeys, createExtraKey, updateExtraKey, deleteExtraKey, reorderExtraKeys,
  ExtraKeyDuplicateNameError, ExtraKeyOptionsRequiredError,
} from './extra-keys.js';
export type { ExtraKeyOptions } from './extra-keys.js';

export {
  buildExtraVarsSchema, evictExtraVarsSchemaCache,
} from './extra-vars-schema.js';

export {
  ExtraVarsRequiredError, ExtraVarsNotConfiguredError,
} from './document.js';  // 기존 export 에 추가
```

### 3.8 apps/web/server/api/routers/admin/content-extra-key.ts (신규)

```ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  listExtraKeys, createExtraKey, updateExtraKey, deleteExtraKey, reorderExtraKeys,
  ExtraKeyDuplicateNameError, ExtraKeyOptionsRequiredError,
} from '@rhymix-ts/board';

function mapExtraKeyError(err: unknown): never {
  if (err instanceof ExtraKeyDuplicateNameError)
    throw new TRPCError({ code: 'CONFLICT', message: err.message });
  if (err instanceof ExtraKeyOptionsRequiredError)
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
  throw err;
}

export const adminContentExtraKeyRouter = router({
  list: protectedAdminProcedure
    .input(z.object({ boardId: z.number().int().positive() }))
    .query(({ ctx, input }) => listExtraKeys(input, { prisma: ctx.prisma })),

  create: protectedAdminProcedure
    .input(/* CreateExtraKeySchema 와 동일 */)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createExtraKey(input, { prisma: ctx.prisma });
      } catch (err) { mapExtraKeyError(err); }
    }),

  update: protectedAdminProcedure
    .input(/* UpdateExtraKeySchema */)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateExtraKey(input, { prisma: ctx.prisma });
      } catch (err) { mapExtraKeyError(err); }
    }),

  delete: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) => deleteExtraKey(input, { prisma: ctx.prisma })),

  reorder: protectedAdminProcedure
    .input(z.object({
      boardId: z.number().int().positive(),
      idsInOrder: z.array(z.number().int().positive()).min(1),
    }))
    .mutation(({ ctx, input }) => reorderExtraKeys(input, { prisma: ctx.prisma })),
});
```

### 3.9 apps/web/server/api/routers/admin/content-extra-key.test.ts (신규)

**A-1 ~ A-6 (admin tRPC)**:

- **A-1** `admin.content.extraKey.list` 미인증 → `UNAUTHORIZED`.
- **A-2** `admin.content.extraKey.list` 비admin → `FORBIDDEN`.
- **A-3** admin + `create` 정상 → row 반환.
- **A-4** admin + `create` 중복 varName → `CONFLICT`.
- **A-5** admin + `create` select 타입 options 누락 → `BAD_REQUEST`.
- **A-6** admin + `reorder` → varIdx 재할당 검증.

### 3.10 apps/web/server/api/routers/content/extra-keys.ts (신규)

```ts
import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';
import { listExtraKeys } from '@rhymix-ts/board';

export const contentExtraKeysRouter = router({
  list: publicProcedure
    .input(z.object({ boardId: z.number().int().positive() }))
    .query(({ ctx, input }) => listExtraKeys(input, { prisma: ctx.prisma })),
});
```

권한: public (글쓰기 폼이 익명/로그인 무관하게 렌더 가능해야 함).

### 3.11 apps/web/server/api/routers/content/extra-keys.test.ts (신규)

**C-1 ~ C-2 (content tRPC)**:

- **C-1** 익명 + `content.extraKeys.list(boardId)` → row[] 정상 반환.
- **C-2** 존재하지 않는 boardId → 빈 배열 (에러 X).

### 3.12 apps/web/server/api/routers/content/document.ts (수정)

**변경 사항**:

1. `create` mutation input 에 `extraVars: z.record(z.string(), z.unknown()).optional()` 추가.
2. `update` mutation input 에 동일 추가.
3. `mapDomainError` 에 신규 분기:
   - `ExtraVarsRequiredError` → `TRPCError BAD_REQUEST` (`message: 'Required extra fields are missing'`).
   - `ExtraVarsNotConfiguredError` → `TRPCError BAD_REQUEST`.
4. `create`/`update` 호출 시 `...(input.extraVars !== undefined ? { extraVars: input.extraVars } : {})` 패턴.

기존 회귀 방지: extraVars input 미지정 호출은 그대로 통과.

### 3.13 apps/web/server/api/routers/content/document.test.ts (확장)

**기존 Slice B/C/D/E 테스트 회귀 검증**:
- `prisma.documentExtraKey.deleteMany()` 를 test setup 에 추가 (각 테스트가 깨끗한 키 상태에서 시작).

**신규 — content tRPC 의 extraVars 통합 (3개)**:
- **CT-1** `content.document.create({ extraVars: {...} })` 정상 → row.
- **CT-2** 잘못된 extraVars → `BAD_REQUEST` (ZodError 자동 매핑).
- **CT-3** required 키 누락 → `BAD_REQUEST`.

### 3.14 apps/web/server/api/routers/admin/index.ts (수정)

```ts
import { adminContentExtraKeyRouter } from './content-extra-key';
// ...
export const adminRouter = router({
  // ... 기존 ...
  contentExtraKey: adminContentExtraKeyRouter,
});
```

라우터 키 명: `admin.contentExtraKey.*` (admin.board / admin.category 와 동일 카멜케이스 일관).

### 3.15 apps/web/server/api/routers/content/index.ts (수정)

```ts
import { contentExtraKeysRouter } from './extra-keys';
// ...
export const contentRouter = router({
  // ... 기존 ...
  extraKeys: contentExtraKeysRouter,
});
```

### 3.16 packages/board/src/routes/write-page.tsx (수정)

```tsx
import type { PrismaClient } from '@prisma/client';
import { ExtraFieldsRenderer } from '../components/ExtraFieldsRenderer.js';

interface WriteBoardPageProps extends ModuleRoutePageProps {
  action: string;
  prisma: PrismaClient;  // 신규 — server-side keys 조회용
}

export async function BoardWritePage(props: WriteBoardPageProps) {
  const board = await props.prisma.board.findUnique({
    where: { moduleInstanceId: props.instance.id },
    select: { id: true },
  });
  const extraKeys = board
    ? await props.prisma.documentExtraKey.findMany({
        where: { boardId: board.id, langCode: 'ko' },
        orderBy: { varIdx: 'asc' },
      })
    : [];

  return (
    <main>
      <h1>{props.instance.name} — 글쓰기</h1>
      <form method="POST" action={props.action}>
        <input type="hidden" name="moduleInstanceId" value={props.instance.id} />
        <div><label htmlFor="title">제목</label>
          <input id="title" name="title" type="text" required maxLength={200} /></div>
        <div><label htmlFor="content">내용</label>
          <textarea id="content" name="content" required rows={10} /></div>
        {extraKeys.length > 0 && <ExtraFieldsRenderer keys={extraKeys} />}
        <button type="submit">작성</button>
        <a href={`/${props.instance.mid}`}>취소</a>
      </form>
    </main>
  );
}
```

**호출 측 (`apps/web/app/[mid]/write/page.tsx` 등) 가 prisma 주입**:
- 기존 호출 시그니처에 `prisma` prop 추가 필요 — 호출 측 수정 동반.

### 3.17 packages/board/src/components/ExtraFieldsRenderer.tsx (신규)

Q5 의 예시 그대로. Server Component 로 구현.
- props: `{ keys: DocumentExtraKey[] }`.
- 각 key 의 varType 에 따라 input 렌더.
- input name 규칙: `extraVars[${varName}]` (checkbox 는 `extraVars[${varName}][]`).
- label, required, defaultValue, placeholder 는 varOptions 에서 추출.

### 3.18 packages/board/src/components/ExtraFieldsRenderer.test.tsx (신규)

**U-1 ~ U-7 (UI)**:

- **U-1** text/textarea 키 → `<input type="text">` / `<textarea>` 렌더 + label.
- **U-2** number 키 + min/max → `<input type="number" min max>` 속성 검증.
- **U-3** select + options → `<select>` 안에 `<option>` 목록.
- **U-4** checkbox + options → 각 option 별 `<input type="checkbox">` + `name="extraVars[xxx][]"`.
- **U-5** date/email/url → 해당 type 속성.
- **U-6** required=true → input 의 required 속성 + label 에 '*' 마커 (옵션).
- **U-7** defaultValue → input 의 defaultValue 적용.

테스트 도구: `@testing-library/react` (이미 packages/board 에 셋업되어 있는지 확인 필요 — 없으면 추가).

### 3.19 packages/board/src/extra-vars-form.ts (신규, 선택)

FormData → extraVars 객체 변환 헬퍼.

```ts
export function collectExtraVarsFromFormData(
  formData: FormData,
  keys: DocumentExtraKey[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const inputName = `extraVars[${key.varName}]`;
    switch (key.varType) {
      case 'checkbox':
        result[key.varName] = formData.getAll(`${inputName}[]`).filter(v => typeof v === 'string');
        break;
      case 'number':
        const raw = formData.get(inputName);
        if (raw !== null && raw !== '') result[key.varName] = Number(raw);
        break;
      default:
        const val = formData.get(inputName);
        if (val !== null && val !== '') result[key.varName] = val;
    }
  }
  return result;
}
```

테스트는 ExtraFieldsRenderer.test.tsx 와 별도 `extra-vars-form.test.ts` (간단 3개 케이스).

---

## 4. TDD 사이클

### RED Phase (테스트 먼저)

순서:

1. `extra-keys.test.ts` (EK-1~EK-7) — 도메인 CRUD.
2. `extra-vars-schema.test.ts` (DZ-1~DZ-10) — 동적 Zod + 캐시.
3. `document.test.ts` 확장 (DD-1~DD-6) — createDocument/updateDocument 통합.
4. `content-extra-key.test.ts` (A-1~A-6) — admin tRPC.
5. `extra-keys.test.ts` (content C-1~C-2) — content tRPC.
6. `document.test.ts` 확장 (content CT-1~CT-3) — tRPC 통합.
7. `ExtraFieldsRenderer.test.tsx` (U-1~U-7) — 렌더 검증.

### GREEN Phase (최소 구현)

1. `packages/board/src/extra-keys.ts` — EK-1~EK-7 통과.
2. `packages/board/src/extra-vars-schema.ts` — DZ-1~DZ-10 통과.
3. `packages/board/src/document.ts` 수정 — DD-1~DD-6 통과.
4. `packages/board/src/index.ts` re-export.
5. `apps/web/server/api/routers/admin/content-extra-key.ts` + register — A-1~A-6 통과.
6. `apps/web/server/api/routers/content/extra-keys.ts` + register — C-1~C-2 통과.
7. `apps/web/server/api/routers/content/document.ts` 수정 (extraVars input + error mapping) — CT-1~CT-3 통과.
8. `packages/board/src/components/ExtraFieldsRenderer.tsx` + `extra-vars-form.ts` — U-1~U-7 통과.
9. `packages/board/src/routes/write-page.tsx` 수정 + 호출 측 (apps/web `app/[mid]/write/page.tsx` 등) prisma 주입 — manual smoke 검증.
10. 전체 `pnpm test` 회귀 검증.

### REFACTOR Phase

- `ExtraKeyOptionsSchema` 를 `extra-keys.ts` 와 `extra-vars-schema.ts` 양쪽에서 공유 → 단일 정의 export.
- `buildExtraVarsSchema` 의 varType 분기 switch 를 dispatch table `Record<varType, (key) => ZodType>` 로 리팩토링 — 추후 새 타입 추가 시 1줄.
- `mapExtraKeyError` 를 `apps/web/server/api/error-mapping.ts` (Slice E REFACTOR 가 생성한 공통 모듈) 에 합류.
- @MX 태그 점검 (다음 절 참조).

---

## 5. REQ enforcement chain

| REQ / AC | 파일:함수 | 검증 테스트 |
| --- | --- | --- |
| REQ-CONTENT-120 (DocumentExtraKey 정의 + var_name/var_type/var_is_required/var_options) | `extra-keys.ts:createExtraKey`, `updateExtraKey` | EK-1, EK-3, EK-4 |
| REQ-CONTENT-120 (var_search / var_sort) | `extra-keys.ts:CreateExtraKeySchema` (필드 정의만; Slice F 는 저장만, Slice G 가 활용) | EK-1 (필드 존재 검증) |
| REQ-CONTENT-121 (runtime Zod validation) | `extra-vars-schema.ts:buildExtraVarsSchema`, `document.ts:createDocument/updateDocument` 검증 블록 | DZ-1~DZ-10, DD-1~DD-6 |
| AC-CONTENT-063 (custom field 검색) | **Slice G 이월** — 본 슬라이스는 정의 + 검증만, search.ts 통합은 다음 슬라이스 | (out of scope) |

**Heads-up — spec.md 와의 정합**:
- spec.md Domain Model 의 `DocumentExtraKey.varType` 주석: `text | number | select | checkbox | date | url | email`.
- Slice F 추가: `textarea`.
- spec.md 본문에 `textarea` 추가는 **sync phase 에서 동반** (Q1 참조). 본 슬라이스 구현 직후 spec.md 갱신.

---

## 6. @MX 태그 후보

| 위치 | 태그 | 이유 |
| --- | --- | --- |
| `extra-vars-schema.ts:buildExtraVarsSchema` | `@MX:ANCHOR` | 동적 Zod 생성의 단일 진입점. fan_in >= 4 (createDocument, updateDocument, content.document 라우터, content.extraKeys 라우터 + 향후 search.ts). SPEC: `REQ-CONTENT-121`. |
| `extra-keys.ts:createExtraKey` | `@MX:NOTE` | 캐시 evict 트리거 — `evictExtraVarsSchemaCache(boardId)` 호출 의무. updateExtraKey / deleteExtraKey / reorderExtraKeys 도 동일. `@MX:REASON: 키 정의 변경 후 stale Zod 가 검증되면 잘못된 데이터를 통과시킬 위험`. |
| `document.ts:createDocument` (Slice F 통합 후) | `@MX:NOTE` | extraVars 검증 진입점. `@MX:REASON: 트랜잭션 외부에서 keys 조회 + Zod parse — 동시성으로 정의 변경 중간에 도착한 글은 새 정의 기준으로 검증됨 (의도된 동작)`. |
| `components/ExtraFieldsRenderer.tsx` | `@MX:NOTE` | Slice F 의 1차 렌더러. `@MX:TODO: Slice G+ 에서 react-hook-form / conditional fields / a11y label association 강화 검토`. |

언어: `language.yaml.code_comments: ko` 기준 — 한국어 description.

---

## 7. 회귀 보장

### 7.1 Slice A 회귀
- `DocumentExtraKey` schema 무변경 — Q2 결정.
- Slice A 의 `Document.extraVars Json` 컬럼 default `"{}"` 유지 — extraVars 없는 글은 기존대로 빈 객체.

### 7.2 Slice B (Document CRUD) 회귀
- `createDocument` / `updateDocument` 의 기존 시그니처 보존 — `extraVars` 는 optional.
- 키 정의 미설정 게시판 (대부분의 기존 테스트 케이스) + extraVars input 없음 → 기존 코드 경로 그대로.
- **test setup 보강**: `beforeEach(prisma.documentExtraKey.deleteMany())` 추가 → 다른 테스트가 만든 키 정의가 누수되지 않게.

### 7.3 Slice C/D/E 회귀
- search.ts 무변경 (Slice G 이월).
- vote/report/trash/attachment 의 라우터 무변경.
- rate-limit 의 카운터에 영향 없음.
- 744 tests 전체 재실행 시 모두 통과해야 함.

### 7.4 Prisma 마이그레이션
- **없음**. Q2 결정.

---

## 8. Out of Scope (Slice F 미포함, Slice G 이월)

- **Custom Fields 검색 통합** (REQ-CONTENT-063, AC-CONTENT-063) — `search.ts` 의 predicate 에 `extra_vars @> {...}::jsonb` GIN 검색 추가. `varSearch=true` 인 키만 검색 대상.
- **Custom Fields 정렬 통합** — `var_sort=true` 인 키를 `orderBy` 로 사용. listDocuments 의 sort 파라미터 확장.
- **다국어 (`langCode`)** — 본 슬라이스는 `langCode='ko'` 고정. 사이트 기본 언어 또는 user-selected 언어 기반 분기는 Slice G+ 이월.
- **고도화된 클라이언트 렌더러** — react-hook-form, conditional fields ("if A=='yes' show B"), drag-drop reorder UI, file upload 타입 (Slice E attachment.ts 와 통합), datetime/datetime-local. Slice G+ 이월.
- **Document.extraVars 의 키 삭제 시 cleanup** — `deleteExtraKey` 가 기존 글의 extraVars 에 남은 값을 정리하지 않음. SPEC-INFRA 이월 (cron 또는 admin-triggered cleanup).
- **Vote up/down 분리 컬럼** — Slice E Heads-up 잔재. Slice G 이월.
- **Trash retention cron** — SPEC-INFRA 이월.
- **Report admin notification workflow** — SPEC-NOTIFICATION 이월.

---

## 9. Heads-up for Slice G

Slice G 우선순위 후보 (Slice F 완료 후):

1. **Custom Fields 검색/정렬 통합** (REQ-CONTENT-063, AC-CONTENT-063):
   - `search.ts:searchDocuments` 에 `extraVars: Record<string, unknown>` 필터 추가.
   - `varSearch=true` 인 키만 검색 대상으로 필터링 (Zod 동적 스키마 재사용).
   - GIN index `@@index([extraVars], type: Gin)` 활용한 `@>` containment 쿼리.
   - sort 파라미터에 `extra_vars->>'eventDate' ASC` 같은 동적 sort 추가.
2. **Vote up/down 분리 컬럼** — `votedUpCount`, `votedDownCount` 신규. vote.ts + search.ts 갱신. 마이그레이션 + 백필 필요.
3. **Custom Fields UI 고도화** — react-hook-form, conditional fields, datetime, file upload 타입.
4. **DocumentReport admin notification workflow** — SPEC-NOTIFICATION-001 의존.
5. **Trash retention cron** — SPEC-INFRA-001 의존.
6. **Site-level configurable rate limits** — Slice E Heads-up 잔재.
7. **SPEC-CONTENT-001 completed 선언 검토** — Slice G 완료 후 spec.md status: draft → completed 전환. AC 매트릭스 최종 검증.

---

## 10. 검증 체크리스트 (구현 완료 기준)

- [ ] `pnpm test` — 신규 ~40개 테스트 (EK 7 + DZ 10 + DD 6 + A 6 + C 2 + CT 3 + U 7 = 41) 모두 통과
- [ ] `pnpm test` — 기존 744개 테스트 회귀 없음 (test setup 보강 후)
- [ ] Prisma 마이그레이션 없음 — `pnpm prisma migrate status` clean
- [ ] `pnpm typecheck` — strict mode 통과 (any/non-null assertion 미사용, `z.record` strict 적용)
- [ ] `pnpm lint` — biome/eslint 통과
- [ ] @MX 태그 4개 추가 (ANCHOR 1, NOTE 3) — 한국어 description
- [ ] `buildExtraVarsSchema` 가 fan_in 4+ 확보 (createDocument, updateDocument, content tRPC, admin tRPC) — ANCHOR 자격 충족
- [ ] spec.md 의 `varType` 주석에 `textarea` 추가 (sync phase 동반)
- [ ] `BoardWritePage` 호출 측 (apps/web `app/[mid]/write/page.tsx` 등) 에 prisma prop 주입 확인 (manual smoke)
- [ ] AC-CONTENT-063 은 Slice G 이월 명시 — 본 슬라이스 acceptance 에서 제외

---

End of Slice F plan.
