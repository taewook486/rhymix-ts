# Rhymix-TS SPEC Index

> Rhymix CMS의 TypeScript + Next.js 16 풀스택 재설계 SPEC 모음
> 마지막 갱신: 2026-06-21 (SPEC-NOTIFICATION-001 sync 완료, status: completed — e2e 실행 검증 포함 전체 완료. 검증 중 발견한 사전 존재 결함 6건은 수정, 무관한 90건은 SPEC-TEST-DEBT-001로 분리)

## 기술 스택 (확정)

| 영역 | 선택 | 비고 |
|---|---|---|
| Framework | Next.js 16 (App Router) | RSC + Server Actions |
| Language | TypeScript 5.9+ | strict mode |
| Database | PostgreSQL 16+ | JSONB, GIN, citext, tsvector |
| ORM | Prisma 6.19 | greenfield schema |
| Auth | Auth.js v5 (NextAuth) | Credentials Provider 우선 |
| API | tRPC + Server Actions 혼합 | end-to-end 타입 안전 |
| UI | Tailwind CSS 4 + shadcn/ui | CSS variables 기반 테마 |
| 상태 관리 | Zustand | 클라이언트 UI 상태 (모달, 사이드바 등) |
| Testing | Vitest + Playwright | TDD 기반 |

---

## Phase 진척 매트릭스

MASTER-PLAN-002의 5-Phase 우선순위 축(사용자 가시성 기반).

| Phase | 목표 | SPEC 수 | 완료 | 상태 |
|---|---|---|---|---|
| 1. VISIBLE UI | 클린 설치 직후 의미 있는 홈이 보인다 | 3 | 3/3 | 🟢 구현 완료 |
| 2. CONTENT DOMAIN | 게시판/문서/댓글 CRUD 동작 | 3 | 3/3 | 🟢 구현 완료 |
| 3. MEMBER ECOSYSTEM | 회원 ecosystem + cross-cutting (file/point/mail) | 3 | 3/3 | 🟢 구현 완료 |
| 4. EXTENSION + POLISH | hook system + theme admin UI | 2 | 2/2 | 🟢 구현 완료 |
| 5. ADMIN COMPLETION | export/import + 잔여 REQ | 1 | 1/1 | 🟢 구현 완료 |
| 6. ADMIN LEGACY PARITY | 레거시 분석 기반 admin 미구현 기능 완성 | 1 | 1/1 | 🟢 구현 완료 (M1~M3 전체, status: completed v1.3.0) |
| 7. BACKLOG FOLLOW-UP | KEEP 레거시 모듈 후속 구현 (rss/poll/message/notification) | 2 | 2/2 | 🟢 구현 완료 (FEED-001, NOTIFICATION-001 Slice A+B 모두 완료. e2e만 후속 deferred) |
| 8. ADMIN SECURITY HARDENING | 보안 리뷰에서 파생된 후속 구현 (2FA TOTP 백엔드 등) | 2 | 2/2 | 🟢 구현 완료 (ADMIN-2FA-OTP-001 + TEST-PRISMA-MOCK-001 전체 완료) |

---

## SPEC 목록

### Foundation (이미 완료된 SPEC)

| ID | 제목 | 우선순위 | 상태 |
|---|---|---|---|
| [SPEC-INSTALL-001](./SPEC-INSTALL-001/spec.md) | Initial Installation Wizard | P0 | ✅ Slice A-D 완료 (859 tests) |
| [SPEC-ADMIN-001](./SPEC-ADMIN-001/spec.md) | Admin Dashboard & Module System | P0 | ✅ Slice A-F 완료, G→WIDGET-001 흡수, H/I→ADMIN-EXTRAS-001 |
| [SPEC-AUTH-001](./SPEC-AUTH-001/spec.md) | Authentication & Member System | P0 | ✅ Slice A-H 완료 (508 tests) |
| [SPEC-CONTENT-001](./SPEC-CONTENT-001/spec.md) | Content & Board System | P0 | ✅ Slice A-F + UI 완료, Slice B→DOCUMENT/COMMENT/BOARD-CRUD 분할 |
| [SPEC-THEME-001](./SPEC-THEME-001/spec.md) | Theme, Layout & Skin System | P1 | ✅ Slice A-F 완료, Slice E/F→THEME-POLISH-001 흡수 |

### Phase 1: VISIBLE UI FOUNDATION (P0, 구현 완료)

| ID | 제목 | 의존 | 상태 |
|---|---|---|---|
| [SPEC-LAYOUT-001](./SPEC-LAYOUT-001/spec.md) | 레이아웃 시스템 + default theme | AUTH, ADMIN | ✅ 구현 완료 |
| [SPEC-PAGE-001](./SPEC-PAGE-001/spec.md) | page 모듈 (ModuleInstance.mcontent + widget 토큰) | LAYOUT, WIDGET | ✅ 구현 완료 (d34d953) |
| [SPEC-WIDGET-001](./SPEC-WIDGET-001/spec.md) | 위젯 시스템 (token parser + builtin 2개 + admin UI) | LAYOUT, ADMIN | ✅ 구현 완료 (d34d953) |

### Phase 2: CONTENT DOMAIN (P0, 구현 대기)

| ID | 제목 | 의존 | 상태 |
|---|---|---|---|
| [SPEC-DOCUMENT-001](./SPEC-DOCUMENT-001/spec.md) | 문서 도메인 packages/document 독립 분리 | AUTH, ADMIN, LAYOUT | ✅ 구현 완료 (201 tests, a2c02f5) |
| [SPEC-COMMENT-001](./SPEC-COMMENT-001/spec.md) | 댓글 도메인 packages/comment 신설 | AUTH, DOCUMENT | ✅ 구현 완료 (Slice A+B+C, 5744dd6) |
| [SPEC-BOARD-CRUD-001](./SPEC-BOARD-CRUD-001/spec.md) | board를 document+comment 의존 wrapper로 재정렬 + UI | AUTH, ADMIN, LAYOUT, DOCUMENT, COMMENT | ✅ 구현 완료 (Slice A+B+C, 719438b) |

### Phase 3: MEMBER ECOSYSTEM (P1, 구현 대기)

| ID | 제목 | 의존 | 상태 |
|---|---|---|---|
| [SPEC-FILE-001](./SPEC-FILE-001/spec.md) | file 업로드 + sharp resize + cover image + cascade delete | AUTH, ADMIN, DOCUMENT, COMMENT | ✅ 구현 완료 (Slice A+B+C, 96 tests, 93a334e) |
| [SPEC-POINT-001](./SPEC-POINT-001/spec.md) | point 시스템 + board/document/comment 트랜잭션 통합 | AUTH, ADMIN, DOCUMENT, COMMENT | ✅ 구현 완료 (Slice A+B, 24 tests, 8072dc0) |
| [SPEC-MAIL-001](./SPEC-MAIL-001/spec.md) | SmtpMailDispatcher + 3 templates + 재시도 정책 | AUTH, ADMIN | ✅ 구현 완료 (30 tests, 24bca93) |

### Phase 4: EXTENSION INFRASTRUCTURE + THEME POLISH (P1, 구현 완료)

| ID | 제목 | 의존 | 상태 |
|---|---|---|---|
| [SPEC-ADDON-001](./SPEC-ADDON-001/spec.md) | 선언적 hook system (onContentTransform / onPageView 등 4개) | PAGE, DOCUMENT, COMMENT, ADMIN | ✅ 구현 완료 (`ba0a36b`) |
| [SPEC-THEME-POLISH-001](./SPEC-THEME-POLISH-001/spec.md) | admin/site/design 3-pane editor + dark mode toggle | LAYOUT, ADMIN | ✅ 구현 완료 (`0739f05`) |

### Phase 5: ADMIN COMPLETION (P2, 구현 완료)

| ID | 제목 | 의존 | 상태 |
|---|---|---|---|
| [SPEC-ADMIN-EXTRAS-001](./SPEC-ADMIN-EXTRAS-001/spec.md) | export/import + 2FA enforce + DnD + WidgetPreset + IP filter + bulk ops | ADMIN, AUTH, WIDGET, DOCUMENT, COMMENT | ✅ 구현 완료 (`6ee92fc`) |

### Phase 6: ADMIN LEGACY PARITY (P1, 구현 완료)

| ID | 제목 | 의존 | 상태 |
|---|---|---|---|
| [SPEC-ADMIN-002](./SPEC-ADMIN-002/spec.md) | 관리자 패널 미구현 기능 완성 (레거시 분석 기반) — 대시보드/레이아웃/회원설정/콘텐츠관리/사이트설정/고급 | 전 도메인 | ✅ 구현 완료 (M1~M3 전체, `9551d60`) |

> 레거시 Rhymix PHP admin 전체 디스패치 함수 인벤토리 대비 gap 분석. 60+ REQ를 6개 섹션·3개 Phase로 구조화. P1 22건(대시보드·페이지·회원그룹·회원설정·문서/댓글관리·알림/보안) — **구현 완료**. P2 24건(레이아웃·파일·신고·SEO·스팸필터·통계·도메인 등) — **구현 완료**. P3 16건(설문·태그·닉네임이력·쪽지·서버환경) — **구현 완료**. 예외: REQ-ADMIN2-049(소셜 로그인 프로바이더 토글)는 전제 조건인 소셜 프로바이더 설정이 코드베이스에 부재해 DEFERRED·백로그 재분류, REQ-ADMIN2-161(비동기 작업 큐 모니터링, 선택)은 사용자가 비채택 결정.
> M1 구현 후 독립 보안 리뷰에서 SMTP 비밀번호 평문 노출, 회원 그룹 `isAdmin` 권한 상승 경로, 설정 비원자적 쓰기, 대시보드 위젯 순차 fetch 4건을 발견·수정함 (상세: SPEC-ADMIN-002/spec.md `## Implementation Notes`).

### Backlog Evaluation (평가/Triage SPEC, 구현 없음)

| ID | 제목 | 우선순위 | 상태 |
|---|---|---|---|
| [SPEC-MODULE-BACKLOG-001](./SPEC-MODULE-BACKLOG-001/spec.md) | 미포팅 레거시 모듈 14종 평가 및 처분 (Triage) | P3 | ✅ SPEC 완료 (평가 문서 — 구현 없음) |
| [SPEC-TEST-DEBT-001](./SPEC-TEST-DEBT-001/spec.md) | 사전 존재 단위 테스트 실패 90건 Triage | P2 | ✅ SPEC 완료 (평가 문서 — 구현 없음) |

> MASTER-PLAN-002 §8.1·§5.13의 위임에 따라 미포팅 레거시 PHP 모듈 14종(poll/tag/trash/rss/counter/importer/krzip/editor/session/communication/message/ncenterlite/integration_search/autoinstall)을 1차 소스 직접 분석으로 triage. 결과: **KEEP 4** (poll→프론트 투표 위젯, rss→피드, communication→쪽지, ncenterlite→알림센터) · **DROP 8** (counter/editor/session/message/krzip/autoinstall + tag·trash 독립화 — 이미 구현됐거나 Auth.js/Next.js/Tiptap/npm으로 대체) · **NEEDS-RESEARCH 2** (importer→데이터 마이그레이션 SPEC 종속, integration_search→검색 백엔드 결정 선행). KEEP 4종 후속 SPEC 후보: SPEC-POLL-WIDGET-001 / SPEC-FEED-001 / SPEC-MESSAGE-001 / SPEC-NOTIFICATION-001 (모두 가칭, 미작성).
>
> 저장소 루트 전체 `npx vitest run`(24 파일 실패 / 199 통과, 90 테스트 실패 / 1724 통과 / 7 skip)에서 드러난 **사전 존재** 단위 테스트 실패 90건을 4개 근본 원인 카테고리로 triage(전수 최근 작업 무관 — git-checkout 재현·격리 실행으로 독립 검증). 결과: **카테고리 1 Prisma mock 불완전**(~50+건, 원인 확정, **FIX-LATER** — 공유 완전 mock 팩토리 권장) · **카테고리 2 Next.js 16 App Router 테스트 환경 비양립**(~39건, `headers()`/`useSearchParams()` 요청 스코프 부재, 원인 확정, **ACCEPT→FIX-LATER** — 공유 셋업 헬퍼/`next/jest` 권장) · **카테고리 3 2FA 미들웨어 특정 버그**(2건, `requireAdmin2FAIfEnabled`가 `FORBIDDEN` 대신 `UNAUTHORIZED` + 검증 세션 거부 — **실제 제품 버그 가능성**, **FIX-NOW·본 triage 1순위**) · **카테고리 4 기타 one-off**(나머지, 원인 미특정, **INVESTIGATE** 사례별). 권장 수정 순서: 3(2FA, 보안 관련) → 1(최다·최저난이도) → 2(공유 헬퍼) → 4(사례별). 본 SPEC은 코드 변경 0건.

### Phase 7: BACKLOG FOLLOW-UP (KEEP 모듈 후속 구현, P2~P3)

> SPEC-MODULE-BACKLOG-001 triage 의 KEEP 4종(rss 피드 · poll 위젯 · 쪽지 · 알림센터)을 개별 구현 SPEC으로 분리하는 Phase. Phase 1~6 코어 포팅 완료 이후의 backlog follow-up.

| ID | 제목 | 의존 | 우선순위 | 상태 |
|---|---|---|---|---|
| [SPEC-FEED-001](./SPEC-FEED-001/spec.md) | 게시판별 RSS 2.0 / Atom 1.0 피드 (Next.js Route Handler) | BOARD-CRUD, DOCUMENT, COMMENT | P2 | ✅ 구현 완료 (Slice A/B/C, 12/12 태스크) |
| [SPEC-NOTIFICATION-001](./SPEC-NOTIFICATION-001/spec.md) | 인앱 알림 센터 (댓글 알림 + 목록/읽음처리 + 설정/구독해제 + 멘션) | COMMENT, DOCUMENT, AUTH | P2 | ✅ 구현 완료 (Slice A+B + e2e 실행 검증 + sync 전체 완료, status: completed) |

> rss 레거시 모듈(SPEC-MODULE-BACKLOG-001 §1.4 KEEP)의 후속 구현. `app/[mid]/rss/route.ts` + `app/[mid]/atom/route.ts` 분리 라우트(공유 빌더), `listDocuments` PUBLIC-only 데이터 소스, 비밀글/임시저장/비공개 게시판 제외, `revalidate=300`+SWR+문서 이벤트 `revalidateTag` 3중 캐싱, `Board.feedConfig Json` additive 컬럼 + board admin 확장 설정 패널. 36개 REQ(REQ-FEED-001~066), 3개 슬라이스 전체 완료. `pnpm tsc --noEmit` 0 errors / vitest 67/67 통과 / expert-security 리뷰 CRITICAL·HIGH 0건. 통합 피드·팟캐스트 RSS·WebSub 명시 제외.
>
> ncenterlite 레거시 모듈(SPEC-MODULE-BACKLOG-001 §3.B KEEP)의 후속 구현. Slice A(MVP): `packages/notification` 패키지 신설(point 패턴) + Notification/NotificationPreference 스키마, `packages/comment/src/service.ts` 댓글 작성 훅 연동, `(member)/notifications` + `(member)/settings/notifications` 라우트, `NotificationBell`(GlobalHeader 연동). Slice B(@mention 감지): `packages/notification/src/mention.ts`의 정규식 기반 후보 추출 + `hooks.ts`의 `onMentionDetected`(자기-멘션·중복 억제는 기존 `NotificationService.create` 가드 재사용, 신규 로직 미중복) + `comment/src/service.ts` 트랜잭션 연동. e2e 실행 검증(2026-06-21): 작성만 되어 있던 `notification.spec.ts`를 Postgres 가용 환경에서 실제 실행, REQ-NOTIF-065 + AC-NOTIF-B1 모두 cold-start 포함 재현 PASS 확인. 검증 과정에서 SPEC 범위 밖 사전 존재 결함 6건 발견·수정(Turbopack ESM `.js` import로 dev 서버 전체 부팅 실패, `sanitizeHtml`의 `require()` ESM 비호환, jsdom `__dirname` 가상화 ENOENT, `requireAuth`의 세션 id string/number 타입 불일치로 모든 인증 사용자 401, `notifications.id` 마이그레이션의 SERIAL 시퀀스 누락으로 INSERT 전부 실패, 알림 읽음처리 inline Server Action으로 페이지 전체 500) — 상세는 `spec.md` HISTORY 참조, 신규 마이그레이션 `20260625000000_fix_notification_id_sequence` 포함. 커밋 `989fb65`. 전체 단위테스트 재실행으로 신규 회귀 없음 확인(무관한 사전 존재 실패 90건은 `SPEC-TEST-DEBT-001`로 분리). status: completed. KEEP 나머지 2종(SPEC-POLL-WIDGET-001/SPEC-MESSAGE-001)은 미작성 백로그.

### Phase 8: ADMIN SECURITY HARDENING (보안 후속 구현, P1)

> Phase 6 ADMIN LEGACY PARITY 및 SPEC-TEST-DEBT-001 triage에서 파생된 보안 후속 구현 Phase. 게이트(enforcement)는 이미 동작하나 그것을 통과시켜줄 실제 메커니즘이 stub인 gap을 메운다.

| ID | 제목 | 의존 | 우선순위 | 상태 |
|---|---|---|---|---|
| [SPEC-ADMIN-2FA-OTP-001](./SPEC-ADMIN-2FA-OTP-001/spec.md) | 관리자 2단계 인증(TOTP) 실제 백엔드 구현 (시크릿 발급/암호화/검증 + 세션 플래그) | AUTH-001, ADMIN-001, ADMIN-EXTRAS-001 | P1 | ✅ 구현 완료 |
| [SPEC-TEST-PRISMA-MOCK-001](./SPEC-TEST-PRISMA-MOCK-001/spec.md) | 공유 완전 Prisma mock 팩토리 도입 (TEST-DEBT 카테고리 1 ~50+건 해소, 테스트 인프라 전용) | TEST-DEBT-001 | P2 | ✅ 구현 완료 |

> SPEC-TEST-DEBT-001 triage 카테고리 1(Prisma mock 불완전, ~50+건, 원인 확정·재유도 금지)의 후속 **수정** SPEC. 테스트별 부분 hand-rolled mock(`vi.fn()` 모델 스텁 / 주입형 `mockPrisma`)을 Prisma 클라이언트 형태에서 완전성이 파생되는 **공유 mock 팩토리**(REQ-TDEBT-011 권고)로 대체해 `undefined` accessor / `$transaction is not a function` / TRPCError 래핑 시그니처를 0건으로 만든다. **production/소스 코드 변경 0건, 테스트 대상 동작 불변** — mock 완전성만 채운다. 라이브러리(예: `vitest-mock-extended` `mockDeep<PrismaClient>()`)·팩토리 위치는 run phase 결정. 23개 REQ(REQ-PMOCK-001~023). 카테고리 2(App Router)/3(2FA, RESOLVED)/4(one-off) 미접촉. 영향 파일 9종 enumerate(비전수 — 동일 시그니처 전수가 진짜 경계).

> SPEC-TEST-DEBT-001 triage 중 발견한 admin 2FA enforcement CRITICAL 우회 취약점(siteId 하드코딩 → production 상시 우회, CVSS≈8.8, OWASP A07:2021)을 fail-closed로 긴급 수정(`b220fd1`)한 뒤, 그 과정에서 드러난 더 근본적 gap을 메우는 신규 구현 SPEC. **현재 2FA verify 흐름 전체가 미구현 stub**(시크릿 발급=하드코딩 `JBSWY3DPEHPK3PXP`, enroll/verify=`setTimeout` 시뮬레이션, 세션 플래그 `twoFactorVerified`를 채우는 코드 0건, `checkAdmin2FA`의 등록여부 확인=skip)이라, 운영자가 `requireAdminTwoFactor=true`를 켜면 모든 관리자가 영구 lockout 된다(fail-closed의 의도된 결과). 본 SPEC은 Prisma 2FA 컬럼(시크릿 AES-256-GCM 암호화·백업코드 해시) + `otplib`/`qrcode` 도입 + enroll/verify tRPC mutation(닭-달걀 방지 `admin2FAProcedure`) + Auth.js v5 `update()` 경유 세션 플래그 set + `checkAdmin2FA` 등록여부 실제 확인 + 중복 헬퍼(`two-factor.ts` vs `two-factor-gate.ts`) 일원화를 다룬다. **게이트 미들웨어·enroll/verify 페이지 골격·정책 저장은 이미 존재하므로 제외.** Open Questions 7건(세션 플래그 set 메커니즘 등)은 best-judgment로 confidence와 함께 spec.md §6에 확정. **운영 경고: 본 SPEC 배포 완료 전까지 `requireAdminTwoFactor`를 켜면 안 됨.**

### Meta-Plan 문서 (참조)

| 문서 | 역할 | 상태 |
|---|---|---|
| [MASTER-PLAN-002/](./MASTER-PLAN-002/) | 전체 청사진, Phase 매트릭스, 의존성 그래프, 흡수 매트릭스 | 📚 참조용 (분할 완료) |
| [REMEDIATION-PLAN-001.md](./REMEDIATION-PLAN-001.md) | 1차 리뷰 후속 조치 (THEME Slice E/F, ADMIN Slice H/I, MAIL) | 📚 참조용 (각 SPEC으로 흡수됨) |

---

## 의존성 그래프

```
SPEC-ADMIN-001 (Foundation, ✅)
    ├── SPEC-AUTH-001 (✅)
    ├── SPEC-INSTALL-001 (✅)
    └── SPEC-CONTENT-001 (✅, Slice B 미구현→분할됨)
         │
         ├── Phase 1 (✅ 구현 완료)
         │   ├── SPEC-LAYOUT-001
         │   ├── SPEC-PAGE-001
         │   └── SPEC-WIDGET-001
         │
         ├── Phase 2 (📝 SPEC 완료)
         │   ├── SPEC-DOCUMENT-001
         │   ├── SPEC-COMMENT-001 (→ DOCUMENT 의존)
         │   └── SPEC-BOARD-CRUD-001 (→ DOCUMENT + COMMENT 의존)
         │
         ├── Phase 3 (📝 SPEC 완료, cross-cutting)
         │   ├── SPEC-FILE-001 (DOCUMENT + COMMENT 의존)
         │   ├── SPEC-POINT-001 (DOCUMENT + COMMENT 의존)
         │   └── SPEC-MAIL-001 (AUTH 의존, 독립적)
         │
         ├── Phase 4 (📝 SPEC 완료)
         │   ├── SPEC-ADDON-001 (PAGE + DOCUMENT + COMMENT 의존)
         │   └── SPEC-THEME-POLISH-001 (LAYOUT 의존, 독립적)
         │
         ├── Phase 5 (✅ 구현 완료)
         │   └── SPEC-ADMIN-EXTRAS-001 (모든 도메인 의존)
         │
         └── Phase 6 (📝 SPEC 완료)
             └── SPEC-ADMIN-002 (전 도메인 의존, 레거시 parity)
```

---

## 다음 단계

### 현황 (2026-06-27 기준)

Phase 1~8의 **모든 SPEC이 구현 완료** 상태다. 미구현 SPEC은 0건이다.

완료 이력:
1. Phase 1~6 구현 완료 (2026-06-20 기준)
2. Phase 7 (SPEC-FEED-001, SPEC-NOTIFICATION-001) 구현 완료 (2026-06-21 기준)
3. Phase 8 전체 완료 (2026-06-27 기준):
   - **`SPEC-ADMIN-2FA-OTP-001`** (✅ 구현 완료) — 관리자 TOTP 2FA: Prisma 마이그레이션, AES-256-GCM 암호화, otplib 검증, Auth.js v5 세션 플래그, 중복 헬퍼 일원화
   - **`SPEC-TEST-PRISMA-MOCK-001`** (✅ 구현 완료) — vitest-mock-extended 기반 공유 Prisma mock 팩토리. `$transaction`, `$queryRaw`, 전 모델 accessor 완전 구현. TEST-DEBT 카테고리 1 해소

### 다음 백로그 (선택적)

미작성 SPEC 2건 (우선순위 낮음):

- **SPEC-POLL-WIDGET-001** — SPEC-MODULE-BACKLOG-001 KEEP 항목. `/moai plan`으로 SPEC 작성 필요
- **SPEC-MESSAGE-001** — 쪽지(PM) 기능. `/moai plan`으로 SPEC 작성 필요

### 완료된 전체 워크플로우

```bash
# Phase 2 ✅
/moai run SPEC-DOCUMENT-001    # ✅ 완료 (a2c02f5)
/moai run SPEC-COMMENT-001     # ✅ 완료 (5744dd6)
/moai run SPEC-BOARD-CRUD-001  # ✅ 완료 (719438b)

# Phase 3 ✅
/moai run SPEC-FILE-001        # ✅ 완료 (93a334e)
/moai run SPEC-POINT-001       # ✅ 완료 (8072dc0)
/moai run SPEC-MAIL-001        # ✅ 완료 (24bca93)

# Phase 4 ✅
/moai run SPEC-ADDON-001       # ✅ 완료 (ba0a36b)
/moai run SPEC-THEME-POLISH-001 # ✅ 완료 (0739f05)

# Phase 5 ✅
/moai run SPEC-ADMIN-EXTRAS-001 # ✅ 완료 (v2.0.0, 6ee92fc) — deferred 5건 모두 구현 완료

# Phase 6 ✅
/moai run SPEC-ADMIN-002       # ✅ 완료 (v1.3.0, 9551d60) — M1~M3 전체
```

---

## 도메인 매핑 (Rhymix PHP → Rhymix-TS)

| Rhymix 개념 | Rhymix-TS 매핑 | SPEC |
|---|---|---|
| `mid` (모듈 인스턴스) | Next.js dynamic `[mid]` 라우트 + `ModuleInstance` | ADMIN-001 |
| `domains` (멀티사이트) | `middleware.ts` + `Domain`/`Site` 테이블 | ADMIN-001 |
| `member.extra_vars` | JSONB + Zod | AUTH-001 |
| `member_autologin` | 토큰 회전 + 디바이스 추적 | AUTH-001 |
| `modules/document/` | `packages/document/` (분리 대상) | **DOCUMENT-001** |
| `modules/comment/` | `packages/comment/` (신설) | **COMMENT-001** |
| `modules/board/` | `packages/board/` wrapper + UI | **BOARD-CRUD-001** |
| `modules/file/` + `files/attaches/` | `packages/file/` + `/api/files/upload` | **FILE-001** |
| `modules/point/` | `packages/point/` + cross-module hook | **POINT-001** |
| `modules/advanced_mailer/` | `SmtpMailDispatcher` (nodemailer) | **MAIL-001** |
| `modules/addon/` + `addons/` | declarative hook registry | **ADDON-001** |
| `modules/layout/` + `layouts/` | React Layout + ThemeAssignment | LAYOUT-001 (✅) |
| `modules/page/` | `packages/page/` | PAGE-001 (✅) |
| `modules/widget/` + `widgets/` | RSC 위젯 레지스트리 + token parser | WIDGET-001 (✅) |
| `modules/admin/` + adminlogging | export/import + AdminLog IP filter + 2FA | **ADMIN-EXTRAS-001** |

---

## 참고

- 원본 Rhymix 코드베이스: `D:\project\rhymix` (PHP, Docker `localhost:8080`)
- 메타-플랜: `.moai/specs/MASTER-PLAN-002/` (전체 청사진 + 흡수 매트릭스)
- 1차 SPEC 작성일: 2026-05-10
- 분할 갱신일: 2026-05-27 (MASTER-PLAN-002 → 9개 개별 SPEC 분할)
- 진행 방법: MoAI-ADK plan phase (manager-spec, 사용자 가시성 우선순위 축)
