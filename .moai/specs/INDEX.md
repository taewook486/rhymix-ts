# Rhymix-TS SPEC Index

> Rhymix CMS의 TypeScript + Next.js 16 풀스택 재설계 SPEC 모음
> 마지막 갱신: 2026-06-12 (SPEC-DOCUMENT-001 구현 완료)

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
| 2. CONTENT DOMAIN | 게시판/문서/댓글 CRUD 동작 | 3 | 1/3 | 🟡 DOCUMENT 완료, COMMENT·BOARD-CRUD 구현 대기 |
| 3. MEMBER ECOSYSTEM | 회원 ecosystem + cross-cutting (file/point/mail) | 3 | 0/3 | 🟡 SPEC 완료, 구현 대기 |
| 4. EXTENSION + POLISH | hook system + theme admin UI | 2 | 0/2 | 🟡 SPEC 완료, 구현 대기 |
| 5. ADMIN COMPLETION | export/import + 잔여 REQ | 1 | 0/1 | 🟡 SPEC 완료, 구현 대기 |

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
| [SPEC-COMMENT-001](./SPEC-COMMENT-001/spec.md) | 댓글 도메인 packages/comment 신설 | AUTH, DOCUMENT | 📝 SPEC 완료 (1,271줄) |
| [SPEC-BOARD-CRUD-001](./SPEC-BOARD-CRUD-001/spec.md) | board를 document+comment 의존 wrapper로 재정렬 + UI | AUTH, ADMIN, LAYOUT, DOCUMENT, COMMENT | 📝 SPEC 완료 (1,734줄) |

### Phase 3: MEMBER ECOSYSTEM (P1, 구현 대기)

| ID | 제목 | 의존 | 상태 |
|---|---|---|---|
| [SPEC-FILE-001](./SPEC-FILE-001/spec.md) | file 업로드 + sharp resize + cover image + cascade delete | AUTH, ADMIN, DOCUMENT, COMMENT | 📝 SPEC 완료 (1,693줄) |
| [SPEC-POINT-001](./SPEC-POINT-001/spec.md) | point 시스템 + board/document/comment 트랜잭션 통합 | AUTH, ADMIN, DOCUMENT, COMMENT | 📝 SPEC 완료 (1,298줄) |
| [SPEC-MAIL-001](./SPEC-MAIL-001/spec.md) | SmtpMailDispatcher + 3 templates + 재시도 정책 | AUTH, ADMIN | 📝 SPEC 완료 (2,081줄) |

### Phase 4: EXTENSION INFRASTRUCTURE + THEME POLISH (P1, 구현 대기)

| ID | 제목 | 의존 | 상태 |
|---|---|---|---|
| [SPEC-ADDON-001](./SPEC-ADDON-001/spec.md) | 선언적 hook system (onContentTransform / onPageView 등 4개) | PAGE, DOCUMENT, COMMENT, ADMIN | 📝 SPEC 완료 |
| [SPEC-THEME-POLISH-001](./SPEC-THEME-POLISH-001/spec.md) | admin/site/design 3-pane editor + dark mode toggle | LAYOUT, ADMIN | 📝 SPEC 완료 |

### Phase 5: ADMIN COMPLETION (P2, 구현 대기)

| ID | 제목 | 의존 | 상태 |
|---|---|---|---|
| [SPEC-ADMIN-EXTRAS-001](./SPEC-ADMIN-EXTRAS-001/spec.md) | export/import + 2FA enforce + DnD + WidgetPreset + IP filter + bulk ops | ADMIN, AUTH, WIDGET, DOCUMENT, COMMENT | 📝 SPEC 완료 |

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
         └── Phase 5 (📝 SPEC 완료)
             └── SPEC-ADMIN-EXTRAS-001 (모든 도메인 의존)
```

---

## 다음 단계

### 즉시 가능

1. **Phase 2 계속** — `/moai run SPEC-COMMENT-001`
   - DOCUMENT ✅ → **COMMENT** ← 현재 위치 → BOARD-CRUD 순서 (의존성 강제)
   - 각 SPEC 완료 후 `/moai sync` 권장
2. **Phase 3 병렬 가능** — FILE/POINT/MAIL은 서로 독립적
3. **Phase 4-5는 Phase 2-3 완료 후**

### 권장 워크플로우

```bash
# Phase 2 (의존성 강제)
/moai run SPEC-DOCUMENT-001    # ✅ 완료 (2026-06-12)
/clear
/moai run SPEC-COMMENT-001     # 다음
/clear
/moai run SPEC-BOARD-CRUD-001  # 마지막

# Phase 3 (병렬 가능)
/moai run SPEC-FILE-001
/moai run SPEC-POINT-001
/moai run SPEC-MAIL-001

# Phase 4-5
/moai run SPEC-ADDON-001
/moai run SPEC-THEME-POLISH-001
/moai run SPEC-ADMIN-EXTRAS-001
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
