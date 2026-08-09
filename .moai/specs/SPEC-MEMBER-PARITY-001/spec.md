---
id: SPEC-MEMBER-PARITY-001
title: "관리자 회원 메뉴 레거시 parity — 포인트 사이드바 링크 + 회원 목록 고급 기능"
version: "0.1.0"
status: completed
created: 2026-08-08
updated: 2026-08-09
author: manager-spec
priority: P1
phase: "Phase 11 — 관리자 회원 메뉴 레거시 parity"
module: "apps/web/app/admin/members, apps/web/components/admin/AdminSidebar"
lifecycle: spec-anchored
tier: M
tags: "member, admin, legacy-parity, sortable, bulk-operations, search, filter"
depends_on: [SPEC-MEMBER-ADMIN-001, SPEC-POINT-001]
related_specs: [SPEC-MEMBER-ADMIN-001, SPEC-POINT-001, SPEC-ADMIN-002]
---

# SPEC-MEMBER-PARITY-001 — 관리자 회원 메뉴 레거시 parity

> 레거시 Rhymix(PHP) admin의 회원 관련 화면과 rhymix-ts 현재 구현을 나란히 재설치·직접 비교하여
> 확인한 2개 기능 격차를 rhymix-ts 아키텍처에 맞게 이식한다. (1) 포인트 관리 페이지가 사이드바
> "회원" 섹션에 링크되어 있지 않은 고립 상태, (2) 회원 목록의 정렬/필터/검색/일괄 작업 기능 격차.

## HISTORY

- 2026-08-08 (v0.1.0): 최초 작성. 사용자가 레거시(Docker, `rhymix-app` 컨테이너, `/var/www/html`)와
  rhymix-ts를 각각 실제 화면으로 비교하여 확인한 다음 2개 격차 보고를 근거로 작성.
  코드베이스 직접 확인(Grep/Read)으로 다음을 검증:
  - `apps/web/app/admin/site/points/page.tsx` + `PointConfigForm.tsx`는 이미 구현 완료(SPEC-POINT-001)
    상태이며 직접 URL 접근 시 정상 동작함.
  - `apps/web/components/admin/AdminSidebar.tsx`의 "회원" 섹션(line 98-105)에는
    `/admin/members`, `/admin/members/groups`, `/admin/members/new`, `/admin/members/settings`
    링크만 존재하며 `/admin/site/points` 링크는 없음.
  - 레거시 `dispMemberAdminList`는 sortable headers(아이디/이메일/이름/닉네임/가입일/최근로그인),
    그룹 필터(그룹전체/관리그룹/준회원/정회원), 16옵션 검색 대상 드롭다운,
    per-row 체크박스+Check All+bulk 수정/삭제를 제공.
  - rhymix-ts `apps/web/app/admin/members/page.tsx`는 탭 필터(전체/최고관리자/승인/거부/미인증),
    단일 검색창(placeholder: "ID, 이메일, 닉네임 검색"), 상태 드롭다운,
    결과 테이블(프로필/ID/닉네임/이메일/상태/관리자/최근로그인)만 제공하며
    sortable 헤더, 그룹 필터, multi-field 검색, 체크박스, bulk 작업은 없음.

## 1. 배경 (Why)

레거시 Rhymix(Docker, `localhost:8080`, 소스는 컨테이너 `rhymix-app` 내부 `/var/www/html`)와 rhymix-ts
(`localhost:3000`)를 각각 실제 화면으로 비교한 결과, 회원 관리 영역에서 2개 기능 격차가
확인되었다.

### 1.1 격차 A — 포인트 관리 페이지 사이드바 고립

`apps/web/app/admin/site/points/page.tsx`는 SPEC-POINT-001 범위로 이미 구현 완료되어 있으며
직접 URL 접근(`http://localhost:3000/admin/site/points`) 시 정상 동작한다. 그러나
`apps/web/components/admin/AdminSidebar.tsx`의 "회원" 섹션에는 이 페이지로의 링크가 없다.
레거시 Rhymix의 "회원" admin category는 "포인트"(dispPointAdminConfig)를 회원목록/회원설정/회원그룹과
동등한 항목으로 포함한다.

### 1.2 격차 B — 회원 목록 기능 격차

rhymix-ts 회원 목록(`apps/web/app/admin/members/page.tsx`)은 다음 기능을 제공한다:
- 탭 필터: 전체/최고관리자/승인/거부/미인증 (5개)
- 검색: 단일 검색창 (placeholder: "ID, 이메일, 닉네임 검색")
- 상태 필터: 전체 상태/승인/미인증/정지/차단/삭제 드롭다운
- 결과 테이블: 프로필/ID/닉네임/이메일/상태/관리자/최근 로그인 (7컬럼)
- **없음**: sortable column headers
- **없음**: 회원 그룹 필터
- **없음**: multi-field 검색 대상 선택
- **없음**: per-row 체크박스 + Check All
- **없음**: bulk 삭제
- **없음**: bulk 수정 (stretch goal, out-of-scope 기록)

레거시 `dispMemberAdminList`(act=dispMemberAdminList)는 다음 기능을 제공한다:
- Sortable column headers: 아이디/이메일주소/이름/닉네임/가입일/최근로그인 (각 헤더는
  `sort_index`/`sort_order` 쿼리 파라미터를 토글하는 링크)
- Member-group filter dropdown: 그룹전체/관리그룹/준회원/정회원 (설정된 그룹에서 동적으로 populate)
- 16-option search-target dropdown: 아이디/이메일/이름/닉네임/전화번호/가입일시/
  가입일시(이상)/가입일시(이하)/가입IP주소/최근로그인일시/최근로그인일시(이상)/
  최근로그인일시(이하)/최근로그인IP주소/생일/사용자정의/관리자메모
- Checkboxes: per-row 체크박스 + "Check All" 헤더 체크박스
- Bulk actions: 선택된 행에 대한 bulk 수정(edit) / 삭제(delete)

## 2. 범위 (What)

본 SPEC은 레거시 Rhymix(PHP) admin의 회원 관리 화면과 rhymix-ts 현재 구현 간의 **2개 기능 격차**를 해소한다:

1. **포인트 사이드바 링크 추가**: `apps/web/components/admin/AdminSidebar.tsx`의 "회원" 섹션에 `/admin/site/points` 링크를 추가하여 고립된 포인트 관리 페이지를 접근 가능하게 한다.

2. **회원 목록 기능 parity**:
   - **Sortable headers**: 5개 컬럼(userId, email, nickName, createdAt, lastLoginAt)에 정렬 기능 제공
   - **회원 그룹 필터**: 그룹 선택 드롭다운("그룹전체" + 설정된 그룹 목록) 및 그룹별 회원 필터링
   - **Multi-field 검색**: 6개 필드(userId, email, nickName, phone, lastLoginAt, description)를 검색 대상으로 선택적 검색
   - **Bulk 삭제**: per-row 체크박스, Check All, 확인 다이얼로그, 일괄 soft delete + AuditLog

전체 제외 목록은 §6 "Exclusions (What NOT to Build)" 섹션을 참조한다.

## 3. 현재 상태 (검증된 사실)

### 3.1 격차 A — 포인트 페이지 구현 현황

`apps/web/app/admin/site/points/page.tsx`와 `apps/web/app/admin/site/points/PointConfigForm.tsx`는
SPEC-POINT-001 범위로 이미 완료 상태(completed)이다. 이 페이지는:
- 사이트 전체 포인트 설정을 관리
- 직접 URL 접근 시 정상 렌더링 및 기능 동작
- 레거시 `dispPointAdminConfig`의 기능적 대응물

그러나 `apps/web/components/admin/AdminSidebar.tsx`의 "회원" 섹션(line 98-105)에는
다음 4개 항목만 존재한다:
- `/admin/members` (회원 관리)
- `/admin/members/groups` (회원 그룹)
- `/admin/members/new` (회원 등록)
- `/admin/members/settings` (회원 설정)

`/admin/site/points` 링크는 없다.

### 3.2 격차 B — 회원 목록 백엔드 현황

`apps/web/server/api/routers/admin/user.ts`의 `admin.user.list` 프로시저는 현재 다음 파라미터를
지원한다:
- `q`: 검색어 (userId, email, nickName 포함 검색)
- `status`: UserStatus enum 필터
- `filterAdmin`: 최고관리자만 필터 (boolean)
- `page`, `pageSize`: 페이지네이션

그룹 필터, 정렬, bulk 작업은 구현되어 있지 않다.

### 3.3 Prisma 스키마 현황

`MemberGroup` 모델은 다음 컬럼을 갖는다:
- `id`, `siteId`, `title`, `isDefault`, `description`, `isAdmin`, `imageMark`, `listOrder`,
  `createdAt`
- `MemberGroupMember` 조인 테이블 통해 `User`와 N:M 관계

회원 목록에서 그룹 필터 구현 시 이 스키마를 그대로 활용할 수 있다.

## 4. 재발 방지 기록 ("완료" 마킹의 함정)

[HARD] 본 SPEC의 acceptance는 SPEC-MENU-001과 SPEC-MEMBER-ADMIN-001의 선례를 따라
**런타임 영속(저장 후 새로고침 또는 재조회 후 유지)** 을 관찰 기준으로 삼는다.
"컴포넌트가 렌더된다"/"백엔드 프로시저가 존재한다"만으로는 완료로 마킹하지 않는다.

---

## 5. 요구사항 (GEARS)

> **번호 체계 안내**: 아래 REQ-MPAR 번호는 001부터 020까지 빈틈없이(gapless) 연속으로 매겨져 있다.
> 번호는 연속하지만 세 개 그룹(슬라이스, A~C)으로 구분되어 있으며, 그룹 순서(A→B→C)와
> 각 그룹 내부의 상대적 순서는 우선순위/마이그레이션 리스크 오름차순을 그대로 반영한다.

### Group A — 포인트 사이드바 링크 추가 (Slice A, 최저 위험 · 단일 파일 수정)

- **REQ-MPAR-001** (Ubiquitous): AdminSidebar "회원" 섹션 **shall** `/admin/site/points` 링크를 추가한다.
  정확한 순서와 아이콘은 구현 결정 사항이며, 레거시 순서(회원목록/회원설정/회원그룹/포인트)를
  참고하되 rhymix-ts의 IA에 맞게 재배치할 수 있다.
- **REQ-MPAR-002** (Ubiquitous): 추가된 포인트 링크 **shall** 레거시 동등 기능을 제공하는
  `/admin/site/points` 페이지로 연결한다. 해당 페이지는 SPEC-POINT-001 범위로 이미
  구현 완료 상태이므로 페이지 자체의 재구현은 out of scope.

### Group B — 회원 목록 Sortable Column Headers (Slice B, 낮음 위험 · UI + 백엔드 확장)

- **REQ-MPAR-003** (Ubiquitous): 회원 목록 테이블 헤더 **shall** 최소한 다음 5개 컬럼에 대해
  정렬 가능한 상태를 제공한다: 아이디(userId), 이메일(emailAddress), 닉네임(nickName),
  가입일(createdAt), 최근 로그인(lastLoginAt).
- **REQ-MPAR-004** (Event-Driven): **When** 사용자가 정렬 가능한 컬럼 헤더를 클릭하면,
  시스템 **shall** 해당 컬럼을 기준으로 오름차순/내림차순 정렬을 토글한다. 정렬 방향과 상태 저장
  메커니즘은 plan.md의 핵심 설계 결정을 따른다.
- **REQ-MPAR-005** (Event-Driven): **When** 정렬 상태가 변경되면, 화면 **shall** 현재 활성 정렬 컬럼과
  방향을 시각적으로 표시한다. 정렬되지 않은 컬럼은 구별 가능해야 한다.
- **REQ-MPAR-006** (Ubiquitous): 백엔드 `admin.user.list` 프로시저 **shall** 정렬 파라미터를
  지원하도록 확장된다. 파라미터 설계는 plan.md §핵심 설계 결정을 단일 진실 원천으로 삼는다.
- **REQ-MPAR-007** (Ubiquitous): 정렬 동작 **shall** 레거시와 동등한 사용자 경험을 제공한다.
  헤더 클릭 시 즉시 재조회 및 정렬 적용한다. **정렬 변경 시 현재 페이지네이션 상태를 유지한다**
  (page 파라미터는 초기화하지 않는다).

### Group C — 회원 목록 고급 기능 (Slice C, 중간 위험 · UI + 백엔드 + Prisma 쿼리 확장)

#### C-1. 회원 그룹 필터

- **REQ-MPAR-008** (Ubiquitous): 회원 목록 화면 **shall** 회원 그룹 필터 드롭다운을 제공한다.
  드롭다운 **shall** "그룹전체" 옵션과 설정된 회원 그룹 목록(관리그룹/준회원/정회원 등)을
  표시한다. 그룹 목록은 `MemberGroup` 테이블에서 동적으로 조회된다.
- **REQ-MPAR-009** (Event-Driven): **When** 사용자가 특정 그룹을 선택하면, 시스템 **shall** 해당
  그룹에 속한 회원만 목록에 표시한다. 그룹 필터는 기존 상태 필터와 조합하여 동작한다(AND 조건).
- **REQ-MPAR-010** (Ubiquitous): 백엔드 `admin.user.list` 프로시저 **shall** `groupId` 파라미터를
  지원하도록 확장된다. 파라미터 설계는 plan.md §핵심 설계 결정을 단일 진실 원천으로 삼는다.
- **REQ-MPAR-011** (Where — capability gate): **Where** `MemberGroup` 설정이 하나도 없는 경우,
  드롭다운 **shall** "그룹전체" 옵션만 표시하며 정상 동작해야 한다.

#### C-2. Multi-Field 검색 대상 선택

- **REQ-MPAR-012** (Ubiquitous): 회원 목록 화면 **shall** 검색 대상 선택 드롭다운과 검색어
  입력창의 조합을 제공한다. 검색 대상 **shall** 최소한 다음 필드를 포함한다:
  아이디(userId), 이메일(emailAddress), 닉네임(nickName), 전화번호(phoneNumber),
  최근 로그인일시(lastLoginAt), 관리자 메모(description/관리자용 필드).
- **REQ-MPAR-013** (Event-Driven): **When** 사용자가 검색 대상과 검색어를 입력하고 검색을 실행하면,
  시스템 **shall** 선택된 대상 필드에서 검색어를 포함하는 행만 표시한다. 검색어 매칭은
  case-insensitive 부분 일치로 동작한다.
- **REQ-MPAR-014** (Ubiquitous): 백엔드 `admin.user.list` 프로시저 **shall** 검색 대상 필드를 지정하는
  파라미터를 지원하도록 확장된다. 파라미터 설계는 plan.md §핵심 설계 결정을 단일 진실
  원천으로 삼는다.
- **REQ-MPAR-015** (Ubiquitous): 검색 대상 드롭다운 **shall** 레거시의 16옵션 검색 대상 중 다음 6개 필드만
  포함한다: 아이디(userId), 이메일(emailAddress), 닉네임(nickName), 전화번호(phoneNumber),
  최근 로그인일시(lastLoginAt), 관리자 메모(description). 나머지 10개 옵션(가입일시 범위, IP 주소, 생일,
  사용자정의 등)은 out of scope다.
  제외 사유: 가입일시 범위 검색은 구현 복잡도 대비 사용자 가치가 낮고, IP 검색은 개인정보
  보안 우려, 생일/사용자정의 필드는 현재 스키마에 부재 또는 사용 빈도 낮음.

#### C-3. 체크박스 및 Bulk 삭제

- **REQ-MPAR-016** (Ubiquitous): 회원 목록 테이블 **shall** 각 행에 체크박스를 제공한다.
  체크박스 상태는 페이지네이션 간에 유지되지 않아도 된다(current page only).
- **REQ-MPAR-017** (Ubiquitous): 테이블 헤더 **shall** "Check All" 체크박스를 제공하여 현재 페이지의
  모든 행을 선택/해제할 수 있다.
- **REQ-MPAR-018** (Event-Driven): **When** 사용자가 하나 이상의 회원을 선택하고 "삭제" 작업을
  실행하면, 시스템 **shall** 선택된 회원들을 일괄 soft delete(`status → DELETED`)하는 기능을 제공한다.
  soft delete 방식을 채택하여 data를 보존하며 AuditLog로 감사 추적성을 유지한다. hard delete(실제
  `DELETE FROM users`)는 out of scope.
- **REQ-MPAR-019** (When — event-detected): **When** bulk 삭제를 실행하기 전, 시스템 **shall** 확인
  다이얼로그를 표시하여 사용자의 명시적 승인을 요구한다("선택한 N명의 회원을 삭제하시겠습니까?" 및
  회원 수 명시).
- **REQ-MPAR-020** (Ubiquitous): 백엔드 **shall** bulk 삭제를 위한 전용 프로시저를 제공한다.
  프로시저는 트랜잭션으로 원자적 실행되며, 각 회원 삭제 시 AuditLog를 기록한다.
  정확한 프로시저 이름은 plan.md §핵심 설계 결정을 단일 진실 원천으로 삼는다.

---

## 6. Exclusions (What NOT to Build)

### Out of Scope — 포인트 페이지 재구현

- `/admin/site/points` 페이지 자체는 SPEC-POINT-001 범위로 이미 완료 상태이다. 본 SPEC은
  사이드바 링크 추가만 다루며, 페이지 내용 재구현은 out of scope.

### Out of Scope — Bulk 수정 (Edit) 기능

- 레거시의 bulk 수정(edit) 기능은 out of scope로 기록한다. 사용자 가치 대비 구현 복잡도가 높고,
  현재 요구사항에는 포함되지 않았다. REQ-MPAR-018~020은 bulk 삭제만 다룬다.

### Out of Scope — Legacy 16옵션 검색 대상 일부

- REQ-MPAR-015의 "제외" 항목에 기록된 대로, 가입일시 범위 검색, IP 주소 검색, 생일/사용자정의
  검색은 out of scope다. 이 기능들은 레거시에는 존재하나 현재 rhymix-ts의 요구사항과 사용 패턴에는
  부합하지 않거나 개인정보 보안 우려가 있다.

### Out of Scope — 사이드바 IA 전체 재설계

- 사이드바 전체 구조나 섹션 순서 재배치는 out of scope다. 본 SPEC은 "회원" 섹션 내의 포인트
  링크 추가와 회원 목록 페이지 내의 기능 확장에만 집중한다.

### Out of Scope — 세션 종료 2026-08-08에 이미 수정된 4개 버그

- 다음 4개 버그는 이미 이 세션에서 수정 완료된 working-tree 변경 사항이며, 본 SPEC의 범위가
  아니다. 이 변경들은 commit-ready 상태로 남아 있으며, 본 SPEC의 HISTORY §1에 선행 맥락으로만
  기록된다:
  1. `packages/admin/src/settings.ts` `getSeoSettings` — `SiteNotFoundError` catch 및 defaults 반환
  2. `apps/web/app/install/admin-config/admin-config-form.tsx` — `useSsl` radio를 controlled
     `useState`로 변경
  3. `apps/web/server/api/routers/admin/settings.ts` `SignupSettingsSchema.defaultGroupId` —
     `.nullable()` 추가
  4. `apps/web/app/admin/members/groups/page.tsx` — delete-group form에 inline `'use server'` 지시어
     추가

### Out of Scope — 회원 그룹 재배치 UI

- SPEC-MEMBER-ADMIN-001 REQ-MADM-011~014에서 다루는 회원 그룹 재배치(드래그앤드롭) 기능은
  본 SPEC과 독립적이다. 본 SPEC의 그룹 필터는 조회 목적의 드롭다운만 제공한다.

---

## 7. 의존 / 관련 SPEC

| SPEC | 관계 |
|---|---|
| SPEC-MEMBER-ADMIN-001 | 회원 설정 "기본 설정" 탭, 닉네임 변경 기록, 차단 관리, 이메일 호스트 관리, 회원 그룹 재배치/이미지 마크를 다룸. 본 SPEC과 섹션 공유(회원 관리)하나 기능 영역은 중복되지 않음. |
| SPEC-POINT-001 | 포인트 시스템 구현(완료). 본 SPEC REQ-MPAR-001~002는 해당 페이지로의 사이드바 링크만 추가하며, 페이지 자체는 재구현하지 않음. |
| SPEC-ADMIN-002 | 관리자 설정, RBAC, 백엔드 라우터 패턴 제공. `admin.user.list` 프로시저 확장 시 이 패턴을 따름. |
| SPEC-AUTH-001 | `User`, `MemberGroup`, `MemberGroupMember` 스키마, `softDeleteUser`, 회원가입/로그인 파이프라인 제공. |

---

## 8. 미해결 질문 (모두 run phase에서 확정됨)

> 아래 5개 항목은 모두 run phase의 실제 구현을 통해 확정되었으므로 목록에서 제외한다.
> (REQ-MPAR-007(정렬 변경 시 페이지네이션 유지)과 REQ-MPAR-018(soft delete 채택)도 각각
> REQ 본문, plan.md M2/M5, acceptance.md D.8에서 이미 확정되어 있었다 — 동일 사유로 목록에서 제외.)
>
> - **REQ-MPAR-001 포인트 링크 순서/아이콘**: Lucide `Target` 아이콘을 채택했고, "회원" 섹션 내
>   순서는 레거시 순서(회원목록/회원설정/회원그룹/포인트, 포인트가 마지막)를 그대로 따랐다.
>   근거: `apps/web/components/admin/AdminSidebar.tsx` 105행, 커밋 7fefa0f (M1).
> - **REQ-MPAR-004 정렬 상태 저장 메커니즘**: 컴포넌트 로컬 상태가 아닌 URL 쿼리 파라미터
>   (`searchParams.sortBy`, `searchParams.sortOrder`) 방식을 채택했다.
>   근거: `apps/web/app/admin/members/page.tsx` 20~74행, 커밋 0bfe0b1 (M2).
> - **REQ-MPAR-020 bulk 프로시저 이름**: 별도의 `bulkDelete`/`bulkSoftDelete` 프로시저 대신,
>   기존 `admin.user.bulk` 프로시저를 `action: z.enum(['suspend', 'deny', 'approve', 'delete'])`로
>   확장하여 통합했다. `action === 'delete'`일 때 `softDeleteUser()`를 호출한다.
>   근거: `apps/web/server/api/routers/admin/user.ts` 257행, 커밋 5049675 (M5).
> - **REQ-MPAR-011 그룹 없는 경우 UX**: `MemberGroup`이 0개여도 별도 안내 메시지 없이
>   `<option value="">그룹전체</option>`만 표시하는 방식(질문의 옵션 1)을 채택했다.
>   근거: `apps/web/app/admin/members/page.tsx` 160행, 커밋 c7293c3 (M3).
> - **REQ-MPAR-015 제외 대상 명확화**: 가입일시(createdAt) 자체를 검색 대상에서 완전히
>   제외하는 방식(질문의 옵션 2)을 채택했다. plan.md M4 "Out-of-Scope 명확화" 절에서 이미
>   확정되어 있었고, 실제 구현(`apps/web/server/api/routers/admin/user.ts`)도 이를 따른다.
>   근거: 커밋 ee0cf5c (M4).
