# Rhymix-TS SPEC Index

> Rhymix CMS의 TypeScript + Next.js 16 풀스택 재설계 SPEC 모음
> 마지막 갱신: 2026-06-20 (SPEC-ADMIN-002 M3 구현 완료, status: completed v1.3.0 — Phase 6 전체 종료. SPEC-ADMIN-EXTRAS-001 상태 모순 정정)

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

### 즉시 가능

Phase 1~6의 모든 SPEC이 구현 완료 상태다(2026-06-20 기준). 다음 작업은 신규 SPEC 작성이 필요하다:

1. **`SPEC-MODULE-BACKLOG-001`** (미작성) — MASTER-PLAN-002 8.1절에서 언급된 미포팅 레거시 모듈 14종(poll/tag 독립화/rss/counter 등) 평가용. 아직 SPEC 문서로 구체화되지 않음.
2. **전체 E2E 스위트 실행** — Playwright 브라우저 통합 검증

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
