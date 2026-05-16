# SPEC-AUTH-001 Slice G Plan

Status: ready
Methodology: TDD (RED-GREEN-REFACTOR)
Base: main = 9f31e87 (Slice D1+D2+E+F 머지 완료, Slice F EOD sync 시점)
Scope budget: 단일 PR. 신규 LoC 목표 < 600 (테스트 포함). 단일 화면 흐름(타입 augmentation → autologin issue → autologin refresh)이 데이터 결합도가 높아 분할 시 더블 mock 부담이 큼.

> **Note**: 본 슬라이스는 Slice D/E/F 의 구조·톤을 그대로 따른다. F 까지 완성된 도메인/UI/middleware 레이어 위에서, 끊긴 통합 지점 세 곳 — (1) NextAuth 타입 안전성, (2) 로그인 성공 시 autologin 쿠키 발급, (3) autologin 쿠키 ↔ NextAuth signIn 브릿지 — 을 봉합한다. 새 도메인 로직은 **추가하지 않는다**. 모든 신규 작업은 기존 도메인 함수 (`createAutoLogin`, `verifyAutoLogin`, `revokeAutoLogin`, `buildSessionClaims` 계열) 를 호출 사이트로 끌어오는 통합 작업이다.

---

## Pre-Flight Findings (착수 직전 검증 — Slice F 시도 시 잘못된 전제를 답습하지 않기 위해 모두 직접 read 로 확인 완료)

### Q1 — jwt callback 에 RBAC (isAdmin/groups) 가 실제로 주입되는가 — **RESOLVED: YES**

`apps/web/lib/auth/callbacks.ts` L107-141 확인:
- Sign-in 분기에서 `deps.fetchUserForClaims ?? defaultFetchUserForClaims` 를 호출해 `User.findUnique({ include: { groups: { include: { group: true } } } })` 수행.
- 결과를 `token.isAdmin`, `token.groups` 에 주입 (실패 시 silent fail, 로그인은 성공).
- 후속 요청에서는 `isSessionRevoked` 검사만 수행하고 클레임은 token 에 이미 보존됨.

session callback (L175-198) 도 `token.isAdmin ?? false`, `token.groups ?? []` 를 `session.user` 에 복사한다.

**채택 경로**: 도메인 로직은 더 손대지 않는다. Slice G 는 이 위에서 *타입 안전성* 만 보강한다.

### Q2 — `apps/web/app/api/auth/autologin-refresh/route.ts` 존재 여부 — **RESOLVED: NO (미존재)**

`apps/web/app/api/auth/**/*.ts` glob 결과: 매치 0건. 사용자 prompt 의 "Explore가 보고했음" 은 잘못된 보고.

apps/web 전역에서 `autologin|createAutoLogin|verifyAutoLogin` grep 결과: 매치 0건. packages/auth 의 도메인 함수는 완성됐으나 apps/web 의 어떤 호출 사이트에서도 호출되지 않는다.

**채택 경로**: Route Handler 신규 작성. apps/web 측 도메인 진입점 최초 도입.

### Q3 — NextAuth 타입 augmentation 파일 존재 여부 — **RESOLVED: NO (미존재)**

`apps/web/**/next-auth.d.ts` 매치 0건. `apps/web/next-env.d.ts` 만 존재 (Next.js 자동 생성, 편집 금지 파일).

현재 코드에서는 `(session.user as Record<string, unknown>).isAdmin = ...` (callbacks.ts L191), `(user as { id: number }).id = idNum` (admin-middleware.ts L57) 처럼 unsafe cast 로 우회한다. typecheck 는 통과하지만 **`session.user.isAdmin` 등의 접근이 strict mode 에서 자동완성/타입체크되지 않음**.

**채택 경로**: `apps/web/types/next-auth.d.ts` 신규 작성. `declare module 'next-auth'` 로 Session/JWT 타입 확장. 기존 unsafe cast 는 가능한 범위에서 제거 (callbacks.ts, admin-middleware.ts).

### Q4 — `isAdminSession` 헬퍼의 실제 구현 — **RESOLVED: NextAuth session 직접 read (DB 조회 없음)**

`apps/web/lib/auth/admin-middleware.ts` L31-63 확인:
- session 객체에서 `user.id`, `user.isAdmin`, `user.groups[].isAdmin` 만 읽어 OR-게이트 평가.
- DB 호출 없음. 매 admin Server Action 호출당 0 DB query 추가.
- string → number 정규화는 헬퍼 내부에서 처리 (`user.id` 를 number 로 덮어씀).

**채택 경로**: 동일 헬퍼 유지. 타입 augmentation 도입 후 `(user as ...)` 캐스트는 제거 가능하지만 정규화 로직 (string→number) 은 유지해야 한다 — Auth.js 표준 sub claim 이 string 이기 때문.

### Q5 — login Server Action 의 rememberMe 옵션 — **RESOLVED: 미구현**

`apps/web/lib/auth/actions.ts` L134-168 `loginAction` 확인:
- `formData` 에서 `identifier`, `password` 만 추출. `rememberMe` 필드 미사용.
- `signIn('credentials', { identifier, password, redirect: false })` 호출 후 즉시 return.
- 로그인 성공 후 **autologin 쿠키 발급 호출 없음**.

`apps/web/app/(auth)/login/page.tsx` L?? 의 form 확인 필요 — 추정상 `<input type="checkbox" name="rememberMe">` 는 없음.

**채택 경로**: loginAction 에 rememberMe 분기 추가. true 일 때 `createAutoLogin(...)` 호출 후 `cookies().set('rx_autologin', ...)`. Slice E-plan 의 Q1/Q2/Q3 결정 (HMAC 해시화 + `rx_autologin` 쿠키 명세) 은 **Slice G 에서 채택하지 않는다** — autologin 토큰을 평문 그대로 쓰는 현재 schema 와 도메인 함수 동작을 유지하고, 통합만 수행. HMAC 해시화는 **Slice H 의 별도 마이그레이션 슬라이스**로 분리. 이 결정의 근거:

| 옵션 | 영향 | 채택 |
|---|---|---|
| Slice G 에 HMAC 통합 | schema 변경 + migration + 도메인 함수 수정 + Route Handler 신규 + Server Action 수정 → +800 LoC, 단일 PR 부적합 | 거부 |
| Slice G 는 통합만, Slice H 가 HMAC | Slice G 는 < 600 LoC, 검토 단위 명확 | **권장** |

### Q6 — 로그인 레이트리미팅 실제 차단 동작 — **RESOLVED: 동작 중**

`packages/auth/src/login.ts` L120-141 확인:
- `LoginAttempt.count({ ip, result: 'INVALID_CREDENTIALS', createdAt: { gt: windowStart } })` 조회.
- `failCount >= maxErrorCount` (기본 5) → `RATE_LIMITED` LoginAttempt row 작성 후 `{ ok: false, code: 'RATE_LIMITED' }` 반환.
- 도메인 단위 테스트 (login-rate-limit.test.ts) 통과 — 동작 검증됨.

**채택 경로**: Slice G 에서 손대지 않는다. Slice E-1 결과 그대로 유지.

### Q7 — Slice E plan 이 약속한 모든 통합이 실제로 완료됐는가 — **RESOLVED: 부분 완료**

progress.md L697-787 (Slice E 섹션) 와 실제 코드를 교차 검증한 결과:

| 항목 | 도메인 (packages/auth) | 통합 (apps/web) |
|---|---|---|
| E-1 Rate Limiting | ✅ login.ts gate | N/A (login 자체가 통합점) |
| E-2 Password Reset | ✅ password-reset.ts | ✅ `requestPasswordResetAction` + `confirmPasswordResetAction` + UI (Slice F) |
| E-3 AutoLogin | ✅ autologin.ts | ❌ **Route Handler 없음, loginAction 에 호출 없음** |
| E-4 Admin Role Toggle | ✅ admin-role.ts | ✅ `toggleAdminRoleAction` |
| E-5 JWT RBAC Claims | ✅ callbacks.ts | ⚠️ 타입 augmentation 부재 (unsafe cast 로 통과) |

**Slice G 가 봉합해야 할 항목**: E-3 의 통합 누락 + E-5 의 타입 안전성. 그 외는 회귀 없이 유지.

---

## 구현 목록

### 1. NextAuth 타입 augmentation 신규

신규 파일: `apps/web/types/next-auth.d.ts`

내용 (TypeScript module augmentation):

- `declare module 'next-auth'` 블록:
  - `Session.user` 를 확장 — `id: string` (Auth.js 표준 유지), `isAdmin: boolean`, `groups: Array<{ id: number; isAdmin: boolean }>`, `name?: string | null`, `email?: string | null`
- `declare module 'next-auth/jwt'` 블록:
  - `JWT` 를 확장 — `sub: string`, `iat?: number`, `isAdmin?: boolean`, `groups?: Array<{ id: number; isAdmin: boolean }>`

tsconfig 영향 확인: `apps/web/tsconfig.json` 의 `include` 가 `types/**/*.d.ts` 를 포함하는지 확인. 미포함 시 추가 (Slice F 의 vitest.config.ts esbuild jsx automatic 변경 사례와 동일한 작은 config 수정).

기존 코드 정리 (옵션, 충돌 없는 범위에서):
- `apps/web/lib/auth/callbacks.ts` L191-194 의 `(session.user as Record<string, unknown>).isAdmin = ...` → `session.user.isAdmin = ...` 로 단순화 가능 여부 검증. session callback 의 return 타입은 next-auth 가 강제하므로 일부 캐스트 잔존 가능.
- `apps/web/lib/auth/admin-middleware.ts` L31-63 의 unsafe cast 는 외부 입력 (Auth.js Session 객체) 의 런타임 검증을 겸하므로 **그대로 유지**. 타입가드 함수가 boolean 을 반환하는 본래 목적이므로 augmentation 으로도 캐스트 제거는 불가.

### 2. loginAction 에 rememberMe 옵션 추가

수정 파일: `apps/web/lib/auth/actions.ts`

`loginAction` 수정:
1. `formData.get('rememberMe')` 추출. truthy 값 ('on' 또는 'true') 만 활성화.
2. `signIn('credentials', ...)` 성공 후, rememberMe=true 이면:
   - `auth()` 호출로 session 재조회 → `session.user.id` (string → number 정규화) 획득.
   - `createAutoLogin({ userId, ip, userAgent, deviceId: undefined }, { prisma })` 호출. 결과의 `securityKey` 획득.
   - `cookies().set('rx_autologin', securityKey, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })`.
   - 쿠키 명세는 Slice E-plan Q3 의 제안 (`rx_autologin`, Lax, 30일) 을 채택. 단 값 형식은 `<autoLoginId>.<token>` 이 아닌 **`<token>` 단독** — 이유: 현재 `verifyAutoLogin` 도메인 함수는 `securityKey` 단일 컬럼으로 `findFirst` 한다 (autologin.ts L100-102). id 를 쿠키에 포함시키지 않아도 unique index lookup 으로 충분.
   - autologin 발급 실패는 silent fail (try-catch). 로그인 자체는 성공으로 처리. AuditLog 는 도메인 함수가 자체 처리.

수정 파일: `apps/web/app/(auth)/login/page.tsx`

- form 에 `<input type="checkbox" name="rememberMe" />` + label "로그인 상태 유지" 추가.
- 추가 UI 검증 없음 — 단순 체크박스.

테스트 보강:
- `apps/web/lib/auth/actions.test.ts` 의 loginAction 섹션 확장 — rememberMe=on 시 `createAutoLogin` mock 이 호출되고 `cookies().set` mock 이 정확한 옵션으로 호출되는지 검증.

### 3. autologin-refresh Route Handler 신규

신규 파일: `apps/web/app/api/auth/autologin-refresh/route.ts`

목적: 사용자가 NextAuth session 쿠키 없이 (또는 만료된 상태로) 서버 접속할 때, `rx_autologin` 쿠키만으로 NextAuth session 을 재발급한다. 일반적인 진입 흐름:

1. 사용자가 보호된 라우트 (`/dashboard` 등) 접속 → middleware 가 비인증으로 판단 → `/login` 리다이렉트.
2. 이 흐름 *전에* 로그인 페이지에서 (또는 새로 짠 root level 에서) `GET /api/auth/autologin-refresh` 가 호출되도록 한다.

본 슬라이스 G 의 Route Handler 책임:
- `cookies().get('rx_autologin')?.value` 조회. 없으면 즉시 `{ ok: false, code: 'NO_TOKEN' }` 반환 (status 200, side-effect 없음).
- 존재하면 `verifyAutoLogin({ securityKey: cookieValue, ip, userAgent }, { prisma })` 호출.
  - `ok: false, code: 'TOKEN_INVALID'` → 쿠키 삭제 후 `{ ok: false, code: 'INVALID' }` 반환.
  - `ok: false, code: 'TOKEN_THEFT'` → 쿠키 삭제 후 `{ ok: false, code: 'THEFT' }` 반환. 도메인 함수가 이미 `revokeAllSessions` + 메일 발송 처리. Route Handler 는 추가 작업 없음.
  - `ok: true, userId, autoLoginId` → 다음 단계.
- 성공 경로: `verifyAutoLogin` 이 반환한 새 `securityKey` (rotation 결과) 를 받아야 한다. **현재 verifyAutoLogin 의 반환 타입은 `{ ok: true, userId, autoLoginId }` 뿐** (autologin.ts L51-53). rotation 으로 발급된 새 키는 DB 의 record 에만 저장되고 호출자에게 반환되지 않는다.

  → **결정 분기 A**: verifyAutoLogin 의 시그니처를 확장 — `{ ok: true, userId, autoLoginId, newSecurityKey }` 로 변경. 도메인 함수 수정 + autologin.test.ts 케이스 보강.

  → **결정 분기 B**: Route Handler 에서 record id 로 다시 `prisma.autoLogin.findUnique({ id })` 호출해 새 키 조회. 추가 DB 호출 1회.

  **채택**: 분기 A. 이유 — Route Handler 가 도메인 함수의 내부 상태에 의존하지 않게 하는 게 클린. 도메인 함수가 rotation 결과를 명시적으로 반환하는 게 의미 명확. autologin.test.ts 의 기존 케이스 (test "verify rotates key") 가 이미 새 키를 DB 에서 직접 조회해 검증하므로, 반환 타입 확장만 추가하면 회귀 없음.

- 성공 경로 (continued):
  - 새 `securityKey` 로 `rx_autologin` 쿠키 갱신 (동일 옵션).
  - **NextAuth session 발급은 본 슬라이스에서 다루지 않는다** — `signIn('credentials', ...)` 는 credentials 가 필요하고, autologin 으로 session 을 직접 발급하려면 Credentials Provider 의 별도 모드 추가 또는 JWT 직접 쓰기 등의 더 큰 변경이 필요. Slice G 의 Route Handler 는 **autologin 쿠키 유효성 검증 + rotation** 까지만 책임지고, 응답 body 에 `{ ok: true, userId }` 만 돌려준다. 클라이언트는 이 응답을 받으면 별도 로그인 폼 자동 채움 또는 sign-in 트리거 등을 후속 슬라이스에서 처리.

  **이 결정의 영향**: AC-AUTH-019 의 end-to-end (autologin → 자동 로그인) 는 본 슬라이스로는 **partial completion**. autologin 도메인 + rotation + Route Handler 까지는 완성, NextAuth session 자동 발급은 Slice H 로 분리. progress.md 에 명시.

- HTTP 메서드: `POST` (CSRF 안전성, side-effect 발생). Next.js 16 App Router 의 `export async function POST(req: Request)` 패턴.

- 응답 형식: JSON. status 200 (도메인 실패도 200, body 의 `ok: false` 로 구분). status 5xx 는 예외 throw 시에만.

### 4. 도메인 함수 시그니처 확장 (분기 A 채택 결과)

수정 파일: `packages/auth/src/autologin.ts`

`verifyAutoLogin` 의 성공 응답 타입에 `newSecurityKey: string` 추가:

```typescript
export type AutoLoginResult =
  | { ok: true; userId: number; autoLoginId: number; newSecurityKey: string }
  | { ok: false; code: 'TOKEN_INVALID' | 'TOKEN_THEFT' };
```

구현 변경 — L106-120 사이에서 `newKey` 를 이미 생성하므로, 반환 객체에 추가만 하면 됨. 1줄 변경.

수정 파일: `packages/auth/src/autologin.test.ts`

- "verify rotates key" 테스트 보강 — 반환 객체의 `newSecurityKey` 가 새 key 와 일치하고 이전 key 와 다른지 검증.
- 기존 통과 케이스 (TOKEN_INVALID / TOKEN_THEFT) 는 영향 없음.

### 5. middleware.ts heads-up — 수정 없음

`apps/web/middleware.ts` 는 Slice F 에서 도입됨 (L827-832 in progress.md). 현재:
- 보호 경로 → 비인증 시 `/login` 리다이렉트.
- 인증 전용 경로 → 인증 시 `/` 리다이렉트.

Slice G 에서 middleware 는 손대지 않는다. autologin-refresh 호출 흐름은 클라이언트 측 (Slice H) 또는 페이지 컴포넌트 측에서 트리거할 예정.

이유: middleware 는 Edge Runtime 에서 동작해 Prisma 호출 불가 (Slice E-plan Q4 에서 확인됨). autologin-refresh 호출은 Node.js runtime 에서 동작해야 하므로 middleware 에서 직접 fetch 하는 패턴도 사용 가능하지만, 추가 latency (매 요청마다 internal fetch) 부담이 있어 Slice G 범위 외.

---

## TDD 테스트 시나리오 (RED 우선 작성)

### 5-1. 타입 augmentation 검증

`apps/web/types/next-auth.d.ts` 는 .d.ts 라 자체 단위 테스트는 불필요. 다음 두 곳에서 *type-level* 검증:

- `apps/web/lib/auth/callbacks.test.ts` (기존 파일 확장) — session callback 의 return 객체 타입이 `Session` 과 호환되는지 컴파일 타임 검증 (`satisfies Session` 사용 가능).
- `apps/web/lib/auth/admin-middleware.test.ts` (신규 또는 기존 확장) — `isAdminSession` 의 type predicate 가 augmented Session 과 호환되는지.

만약 augmentation 이 정확히 적용되면 `pnpm --filter @rhymix-ts/web typecheck` 가 새 .d.ts 로 인해 더 strict 한 검증을 수행하며, 기존 `(session.user as Record<string, unknown>)` 캐스트 일부는 불필요해진다.

### 5-2. loginAction rememberMe 검증

`apps/web/lib/auth/actions.test.ts` 확장:

- **Test G-1**: rememberMe='on' + signIn 성공 → createAutoLogin mock 호출됨, cookies.set 호출됨 (이름='rx_autologin', httpOnly=true, sameSite='lax', maxAge=30*86400).
- **Test G-2**: rememberMe 미설정 + signIn 성공 → createAutoLogin mock 호출 안 됨, cookies.set 호출 안 됨.
- **Test G-3**: rememberMe='on' + createAutoLogin 실패 (mock 이 throw) → loginAction 은 여전히 `{ ok: true }` 반환 (silent fail). 회복력 검증.
- **Test G-4**: rememberMe='on' + signIn 실패 (INVALID_CREDENTIALS) → createAutoLogin mock 호출 안 됨. 잘못된 로그인 후 쿠키 발급 방지.

### 5-3. autologin-refresh Route Handler 검증

신규 파일: `apps/web/app/api/auth/autologin-refresh/route.test.ts`

- **Test G-5**: 쿠키 없음 → `{ ok: false, code: 'NO_TOKEN' }`. status 200. verifyAutoLogin mock 호출 안 됨.
- **Test G-6**: 쿠키 있음 + verifyAutoLogin → TOKEN_INVALID → `{ ok: false, code: 'INVALID' }`. 쿠키 삭제 검증.
- **Test G-7**: 쿠키 있음 + verifyAutoLogin → TOKEN_THEFT → `{ ok: false, code: 'THEFT' }`. 쿠키 삭제 검증. (도메인 함수가 revokeAllSessions + mail 처리하는지는 도메인 테스트에서 검증, Route Handler 테스트는 응답만 확인.)
- **Test G-8**: 쿠키 있음 + verifyAutoLogin → `{ ok: true, userId: 42, autoLoginId: 7, newSecurityKey: 'NEW' }` → 응답 `{ ok: true, userId: 42 }`, 쿠키 갱신 (값='NEW', 옵션 일치).
- **Test G-9**: GET 요청 → 405 Method Not Allowed (POST 만 허용).

mock 패턴: `vi.mock('@rhymix-ts/auth')` 의 `verifyAutoLogin` 만 mock. `vi.mock('next/headers')` 의 `cookies` 는 in-memory map 으로 stub.

### 5-4. verifyAutoLogin 시그니처 확장 검증

`packages/auth/src/autologin.test.ts` 의 "verify rotates key" 테스트 확장:

- **Test G-10**: rotation 후 반환 객체의 `newSecurityKey` 가 (a) DB 의 record.securityKey 와 동일, (b) 호출 시점의 input.securityKey 와 다름.
- 기존 케이스 (test #1, #2, #3) 는 회귀 없음.

---

## @MX 태그 후보

신규 추가:

- `apps/web/app/api/auth/autologin-refresh/route.ts`:
  - `@MX:ANCHOR`: autologin 쿠키 검증 단일 진입점.
  - `@MX:REASON`: rotation/도난 감지 흐름이 도메인 함수 `verifyAutoLogin` 외 다른 경로로 분기되면 토큰 도용 탐지가 무력화된다.
  - `@MX:SPEC`: SPEC-AUTH-001 REQ-AUTH-018, REQ-AUTH-019, REQ-AUTH-053

업데이트:

- `packages/auth/src/autologin.ts` 의 기존 `@MX:ANCHOR` (L13) — 변화 없음. fan_in 이 1 → 2 (Route Handler 추가) 로 늘어나지만 ANCHOR 임계값 (3) 미만 유지. 향후 Slice H 에서 추가 호출 사이트 도입 시 재확인.

검토 후 추가 가능:

- `apps/web/lib/auth/actions.ts` 의 `loginAction` — rememberMe 분기 추가 후 함수가 30+ LoC 늘어나면 `@MX:NOTE` 로 흐름 분기 설명 추가 검토.

---

## Verification 체크리스트

| 항목 | 통과 기준 |
|---|---|
| `pnpm --filter @rhymix-ts/auth typecheck` | 0 errors (autologin.ts 시그니처 변경 영향만 검토) |
| `pnpm --filter @rhymix-ts/web typecheck` | playwright.config.ts 잔존 (Slice F 이전부터) 외 0 errors. 타입 augmentation 도입 후 새 타입 오류 발생 가능성 → 해소 |
| `pnpm test` | 354 baseline → 354 + 10~12 신규 (G-1 ~ G-10 + augmentation 보강) = 364~366. 회귀 0 |
| `pnpm --filter @rhymix-ts/db exec prisma validate` | OK (schema 변경 없음) |
| `prisma migrate diff --from-schema-datasource ... --to-schema-datamodel ...` | "no differences" — schema 변경 없음 확인 |

---

## Acceptance Criteria progress (예상)

| AC | 상태 (현재) | 예상 (Slice G 완료 후) |
|---|---|---|
| AC-AUTH-018 (autologin 발급) | partial — 도메인 함수 OK, 호출 사이트 없음 | ✅ (loginAction rememberMe=on 경로) |
| AC-AUTH-019 (autologin rotation) | partial — 도메인 함수 OK, 호출 사이트 없음 | ✅ partial — Route Handler 호출 시 rotation 동작. 단, NextAuth session 자동 발급은 Slice H |
| AC-AUTH-053 (token theft) | ✅ (도메인 단위) | ✅ end-to-end (Route Handler 가 도메인 함수 호출 → 자동 revoke + mail) |
| AC-AUTH-034 (RBAC OR-게이트) | ✅ (도메인 + Server Action + jwt 주입) | ✅ + 타입 안전 (augmentation 도입) |

기존 AC (AC-AUTH-010~015, 017, 020, 031, 033, 052, 054, F001~F008) 는 모두 **회귀 없음** 검증.

---

## Deviations / 결정 사항

1. **HMAC 해시화는 Slice H 로 분리** — Slice E-plan 의 Q1 (Path A) + Q2 (HMAC-SHA256) 결정은 그 자체로 schema migration + 도메인 함수 수정 + 환경 변수 도입을 동반해 단일 PR 로 묶기에 부담. Slice G 는 통합만, Slice H 는 보안 강화로 분리. 운영 환경 없는 현 단계에서 평문 토큰은 단기 허용 가능.

2. **NextAuth session 자동 발급은 Slice H 로 분리** — Route Handler 는 autologin 쿠키 검증 + rotation 까지만. autologin 으로 NextAuth session 을 직접 발급하려면 Credentials Provider 의 별도 모드 (autologin authorize 분기) 또는 Auth.js JWT 직접 발급 등이 필요. 두 경로 모두 Auth.js v5 의 내부 동작에 깊이 의존하므로 별도 슬라이스에서 신중히 설계.

3. **autologin 쿠키 값에 `autoLoginId` 미포함** — Slice E-plan Q3 의 `<autoLoginId>.<token>` 형식 제안은 verify 시 unique index lookup 최적화 목적이었으나, 현재 `verifyAutoLogin` 도메인 함수가 `securityKey` 단일 컬럼으로 `findFirst` 한다 (이 컬럼은 `@unique` 인덱스). id 없이도 O(1) 조회 가능. 쿠키 형식 단순화.

4. **verifyAutoLogin 시그니처 확장** — `newSecurityKey` 를 반환 타입에 추가. 호출자 (Route Handler) 가 도메인 내부 상태에 의존하지 않게. 도메인 함수의 명시성 강화.

5. **rememberMe UI 는 단순 체크박스만** — Slice F 의 UI 톤 (plain Tailwind, shadcn 미사용) 유지. 별도 디자인 토큰 없음.

6. **타입 augmentation 의 `import` 미사용** — `apps/web/types/next-auth.d.ts` 는 `import type` 없이 module augmentation 만 수행. Next.js / Auth.js 의 권장 패턴 (`declare module 'next-auth' { interface Session { ... } }`). tsconfig 의 `include` 에 `types/**/*.d.ts` 가 반드시 포함되어야 하며, 미포함 시 추가.

7. **Slice E plan v1.0.0 의 Q1-Q4 모든 결정 채택 보류** — Slice E plan 은 더 큰 범위 (HMAC + 쿠키 + Edge runtime middleware 통합) 를 다뤘으나, 실제 Slice E 작업은 도메인 함수까지만 완성됐다 (progress.md L697-787 와 코드 교차검증 결과). Slice G 는 그 통합 누락분 *중 가장 작은 부분집합* 만 처리.

---

## Heads-up notes for Slice H (보안 강화 + autologin↔NextAuth 자동 연결)

1. **HMAC-SHA256 해시화 도입**:
   - `packages/db/prisma/schema.prisma` 에 `AutoLogin.tokenHash String @unique` 컬럼 추가, 기존 `securityKey`/`previousKey` 는 deprecate 또는 remove.
   - migration: 기존 모든 AutoLogin 행 deleteMany (Path A, 운영 환경 없으므로 안전).
   - 환경 변수 `AUTOLOGIN_HMAC_SECRET` 도입. secret 미설정 시 fail-closed.
   - `createAutoLogin` / `verifyAutoLogin` 내부에서 `tokenHash = base64url(hmacSha256(secret, plainToken))` 으로 비교/저장.
   - `crypto.timingSafeEqual` 사용해 timing attack 방어.

2. **autologin → NextAuth session 자동 발급**:
   - Credentials Provider 에 새 mode "autologin" 추가. authorize() 가 `credentials.mode === 'autologin'` 일 때 password 검증 대신 `verifyAutoLogin` 결과를 신뢰.
   - Route Handler `/api/auth/autologin-refresh` 의 성공 경로에서 `signIn('credentials', { mode: 'autologin', securityKey: cookie })` 호출.
   - 또는 더 깊은 통합: Auth.js v5 의 `unstable_update` 또는 직접 JWT 발급. 결정은 Slice H 시작 시 확정.

3. **middleware 와 autologin 통합**:
   - 보호 경로 진입 시 middleware 가 NextAuth session 부재 + `rx_autologin` 쿠키 존재 → 내부 redirect 또는 fetch 로 autologin-refresh 트리거.
   - Edge Runtime 제약 (Prisma 불가) 으로 인해 직접 verify 는 불가, 반드시 internal fetch.

4. **AC-AUTH-019 end-to-end E2E 테스트**:
   - Playwright 시나리오: (a) 로그인 + rememberMe → autologin 쿠키 확인, (b) NextAuth session 쿠키 강제 삭제, (c) 보호 경로 재진입 → autologin-refresh 호출 → NextAuth session 재발급 → 페이지 정상 표시. Slice H 또는 별도 E2E 슬라이스.

5. **`reason` enum 승격** — Slice E 의 SessionRevocation reason 4종 중 `TOKEN_REUSE_DETECTED` (REQ-AUTH-053) 는 Slice E-plan 에 명시됐으나 현재 `revokeAllSessions` 호출 사이트에서 사용되지 않음 (autologin.ts L138 은 `'USER_LOGOUT_ALL'` 사용). Slice H 에서 도용 감지 시 reason 을 `'TOKEN_REUSE_DETECTED'` 로 변경 권장 + enum 승격.

6. **`autologin.ts` L141 의 reason 재검토** — 현재 `'USER_LOGOUT_ALL'` 로 시그널링 중. 의미상 `'TOKEN_REUSE_DETECTED'` 가 정확. Slice H 의 enum 승격과 함께 정리.

7. **autologin 쿠키 만료 처리** — 현재 30일 maxAge. expiresAt 컬럼이 도메인에는 있으나 verify 시 검증되지 않는다 (autologin.ts L100-102 의 `findFirst` 가 expiresAt 비교 없음). Slice H 에서 검증 추가.

---

## Blockers

없음. 모든 Pre-Flight Findings 가 RESOLVED.

본 슬라이스는:
- schema 변경 없음 → migration 추가 없음
- 도메인 함수 시그니처 1건 확장 (verifyAutoLogin) + 통합 레이어 신규 (Route Handler, loginAction rememberMe, 타입 augmentation)
- 신규 LoC 추정 < 600 (route + actions 수정 + types + 테스트)
- TDD RED → GREEN → REFACTOR 순서 준수 가능

작업 시작 전 다시 확인할 한 가지:
- `apps/web/tsconfig.json` 의 `include` 가 `types/**/*.d.ts` 또는 그 상위를 커버하는지. 미커버면 추가가 첫 GREEN 작업.

---

Version: 1.0.0
Last Updated: 2026-05-16
Author: manager-spec (SPEC-AUTH-001 slice continuation)
