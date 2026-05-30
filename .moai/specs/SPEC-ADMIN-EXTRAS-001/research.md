---
id: SPEC-ADMIN-EXTRAS-001-research
title: Admin Extras — Research (placeholder + boost)
version: 0.1.0
status: stub
created: 2026-05-30
updated: 2026-05-30
author: MoAI manager-spec
parent: SPEC-ADMIN-EXTRAS-001
language: ko
---

# SPEC-ADMIN-EXTRAS-001 Research (Placeholder + Boost)

> NOTE: 본 문서는 stub이다. 전체 codebase 심층 분석(research)은 구현 착수 시점(`/moai run SPEC-ADMIN-EXTRAS-001`)에 수행한다. 현재는 MASTER-PLAN-002/research.md와 SPEC-ADMIN-001을 참조하며, 본 SPEC 작성에 필요한 핵심 grounded 사실 + 의사결정 boost 항목만 요약한다.

---

## 1. 흡수 출처와 자기 위치

### 1.1 흡수 매핑

본 SPEC은 다음 출처를 직접 흡수한다:

- **MASTER-PLAN-002 Section 5.12**: SPEC-ADMIN-EXTRAS-001 정의 (P2 Phase 5, 2 slices, +35 tests, headline 2개)
- **SPEC-ADMIN-001 Slice H**: export/import (REQ-ADMIN-091, 092, 093) + AdminFavorites (REQ-ADMIN-100, 101)
- **SPEC-ADMIN-001 Slice I**: 잔여 REQ — REQ-ADMIN-023 (2FA), REQ-ADMIN-031 (cross-level DnD), REQ-ADMIN-043 (WidgetInstance preset), REQ-ADMIN-072 (IP 필터), REQ-ADMIN-090 (모듈 일괄 작업)
- **REMEDIATION-PLAN-001 ADMIN Slice H + I discussion**: 본 SPEC이 supersede

본 SPEC은 SPEC-ADMIN-001의 직접 후속이며, ADMIN-001의 Slice A~F가 이미 완료되어 있음을 전제한다(status: completed). Slice G(위젯 registry/admin UI)는 이미 SPEC-WIDGET-001에 흡수되었으므로 본 SPEC의 위젯 프리셋 REQ는 SPEC-WIDGET-001 Slice D의 admin/widgets 페이지를 **확장**한다.

### 1.2 자기 위치 (Phase 5 / P2)

- Phase 5 마감 SPEC. MASTER-PLAN-002의 ADMIN 도메인 완결을 의미한다.
- Phase 1~4의 가시성 트리오(layout/page/widget), 콘텐츠(document/comment/file/board), 인증, 메일, 포인트, 애드온, 테마 폴리시가 모두 구현되어 있음을 전제로 한다.
- 본 SPEC 자체는 P2(중간 우선순위) — 운영 효율성과 정책 강제가 목적. 사용자 가시 기능(P0)이 아니므로 phase 마감 시점까지 일정 여유가 있다.

---

## 2. 이미 확인된 grounded 사실

### 2.1 Prisma 모델 (이미 존재, 변경 없음)

`packages/db/prisma/schema.prisma` 검증 결과:

- **AdminLog** (line 200~216): `id BigInt`, `actorId Int`, `action String`, `target String`, `diff Json`, `ip String?`, `userAgent String?`, `createdAt @db.Timestamptz`. 인덱스 3개 (`actorId+createdAt`, `target+createdAt`, `action+createdAt`). 본 SPEC은 신규 action 종류(`export.create`, `import.apply`, `import.failed`, `module.bulk.*`, `menu.reorder`)만 추가하며 스키마 미변경.
- **AdminFavorite** (line 219~233): `id Int`, `memberId Int`, `label String`, `href String`, `icon String?`, `listOrder Int`, `createdAt`, `updatedAt`. `User` 참조 cascade. 인덱스 `(memberId, listOrder)`. **본 SPEC은 그대로 활용**.
- **ModuleInstance** (SPEC-ADMIN-001 spec.md line 436~462): bulk 작업 대상.
- **MenuItem** (line 489~514): cross-level DnD 대상. parentId 자기 참조 트리 + `(menuId, parentId, listOrder)` 인덱스.
- **WidgetInstance** (schema.prisma line 528~538, SPEC-WIDGET-001에서 확인): `id Int`, `widgetName String`, `label String`, `props Json`. **본 SPEC은 변경 없이 preset 용도로 재사용**.

[검증됨, 2026-05-30] AdminLog와 AdminFavorite는 schema.prisma line 200, 219에서 직접 확인. ModuleInstance/MenuItem은 SPEC-ADMIN-001 §Prisma Schema 섹션 line 436, 489 인용. WidgetInstance는 SPEC-WIDGET-001/research.md §1.2에서 확인됨.

### 2.2 기존 admin 페이지 (apps/web/app/admin/)

[ls 검증, 2026-05-30] `apps/web/app/admin/`:
- `layout.tsx`, `layout.test.tsx`, `page.tsx` — 관리자 셸 기본
- `logs/`, `members/`, `menu/`, `modules/`, `pages/`, `settings/`, `system/`, `widgets/`

본 SPEC은 다음 페이지를 **확장**한다:
- `admin/menu/page.tsx` — cross-level DnD 추가
- `admin/modules/page.tsx` — 일괄 작업 UI 추가
- `admin/logs/page.tsx` — IP/CIDR 필터 추가
- `admin/widgets/page.tsx` — preset library 추가 (SPEC-WIDGET-001 Slice D 기반)
- `admin/settings/...` — export/import 페이지 추가
- `admin/2fa/...` — enroll/verify 페이지 신규

### 2.3 SPEC-ADMIN-001의 미구현 REQ (검증)

본 SPEC이 구현하는 REQ는 SPEC-ADMIN-001 spec.md에서 직접 확인:

- **REQ-ADMIN-023 (Event-Driven)**: `requireAdminTwoFactor=true` 시 관리자 라우트 진입에 2FA 검증 강제 (line 150~151)
- **REQ-ADMIN-031 (Event-Driven)**: 메뉴 빌더 드래그앤드롭 시 parentId + listOrder 단일 트랜잭션 갱신 (line 158~159)
- **REQ-ADMIN-043 (Optional)**: WidgetInstance를 DB에 저장하여 재사용 가능한 위젯 프리셋 (line 181~182)
- **REQ-ADMIN-072 (Event-Driven)**: 감사 로그 화면에서 actor/action/target/기간/**IP 필터** + 페이지네이션 + CSV 내보내기 (line 217~218)
- **REQ-ADMIN-090 (Ubiquitous)**: 회원/차단/모듈 인스턴스 일괄 작업 (line 230~231)
- **REQ-ADMIN-091/092/093 (Event-Driven/Event-Driven/Unwanted)**: export → dry-run → apply → 부분 적용 금지 (line 234~240)
- **REQ-ADMIN-100/101 (Ubiquitous/Event-Driven)**: AdminFavorite 사이드바 + 즉시 반영 (line 244~248)

본 SPEC의 EARS는 위 REQ들을 1:1 또는 N:1로 실현하며, ADMIN-001 REQ ID를 spec.md 본문에 명시한다.

### 2.4 SPEC-AUTH-001의 2FA 모델 (전제)

본 SPEC은 SPEC-AUTH-001의 2FA 모델(User.twoFactorEnrolled, twoFactorSecret, TOTP 검증 로직)을 재사용한다. 본 SPEC은 enforcement gate만 추가하므로 AUTH-001의 모델 변경 없음.

`packages/db/prisma/schema.prisma` line 315에서 `User.adminFavorites AdminFavorite[]` 관계 존재 확인. 2FA 관련 컬럼(추정: `twoFactorSecret`, `twoFactorEnrolledAt`)은 구현 시점에 schema.prisma에서 정확한 컬럼명 확인 필요. (Slice B 착수 시 expert-backend가 검증)

---

## 3. 의사결정 Boost 항목 (구현 시점에 확정할 사항)

### 3.1 Export Format JSON Schema Versioning

**Open Question 1**: `exportFormatVersion`을 어떤 정책으로 운영할 것인가?

**옵션 A — Semver MAJOR-match-only (권고)**
- v1.x importer는 v1.* 번들만 수용. v2.* 거부, v0.* 거부.
- v1 → v2 전환은 별도 마이그레이션 도구 또는 hand-edit JSON.
- 장점: 명확. importer 코드가 단순. backward compatibility 부담 없음.
- 단점: 운영자가 v1 → v2 전환 시 수동 작업 필요.

**옵션 B — Forward-Compatible Reader**
- v1 importer는 미지의 필드를 무시. 누락 필드는 default 적용.
- v2 → v1.x 옵션 B는 일부 정보 손실 가능.
- 장점: 운영자 자동 마이그레이션 가능성.
- 단점: 침묵 손실 위험. schema 진화 자유도 ↓.

**옵션 C — Backward-Compatible Reader**
- v1.x importer는 v1.* 만, v2.x importer는 v1 + v2 모두 수용.
- 장점: 운영자가 새 버전으로만 import 하면 됨.
- 단점: importer 코드 복잡도 ↑. 무한 backward 부담.

**권고**: 옵션 A. Phase 5는 v1.0.0 단일 버전이므로 backward compat 부담 없음. v2 도입 시 별도 SPEC에서 결정. expert-backend가 Slice A Step A1 착수 시 spec.md REQ-017 문구를 검토 후 확정.

**JSON Schema 라이브러리**: Zod (이미 프로젝트 표준). JSON Schema (draft-07) 별도 정의 불필요. Zod schema → `zod-to-json-schema` 변환이 필요해지면 백로그.

### 3.2 2FA Enforcement Flow

**Open Question 2**: TOTP only vs WebAuthn 추가?

**옵션 A — TOTP only (Phase 5 권고)**
- RFC 6238 TOTP 6자리 코드 + 백업 코드 N개.
- AUTH-001 모델 그대로 사용.
- 라이브러리: `otplib` (이미 AUTH-001에서 사용 추정) 또는 `node-otp-pkg`.
- 장점: 즉시 가능, 추가 모델 변경 없음.
- 단점: phishing 취약성(TOTP는 검증 코드를 사용자가 입력 → 피싱 사이트에서 가로채기 가능).

**옵션 B — WebAuthn 추가 (백로그)**
- 보안 키 또는 platform authenticator(Touch ID, Windows Hello).
- AUTH-001 schema 확장 필요 (credential storage, attestation 등).
- 라이브러리: `@simplewebauthn/server`, `@simplewebauthn/browser`.
- 장점: phishing 저항성.
- 단점: AUTH-001 모델 확장 + 별도 SPEC 의존성.

**권고**: 옵션 A. Phase 5는 enforcement gate만 우선 도입. WebAuthn은 별도 SPEC(가칭 SPEC-AUTH-WEBAUTHN-001)에서 다룸. user에게 Slice B 착수 전 확인 권장.

**Enforcement 두 지점 강제 (REQ-045)**:
1. `apps/web/app/admin/layout.tsx`의 server-side check → SSR 단계에서 redirect
2. `protectedAdminProcedure` 미들웨어 → tRPC 호출 단계에서 거부

두 지점 모두 통과해야만 admin 액션 가능. 우회 차단을 위해 tests에서 양쪽 분기를 명시적으로 검증.

### 3.3 CIDR 매칭 라이브러리

**Open Question 3**: 어떤 CIDR 매칭 라이브러리?

| 라이브러리 | 장점 | 단점 |
|---|---|---|
| `ipaddr.js` | zero-dep, IPv4/IPv6 + CIDR + 검증, 표준. npm weekly 25M+ | 약간 verbose API |
| `ip-cidr` | ipaddr.js wrapper, 직관적 API | 의존 추가 |
| `netmask` | IPv4 only | IPv6 미지원, 사용 부적합 |
| 자체 구현 | 의존 없음 | ReDoS 위험. 거부 |

**권고**: `ipaddr.js` 직접 사용. `ip-cidr` 래퍼는 학습 비용 vs 가독성 트레이드오프 분석 후 결정. expert-backend가 Slice B Step B7 착수 시 final pick.

**참고 사용 패턴** (의사결정 boost, 구현 시 검증):
```
import * as ipaddr from "ipaddr.js";
// CIDR 매칭
const [range, prefix] = ipaddr.parseCIDR("10.0.0.0/24");
const target = ipaddr.parse("10.0.0.5");
const matches = target.match([range, prefix]);
```

**Open Question 4**: 매칭을 DB 레벨에서 할 것인가, application 레벨에서 할 것인가?

**옵션 A — Application-level + LIMIT 페이지네이션 (권고)**
- AdminLog.ip는 현재 `String?`. PostgreSQL select → JS에서 ipaddr.js 매칭.
- LIMIT으로 페이지 단위 stream. 페이지당 100~500 row.
- 장점: schema 변경 없음. ipaddr.js 표준 라이브러리.
- 단점: 대규모 AdminLog(>1M)에서 CIDR /8 같은 광범위 필터는 느림.

**옵션 B — DB inet 마이그레이션**
- `AdminLog.ip String?` → `inet`. PostgreSQL `<<` 연산자로 CIDR 매칭.
- 인덱스 활용 가능 (GiST/GIN inet 인덱스).
- 장점: 빠름.
- 단점: 마이그레이션 비용 + 기존 데이터 변환 + Prisma `Unsupported("inet")` 사용.

**권고**: 옵션 A로 시작. 성능 문제 발생 시 후속 SPEC(SPEC-ADMIN-EXTRAS-002)에서 inet 마이그레이션. Slice B 착수 시 expert-backend가 prod 데이터 규모를 확인하고 결정.

### 3.4 메뉴 DnD 라이브러리

| 라이브러리 | 장점 | 단점 |
|---|---|---|
| `@dnd-kit/core` + `@dnd-kit/sortable` | TypeScript first, accessible, 활발한 유지보수, tree DnD 가능 | 학습 곡선 |
| `react-dnd` | 오랜 역사, 다양한 백엔드 | 유지보수 둔화, accessibility 약함 |
| `react-beautiful-dnd` | 직관적 API | **deprecated** (2024), 사용 비권장 |
| 네이티브 HTML5 DnD | 의존 없음 | 모바일 미지원, accessibility 약함 |

**권고**: `@dnd-kit/core` + `@dnd-kit/sortable`. expert-frontend가 Slice B Step B6 착수 시 확정.

**Cross-level DnD 패턴** (구현 boost):
- 노드 자체는 `useSortable` (sibling reorder)
- 노드의 자식 영역은 별도 droppable zone (cross-level drop)
- 드롭 시 mutation은 단일 `admin.menu.items.reorder` 배치 ops
- 사이클 검출은 클라이언트(UX) + 서버(신뢰 경계) 양쪽

### 3.5 Import Transaction Strategy

**대용량 import의 transaction timeout 위험**:
- PostgreSQL default transaction timeout은 없으나 connection idle timeout, statement timeout이 있음
- 50,000 entity ceiling으로 1차 가드, 그래도 부족 시 batched commit으로 변경 (각 batch가 별도 transaction, 실패 시 보상 작업 — 그러나 REQ-021의 "전체 롤백" 요구와 충돌)
- 권고: 단일 transaction + 1차 ceiling 50K 유지. 50K 이상 import는 별도 도구 또는 다중 export 분할 안내

**Conflict resolution UI**:
- dryRun이 conflict 목록을 반환 → UI에서 각 conflict별 radio 선택 (overwrite / skipConflict / abort)
- "전체 overwrite" 일괄 버튼 + "전체 skip" 일괄 버튼 제공
- 운영자가 N개 conflict를 일일이 결정해야 한다는 점은 UX 비용이나, 부분 적용 금지 정책의 비용

### 3.6 보안 위협 모델 검토

#### Import bundle을 통한 임의 코드 실행 (RCE)

**위협**: 운영자가 신뢰할 수 없는 JSON 번들을 업로드하면 어떤 일이 발생하는가?

**완화 (REQ-024)**:
- 번들은 순수 데이터. `JSON.parse` 결과를 그대로 사용.
- `eval`, `Function()`, dynamic `import()` 모두 importer 코드에서 금지. ESLint rule + CI 검증.
- ModuleConfig의 `config` JSON은 in-memory `ModuleDefinition.configSchema`로 Zod 검증.
- ModuleConfig 안에 코드처럼 보이는 string이 있어도 단순 string으로 저장. 실행 path 없음.

#### Import을 통한 권한 상승

**위협**: 운영자 X가 자기 자신을 admin 그룹에 추가하는 번들을 업로드?

**완화**:
- 본 SPEC의 export/import range는 **운영 구조**(menu, moduleInstance, siteSettings)만. 회원/그룹은 Non-Goals (REQ-025).
- `selection.siteSettings`는 사이트 보안 정책(2FA 강제 토글 포함)을 포함하므로, 이 토글 변경도 AdminLog로 기록 + AdminLog 검토를 정기 운영 책임으로 명시.
- 2FA 강제 토글이 false로 import되면, 운영자가 의도한 변경인지 확인하는 책임은 import 실행자에게 있음. importer는 dryRun에서 sensitive 항목(`siteSettings.requireAdminTwoFactor` 변경)을 강조 표시 (구현 boost).

#### 2FA 우회 시도

**위협 매트릭스**:
- URL 직접 접근 (`/admin/...` 직접 GET) → layout server check가 redirect (REQ-041, 042)
- tRPC 직접 호출 → `protectedAdminProcedure`가 거부 (REQ-045)
- Header 변조 (`X-2FA-Bypass: true` 류) → 미들웨어는 검사하지 않음. 차단됨
- Cookie 변조 (`session.adminTwoFactorVerified = true`) → 세션은 서버 측 저장 + signed. 클라이언트 변조 불가
- Method override (POST를 GET처럼) → 미들웨어는 method 무관하게 검사. 차단됨
- 2FA enroll 페이지에서 enroll 우회 시도 → enroll 페이지 자체는 미enrolled 관리자에게만 접근 가능. enroll 성공해야 다른 admin 페이지 진입

**테스트 강제** (REQ-092):
- 4 상태 매트릭스 = (enrolled/미enrolled) × (verified/미verified) — 4가지
- 비관리자 1개 negative test

#### AdminFavorite XSS

**위협**: 운영자가 `href="javascript:alert(1)"`나 `href="https://evil.com"`을 favorite으로 저장하면?

**완화 (REQ-034)**:
- `href`는 `/admin/` prefix String만 허용. 정규식: `/^\/admin\/[a-zA-Z0-9/_\-?&=#.]*$/`
- protocol(`http:`, `https:`, `javascript:`, `data:`)이나 host로 시작 거부.
- 사이드바 렌더 시 `<a href={fav.href}>`로 React가 자동 escape.
- Storybook 또는 React testing-library로 escape 검증.

#### Export 민감 정보 누출

**위협**: Export 번들이 운영자 노트북에 저장되거나 이메일로 전송될 수 있음. 민감 정보가 포함되면?

**완화 (REQ-010)**:
- redaction 리스트:
  - `User.passwordHash` (export 범위 외이지만 명시 금지)
  - `Session.token`
  - `User.twoFactorSecret`
  - `User.passwordResetToken`
  - `OAuthAccount.clientSecret`
  - `OAuthAccount.accessToken`, `refreshToken`
  - `Mail.smtpPassword`
  - `Mail.apiKey` (Resend/SendGrid)
  - File binary blob (path/checksum만 export)
- redaction을 serializer 단에서 강제. 테스트로 각 민감 컬럼이 결과 JSON에 절대 포함되지 않음을 검증.
- 운영자에게 "이 번들에 민감 정보는 redaction되었으나, 사이트 설정/URL 등은 포함됩니다. 안전한 채널로만 전송하세요"라는 메시지를 export 직후 표시 (UX 가드).

---

## 4. 구현 시점에 보강할 research 항목 (TODO)

Slice 착수 시 expert-backend / expert-frontend가 검증:

- [ ] AUTH-001의 정확한 2FA 컬럼명 (`twoFactorSecret`, `twoFactorEnrolledAt` 등) — schema.prisma 확인
- [ ] AUTH-001의 TOTP 검증 함수 이름 + 위치 — packages/auth 탐색
- [ ] `Session` 모델에 `adminTwoFactorVerified` 플래그 추가 가능한지, 또는 세션 스토어 별도 키로 둘지 결정
- [ ] SPEC-DOCUMENT-001의 직렬화 schema + 작성자 reference 표현 방식
- [ ] SPEC-COMMENT-001의 parent/child reference 표현 방식
- [ ] `ipaddr.js` vs `ip-cidr` 라이브러리 final pick + 라이선스 확인 (BSD/MIT 권고)
- [ ] `@dnd-kit/core` 버전 + tree DnD 패턴 확인
- [ ] `apps/web/app/admin/_components/` 디렉토리에 AdminSidebar가 이미 있는지 확인 (layout.tsx 내장일 가능성)
- [ ] tRPC procedure 단위 테스트의 mock 패턴 (msw vs vitest-mock-extended)
- [ ] WidgetInstance가 SPEC-WIDGET-001 Slice D에서 어디까지 CRUD되어 있는지 확인 (preset 확장 baseline)
- [ ] AdminLog의 신규 action 종류를 enum으로 강제할지, string 그대로 둘지 (Prisma 모델은 String이므로 application 레벨 enum 권고)
- [ ] Import dryRun → apply 사이의 상태 변화 감지 방법: dryRun 시점의 `siteVersion` 또는 latest `AdminLog.id` 비교

---

## 5. 참조

### 5.1 master plan + remediation

- `MASTER-PLAN-002/spec.md` Section 5.12 (line 361~369) — SPEC-ADMIN-EXTRAS-001 정의 (P2 Phase 5, 2 slices, +35 tests, headline 2개)
- `MASTER-PLAN-002/research.md` (관련 섹션) — ADMIN 도메인 인벤토리
- `REMEDIATION-PLAN-001.md` — ADMIN Slice H/I discussion (본 SPEC이 supersede)

### 5.2 SPEC 의존

- `.moai/specs/SPEC-ADMIN-001/spec.md` — REQ-ADMIN-023, 031, 043, 072, 090, 091, 092, 093, 100, 101 (본 SPEC이 실현)
- `.moai/specs/SPEC-AUTH-001/spec.md` — 2FA 모델 (재사용)
- `.moai/specs/SPEC-WIDGET-001/spec.md` — WidgetInstance + admin/widgets 페이지 (preset 확장 기반)
- `.moai/specs/SPEC-DOCUMENT-001/spec.md` — Document schema (선택적 export 대상)
- `.moai/specs/SPEC-COMMENT-001/spec.md` — Comment schema (선택적 export 대상)

### 5.3 코드 기반

- `packages/db/prisma/schema.prisma` (line 200~233: AdminLog + AdminFavorite, line 528~538: WidgetInstance) — 모델 검증
- `apps/web/app/admin/` (layout.tsx, menu/, modules/, logs/, widgets/, settings/, members/, system/) — 기존 admin 페이지
- `apps/web/server/api/admin/` (추정 위치) — 기존 tRPC 라우터

### 5.4 레거시 reference (port 대상이지만 직접 의존 아님)

- `D:\project\rhymix\modules\admin\` — 레거시 admin 구조 (메뉴/모듈/설정 export 패턴 참고)
- `D:\project\rhymix\modules\adminlogging\` — 레거시 admin log + IP 필터 패턴

### 5.5 외부 라이브러리 후보

- `ipaddr.js` (BSD-3-Clause) — CIDR 매칭
- `@dnd-kit/core` + `@dnd-kit/sortable` (MIT) — 메뉴 DnD
- `otplib` (MIT, AUTH-001에서 추정 사용) — TOTP 검증

---

Version: 0.1.0
Status: stub (boost section 포함, 구현 시점에 expert agent가 §3 결정 사항 확정 + §4 TODO 검증)
