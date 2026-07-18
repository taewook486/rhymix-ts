---
id: SPEC-MEMBER-ADMIN-001
title: "관리자 회원 메뉴 레거시 기능 완성 (기본 설정 · 닉네임 이력 · 차단 관리 · 이메일 호스트 · 그룹 재배치)"
version: "0.1.0"
status: in-progress
created: 2026-07-18
updated: 2026-07-18
author: manager-spec
priority: P1
phase: "Phase 11 — 관리자 회원 메뉴 레거시 parity"
module: "apps/web/app/admin/members"
lifecycle: spec-anchored
tier: M
tags: "member, admin, legacy-parity, moderation, security, prisma-migration"
depends_on: [SPEC-AUTH-001, SPEC-ADMIN-002]
related_specs: [SPEC-POINT-001, SPEC-ADMIN-2FA-OTP-001]
---

# SPEC-MEMBER-ADMIN-001 — 관리자 '회원' 메뉴 레거시 기능 완성

> 레거시 Rhymix(PHP) admin의 회원 관련 화면과 rhymix-ts 현재 구현을 나란히 재설치·직접 비교(Playwright)하여
> 확인한 5개 기능 격차(B/B-2/C-1/C-2/D)를 rhymix-ts 아키텍처에 맞게 이식한다. 관리자 사이드바 최상위 메뉴
> 재배치와 포인트 시스템은 명시적으로 이 SPEC의 범위 밖이다 (§5 참조).

## HISTORY

- 2026-07-18 (v0.1.0): 최초 작성. 사용자가 레거시(Docker, `rhymix-app` 컨테이너, `/var/www/html`)와
  rhymix-ts를 각각 DB 초기화 후 재설치하고 관리자 화면을 Playwright로 직접 비교해 확인한 격차 보고를
  근거로 작성. 코드베이스 직접 확인(Grep/Read)으로 다음을 검증:
  - `MemberGroup.imageMark`/`listOrder` 컬럼은 이미 스키마에 존재하나, `imageMark`는 앱 코드 어디에서도
    참조되지 않는 완전한 미사용 컬럼(마이그레이션 SQL과 dev 로그에만 등장)이고, `listOrder`는 그룹
    생성/수정 폼에 숫자 입력 필드로는 노출되어 있으나 드래그앤드롭 일괄 재배치 UI/API는 없음.
  - `admin.user.nicknameLog.list`, `admin.user.deniedList.{list,add,remove}` 프로시저는 이미 구현·테스트
    완료 상태이나 이를 사용하는 admin 페이지가 하나도 없음.
  - 이메일 호스트 허용/차단 관리는 Prisma 스키마·서버 라우터 어디에도 존재하지 않음(전체 grep 결과 0건) —
    신규 모델부터 필요.
  - `PasswordPolicyLevel` enum은 스키마에 정의되어 있으나 앱 코드 어디에서도 참조되지 않는 완전한 고아
    (orphan) enum.
  - 비밀번호 해시는 `packages/auth/src/password-config.ts`에서 Argon2id 단일 알고리즘으로 하드코딩되어
    있고(`@MX:ANCHOR`, "워크 팩터를 코드 곳곳에 흩어두면 일관성 없는 해시가 생성될 위험" 명시), 로그인 시
    레거시(md5/bcrypt/sha1) 해시를 자동으로 Argon2id로 재해싱하는 로직(REQ-AUTH-014)이 이미 존재함.
  - 레거시의 "회원 모듈 mid 지정" 개념은 rhymix-ts에 대응 구조가 없음 — 회원 영역은 고정 Next.js 라우트
    그룹 `(member)`이며, 레거시의 module-mid 커스터마이징 시스템은 애초에 이식 대상이 아닌 의도된
    아키텍처 차이로 판단(§5).
  - 위 조사 결과에 따라 §4 Group D(회원 설정 "기본 설정" 탭)의 비밀번호 관련 요구사항 3건 중 "알고리즘
    선택 UI"는 명시적으로 범위 밖으로 제외했다(§5) — 실제 대체 해시 구현이 없는 상태에서 선택 UI만 만들면
    "화면은 있으나 동작하지 않는" 인지 함정을 재현하게 된다(SPEC-MENU-001 §3, memory:
    feedback-dont-trust-completion-marking 재발 방지 원칙 적용). 이 축소 결정은 사용자 재확인이 필요한
    항목으로 plan.md §핵심 설계 결정에 별도 표시했다.
- 2026-07-18 (v0.1.0, plan-auditor iteration 2 재감사 대응): plan-auditor 재감사에서 발견된 결함을 사용자
  승인 하에 반영. (1) REQ-MADM 번호를 그룹별 예약 구간(reserved-range) 방식에서 001~035 완전 연속
  번호로 전면 재매김(그룹 순서 A→B→C→D→E와 그룹 내 상대적 순서는 그대로 유지, 번호만 압축) — 구 번호 →
  신 번호 전체 대응표는 `progress.md` §E.1에 기록. (2) REQ-MADM-011(구 022, 그룹 재배치),
  REQ-MADM-030(구 052, 이메일 호스트 등록), REQ-MADM-031(구 053, 이메일 호스트 삭제)에 하드코딩되어
  있던 신규 프로시저 이름(`admin.group.reorder`, `admin.user.emailHost.add`, `emailHost.remove`)을
  제거하고 동작/결과 중심 문장으로 재작성 — 정확한 프로시저 이름은 plan.md §핵심 설계 결정으로 이동(이미
  같은 처리가 되어 있던 REQ-MADM-028(구 050, 이메일 호스트 모델)과 동일한 수준으로 맞춤). (3)
  REQ-MADM-006(구 012, 차단 등록 중복 오류)의 "이해 가능한 오류 메시지"라는 테스트 불가능한 주관적
  표현을 "오류 메시지에 위반된 필드(kind, pattern)와 기존 등록 값을 명시한다"는 검증 가능한 기준으로
  교체(acceptance.md AC-B2도 동일하게 수정).

## 1. 배경 (Why)

레거시 Rhymix(Docker, `localhost:8080`, 소스는 컨테이너 `rhymix-app` 내부 `/var/www/html`)와 rhymix-ts
(`localhost:3000`)를 각각 DB 초기화 후 재설치하여 관리자 "회원" 메뉴를 실제 화면으로 직접 비교한 결과,
아래 5개 기능 격차가 확인되었다. 이미 존재하는 회원 목록/추가/그룹 CRUD/가입 양식/약관 편집/설정
5탭(가입·로그인·약관·기능·디자인)/개별 포인트 조정 기능은 건드리지 않고 확장만 한다.

## 2. 현재 상태 (검증된 사실)

### 2.1 격차 B — 회원 설정: "기본 설정" 탭 전체 부재

`apps/web/app/admin/members/settings/page.tsx`는 5개 탭(가입/로그인/약관/기능/디자인)만 렌더한다. 레거시
`dispMemberAdminConfig`(관리자 > 회원 > 회원 설정 > 기본 설정, `/var/www/html/modules/member/member.admin.view.php`
151번 줄, 폼 핸들러 `member.admin.controller.php` `procMemberAdminInsertDefaultConfig` 247번 줄)에 대응하는
"기본 설정" 탭이 전혀 없다. 코드 확인 결과 레거시 필드 중 일부는 이미 다른 탭에 존재한다
(`member.signup.requireEmailVerification`, `member.signup.allowDuplicateNickname`) — 이 SPEC은 그
필드들을 **재구현하지 않고 재사용**한다.

### 2.2 격차 B-2 — "닉네임 변경 기록" 탭 UI 부재

레거시 `dispMemberAdminNickNameLog`(회원 설정의 7번째 탭)에 대응하는 화면이 없다. 백엔드
`admin.user.nicknameLog.list`(`apps/web/server/api/routers/admin/user.ts` 289번 줄 부근)는 페이지네이션까지
포함해 이미 구현·테스트되어 있다.

### 2.3 격차 C-1 — 차단 관리 UI 부재

레거시 `procMemberAdminUpdateDeniedNickName`(1302번 줄) / `procMemberAdminUpdateDeniedID`(1341번 줄)에
대응하는 화면이 없다. 백엔드 `admin.user.deniedList.{list,add,remove}`(318번 줄 부근, `DeniedIdentifier`
모델의 `USER_ID`/`NICK_NAME` CRUD)는 이미 구현되어 있고, `packages/auth/src/signup.ts`가 가입 시 이미
이 테이블을 참조해 차단을 실제로 집행하고 있음을 확인했다.

### 2.4 격차 C-2 — 이메일 호스트 관리 전체 부재

레거시 `procMemberAdminUpdateManagedEmailHosts`(1264번 줄)에 대응하는 기능이 Prisma 스키마·서버
라우터 어디에도 없다(전체 코드베이스 grep 0건). 신규 모델부터 필요하다.

### 2.5 격차 D — 회원 그룹: 재배치 UI 및 이미지 마크 UI 부재

`MemberGroup` 모델은 이미 `imageMark String?`, `listOrder Int`를 갖고 있다. `listOrder`는
`apps/web/app/admin/members/groups/{new,[id]/edit}`의 숫자 입력 필드로 이미 편집 가능하지만, 레거시의
드래그앤드롭 일괄 재배치(`procMemberAdminUpdateGroupOrder`, 1600번 줄)에 대응하는 UI/API는 없다.
`imageMark`는 스키마에는 있으나 생성/수정 폼·목록 화면 어디에도 노출되지 않는 완전한 미사용 컬럼이다.

## 3. 재발 방지 기록 ("완료" 마킹의 함정)

[HARD] 본 SPEC의 acceptance는 SPEC-MENU-001의 선례를 따라 **런타임 영속(저장 후 새로고침 또는 재조회 후
유지)** 을 관찰 기준으로 삼는다. "컴포넌트가 렌더된다"/"백엔드 프로시저가 존재한다"만으로는 완료로
마킹하지 않는다. 특히 비밀번호 관련 설정(§4 Group D REQ-MADM-024~026)은 저장된 값이 실제 해시/검증
로직에 반영되는지까지 확인해야 한다 — 값만 저장되고 동작에 영향을 주지 않는 "장식용 설정"은 통과 기준을
충족하지 않는다.

---

## 4. 요구사항 (GEARS)

> **번호 체계 안내**: 아래 REQ-MADM 번호는 001부터 035까지 빈틈없이(gapless) 연속으로 매겨져 있다. 번호는
> 연속이지만 다섯 개 그룹(슬라이스, A~E)으로 구분되어 있으며, 그룹 순서(A→B→C→D→E)와 각 그룹 내부의
> 상대적 순서는 우선순위/마이그레이션 리스크 오름차순을 그대로 반영한다(plan.md § 슬라이스 분할 참조).
> 이전에는 그룹별 예약 구간(reserved-range, A:001~003, B:010~014, C:020~025, D:030~042, E:050~057)
> 방식을 사용했으나, plan-auditor 재감사(Must-Pass 규칙)에 대응해 완전 연속 번호로 재매김했다. 구 번호 →
> 신 번호 전체 대응표는 `progress.md` §E.1을 참조한다.

### Group A — 닉네임 변경 기록 조회 UI (Slice A, 최저 위험 · 의존 없음)

- **REQ-MADM-001** (Ubiquitous): 관리자 UI **shall** `admin.user.nicknameLog.list`를 그대로 사용하는
  읽기 전용 "닉네임 변경 기록" 화면을 제공한다 — 신규 백엔드 프로시저를 추가하지 않는다.
- **REQ-MADM-002** (Ubiquitous): 목록 화면 **shall** 회원 아이디/닉네임, 변경 전/후 닉네임, 변경 일시를
  표시하고, `changedByAdminId`가 채워진 행은 "관리자에 의한 변경"임을 표시한다.
- **REQ-MADM-003** (Where — capability gate): **Where** 기록이 1페이지를 초과하는 경우, 화면 **shall**
  `nicknameLog.list`의 기존 `page`/`pageSize` 파라미터로 페이지네이션한다.

### Group B — 아이디/닉네임 차단 관리 UI (Slice B, 최저 위험 · 의존 없음)

- **REQ-MADM-004** (Ubiquitous): 관리자 UI **shall** `admin.user.deniedList.list`로 조회한
  `DeniedIdentifier` 목록을 종류(USER_ID/NICK_NAME)별로 필터링해 표시하는 화면을 제공한다.
- **REQ-MADM-005** (Event-Driven): **When** 관리자가 종류와 패턴을 입력해 등록을 제출하면, 시스템
  **shall** `deniedList.add`를 호출하고 목록을 갱신한다.
- **REQ-MADM-006** (When — event-detected): **When** 이미 존재하는 `(kind, pattern)` 조합을 다시
  등록하려는 요청이 발생하면, 시스템 **shall** 오류 메시지에 위반된 필드(`kind`, `pattern`)와 기존
  등록된 값을 명시하여 표시하고, 어떤 행도 부분 반영하지 않는다.
- **REQ-MADM-007** (Event-Driven): **When** 관리자가 항목 삭제를 실행하면, 시스템 **shall**
  `deniedList.remove`를 호출하고 재조회 후 목록에서 제거된 상태를 반영한다.
- **REQ-MADM-008** (Ubiquitous): 등록 폼 **shall** 빈 패턴 제출을 클라이언트 측에서 차단하고, 서버
  측 검증(`min(1)`) 실패 시 원인을 그대로 화면에 노출한다(무음 실패 금지).

### Group C — 회원 그룹 재배치 + 이미지 마크 (Slice C, 낮음~중간 위험 · 마이그레이션 없음)

- **REQ-MADM-009** (Ubiquitous): 그룹 생성/수정 폼 **shall** `MemberGroup.imageMark`에 바인딩된 편집
  가능한 입력(이미지 URL 또는 업로드 경로)을 노출한다.
- **REQ-MADM-010** (Ubiquitous): 그룹 목록 화면 **shall** 각 그룹의 `imageMark`를(존재 시 썸네일,
  부재 시 "—") `listOrder` 컬럼과 함께 표시한다.
- **REQ-MADM-011** (Event-Driven): **When** 관리자가 그룹 목록에서 행을 드래그해 순서를 변경하면,
  시스템 **shall** 다수 그룹의 순서를 단일 트랜잭션으로 원자적으로 갱신하는 재배치 기능을 제공한다
  (정확한 구현 프로시저는 plan.md §핵심 설계 결정을 단일 진실 원천으로 삼는다).
- **REQ-MADM-012** (Event-Driven): **When** 재배치 요청이 성공하면, 화면 **shall** 재검증(revalidate)
  이후 서버가 확정한 순서를 반영한다 — 새로고침 시 사라지는 낙관적(optimistic) 전용 상태를 허용하지 않는다.
- **REQ-MADM-013** (When — event-detected): **When** 재배치 요청이 서버에서 실패하면, 화면 **shall**
  직전 영속 순서로 롤백하고 오류를 표시한다(허위 성공 표시 금지).
- **REQ-MADM-014** (Where — capability gate): **Where** 키보드 인터랙션이 가능한 경우, 재배치 컨트롤
  **shall** `MenuItemDnDTree` 패턴과 동일하게 키보드 재배치 및 Escape 취소를 지원한다.

### Group D — 회원 설정 "기본 설정" 탭 (Slice D, 중간 위험 · 마이그레이션 없음)

- **REQ-MADM-015** (Ubiquitous): 회원 설정 페이지 **shall** 레거시 순서(기본/가입/로그인/약관/기능/디자인)에
  맞춰 "기본 설정" 탭을 **첫 번째 탭**으로 추가한다.
- **REQ-MADM-016** (Ubiquitous): "기본 설정" 탭 **shall** 회원가입 허가 모드를 `허용 / 거부 / 가입키
  일치 시에만 허용`의 3값으로 저장한다. 기존 `member.signup.enabled` 불리언 값을 읽고 쓰는 코드와의
  하위 호환을 깨지 않는다(허용=참, 그 외=거짓으로 매핑 가능해야 한다).
- **REQ-MADM-017** (Event-Driven): **When** 가입 허가 모드가 "가입키 일치 시에만 허용"이고 방문자가
  가입 페이지에 설정된 키와 일치하지 않는 URL 파라미터로 접근하면, 시스템 **shall** 가입을 거부한다.
- **REQ-MADM-018** (Ubiquitous): "기본 설정" 탭 **shall** 인증 메일 유효기간을 숫자+단위(시간/일)로
  저장하고, 회원가입 이메일 인증 토큰(`EmailAuthToken`)의 실제 만료 판정에 반영한다. 메일 인증 사용
  여부 자체는 기존 `member.signup.requireEmailVerification`를 재사용하며 중복 필드를 새로 만들지 않는다.
- **REQ-MADM-019** (Ubiquitous): "기본 설정" 탭 **shall** 관리자 회원 목록(`/admin/members`)에서
  회원 프로필사진 노출 여부를 토글하는 설정을 제공하고, 회원 목록 화면은 그 값을 실제로 반영한다.
- **REQ-MADM-020** (Ubiquitous): "기본 설정" 탭 **shall** 닉네임 변경 허용 여부를 토글하는 설정을
  제공한다.
- **REQ-MADM-021** (When — event-detected): **When** 닉네임 변경 허용 여부가 거짓인 상태에서 닉네임
  변경을 시도하면(관리자 편집 경로 포함), 시스템 **shall** 변경을 거부한다.
- **REQ-MADM-022** (Ubiquitous): "기본 설정" 탭 **shall** 닉네임 변경 기록 저장 여부를 토글하는 설정을
  제공한다. 이 값이 거짓이면 닉네임 변경 시 `NicknameChangeLog` 행을 생성하지 않는다.
- **REQ-MADM-023** (Ubiquitous): "기본 설정" 탭 **shall** 닉네임 특수문자 허용 여부(허용 시 허용 문자
  지정 가능) 및 띄어쓰기 허용 여부를 저장하고, 닉네임 설정/변경 검증 로직(가입·관리자 편집·자기 프로필
  편집 경로 전체)이 이 값을 실제로 적용한다.
- **REQ-MADM-024** (Ubiquitous): "기본 설정" 탭 **shall** 닉네임 중복 허용 여부를 노출하되, 기존
  `member.signup.allowDuplicateNickname` 사이트 설정 키를 그대로 읽고 쓴다 — 신규 키를 만들지 않는다.
- **REQ-MADM-025** (Ubiquitous): "기본 설정" 탭 **shall** 비밀번호 보안수준(낮음/보통/높음, 스키마의
  기존 `PasswordPolicyLevel` enum 재사용)을 저장하고, 회원가입·비밀번호 변경 검증 로직이 선택된 수준에
  따라 실제로 다른 문자 구성 요건을 적용한다(예: 낮음=길이만, 보통=길이+숫자, 높음=길이+숫자+특수문자).
  UI 라벨과 실제 enum 값의 매핑은 REQ-MADM-016의 불리언 호환 매핑과 동일한 명시적 처리 수준으로 아래
  표를 따른다(`PasswordPolicyLevel`의 실제 값은 `NORMAL`/`STRONG`/`VERY_STRONG`이며 "낮음=LOW" 같은
  자연스러운 추정과 다르므로 명시적으로 고정한다):

  | UI 라벨 | `PasswordPolicyLevel` enum 값 |
  |---|---|
  | 낮음 | `NORMAL` |
  | 보통 | `STRONG` |
  | 높음 | `VERY_STRONG` |
- **REQ-MADM-026** (Ubiquitous): "기본 설정" 탭 **shall** 현재 사용 중인 비밀번호 해시 알고리즘
  ("Argon2id")을 읽기 전용으로 표시하고, Argon2id의 시간 비용(time cost) 파라미터를 안전 범위(예:
  2~10) 내에서 관리자가 조정 가능하게 하며, 조정된 값은 이후 신규 해시 생성 시 실제로 적용된다(기존
  해시는 재해시 전까지 영향받지 않는다).
- **REQ-MADM-027** (Ubiquitous): "기본 설정" 탭 **shall** 로그인 시 구버전 해시 자동 재해싱(기존
  REQ-AUTH-014 동작)을 켜고 끄는 토글을 제공한다(기본값: 켜짐 = 현재 동작 유지). 꺼진 상태에서는
  로그인 성공 시 재해싱이 수행되지 않아야 한다.

### Group E — 이메일 호스트 관리 (허용/차단 도메인) (Slice E, 최고 위험 · 마이그레이션 필요)

- **REQ-MADM-028** (Ubiquitous): 시스템 **shall** 사이트별로 선택적으로 스코프되는(사이트 미지정 시
  전역 적용) 호스트 단위의 이메일 허용/차단 정책을 애디티브(additive) 마이그레이션으로 영속화한다.
  `policy` 축(허용/차단)이 `DeniedIdentifier`(아이디/닉네임 차단, 단일 축)와 근본적으로 다른 개념이므로
  기존 모델을 확장하지 않고 별도 모델로 분리한다. 정확한 스키마 정의(필드명·타입·enum 값)는
  plan.md §핵심 설계 결정 2를 단일 진실 원천으로 삼는다.
- **REQ-MADM-029** (Ubiquitous): 관리자 UI **shall** `ManagedEmailHost` 목록을 정책(허용/차단)별로
  필터링해 표시하는 이메일 호스트 관리 화면을 제공한다.
- **REQ-MADM-030** (Event-Driven): **When** 관리자가 호스트와 정책을 입력해 등록을 제출하면, 시스템
  **shall** 입력된 호스트와 정책을 저장하고, 동일한 `(siteId, host, policy)` 조합의 중복 등록은
  거부한다(정확한 구현 프로시저는 plan.md §핵심 설계 결정을 단일 진실 원천으로 삼는다).
- **REQ-MADM-031** (Event-Driven): **When** 관리자가 호스트 항목을 삭제하면, 시스템 **shall** 해당
  항목의 삭제를 영속적으로 반영한다(정확한 구현 프로시저는 plan.md §핵심 설계 결정을 단일 진실
  원천으로 삼는다).
- **REQ-MADM-032** (While — state-driven): **While** 해당 사이트에 `ALLOW` 정책 호스트가 하나 이상
  존재하면, 회원가입 검증(`packages/auth/src/signup.ts`) **shall** 화이트리스트 모드로 동작한다 —
  이메일 도메인이 `ALLOW` 목록에 없는 가입 시도를 거부한다.
- **REQ-MADM-033** (When — event-detected): **When** `ALLOW` 정책 호스트가 하나도 없고 `DENY` 정책
  호스트가 하나 이상 존재하는 상태에서 그 도메인과 일치하는 이메일로 가입을 시도하면, 회원가입 검증
  **shall** 해당 가입을 거부하고, 그 외 도메인은 정상 허용한다.
- **REQ-MADM-034** (Where — capability gate): **Where** 해당 사이트에 `ALLOW`/`DENY` 호스트가 하나도
  설정되지 않은 경우, 회원가입 검증 **shall** 이메일 도메인에 대한 제한을 적용하지 않는다(현재의
  무제한 동작과 하위 호환).
- **REQ-MADM-035** (When — event-detected): **When** 이메일 호스트 정책으로 가입이 거부되면, 시스템
  **shall** 명확한 검증 오류를 반환하고(일반 500 아님), 부분적으로 생성된 `User` 행을 남기지 않는다.

---

## 5. Exclusions (What NOT to Build)

### Out of Scope — 관리자 사이드바 메뉴 재배치

- 관리자 사이드바 최상위 카테고리 순서/그룹 재배치(사이트 제작/편집 → 회원 → 콘텐츠 → 즐겨찾기 → 설정 →
  고급 정렬, 포인트를 회원 하위로 이동)는 사용자가 명시적으로 별도 SPEC 범위로 확정했다. 본 SPEC은 이를
  다루지 않는다.

### Out of Scope — 포인트 시스템

- `SPEC-POINT-001`이 이미 완료(completed) 상태다. 회원별 포인트 개별 조정(`/admin/members/[id]/points`)을
  포함해 포인트 시스템 자체는 재작업하지 않는다.

### Out of Scope — 비밀번호 암호화 알고리즘 선택 UI

- 레거시의 "비밀번호 암호화 알고리즘"(bcrypt 등, DB 컬럼 길이 제약에 따라 동적으로 필터링되는 선택지)
  드롭다운은 이식하지 않는다. `packages/auth/src/password-config.ts`가 Argon2id 단일 알고리즘을
  `@MX:ANCHOR`(단일 진실 원천)로 명시적으로 채택한 아키텍처 결정이며, 실제 대체 해시 구현(bcrypt/
  sha512/sha256) 없이 선택 UI만 추가하면 "화면은 있으나 선택해도 아무 일도 일어나지 않는" 장식용
  컨트롤이 된다(§3 재발 방지 원칙 위반). REQ-MADM-026은 알고리즘 표시(읽기 전용)와 Argon2id 파라미터
  조정만 다룬다.

### Out of Scope — 회원 모듈 mid 재지정

- 레거시의 "회원 모듈 URL(mid) 지정 + 강제 적용" 개념은 이식하지 않는다. rhymix-ts의 회원 영역은 고정
  Next.js 라우트 그룹 `(member)`이며, 레거시의 모듈-mid 커스터마이징 시스템 자체가 뉴버전에서 의도적으로
  대체된 아키텍처다(SPEC-MENU-001이 레이아웃·스킨 배정을 디자인 토큰 시스템으로 대체한 것과 동일한 성격의
  결정).

### Out of Scope — 소셜 로그인 프로바이더 토글 / SSO 연동

- `SPEC-ADMIN-002` REQ-ADMIN2-049가 이미 DEFERRED로 재분류·백로그화되어 있다(전제 조건인 기존 구성된
  소셜 프로바이더가 코드베이스에 부재). 본 SPEC은 이 항목을 재론하지 않는다.

### Out of Scope — 가입/로그인/약관/기능/디자인 탭 재구현

- `apps/web/app/admin/members/settings/page.tsx`의 기존 5개 탭(SPEC-ADMIN-002 REQ-ADMIN2-046~048,
  050~052, 054 소유)은 완료 영역이다. 본 SPEC은 그 탭들이 이미 저장하는 설정 키(예:
  `member.signup.requireEmailVerification`, `member.signup.allowDuplicateNickname`)를 "기본 설정"
  탭에서 **재사용**할 뿐, 재구현하거나 중복 키를 새로 만들지 않는다.

---

## 6. 의존 / 관련 SPEC

| SPEC | 관계 |
|---|---|
| SPEC-AUTH-001 | `User`/`MemberGroup`/`DeniedIdentifier`/`NicknameChangeLog` 스키마, `signup.ts`/`login.ts` 검증 파이프라인, Argon2id 해시 코어(`password-config.ts`) 제공. Group D/E가 이 파이프라인에 새 검증 분기를 추가한다. |
| SPEC-ADMIN-002 | 회원 설정 5탭(가입/로그인/약관/기능/디자인) 및 `admin.settings.*` 라우터 패턴, `nicknameLog`/`deniedList` 백엔드(REQ-ADMIN2-046~057 인근) 제공. 본 SPEC은 그 위에 "기본 설정" 탭 + UI만 추가한다. |
| SPEC-MENU-001 | `admin.menuItem.reorder`의 단일 `$transaction` 원자적 재배치 패턴 및 `MenuItemDnDTree` dnd-kit 구현이 REQ-MADM-011/014의 참조 구현이다. |
| SPEC-POINT-001 | 완료 상태. 본 SPEC과 접점 없음(§5에서 명시적 제외). |
| SPEC-ADMIN-2FA-OTP-001 | "설정은 있으나 실제 동작에 영향 없는 stub" 실패 패턴의 선례 — 본 SPEC의 §3 재발 방지 원칙 근거. |

## 7. 미해결 질문 (run phase에서 확정)

1. **(사용자 재확인 필요)** §5 "비밀번호 암호화 알고리즘 선택 UI" 제외 결정 — Argon2id 단일 알고리즘
   유지 + 읽기 전용 표시로 축소한 것에 대한 최종 승인.
2. REQ-MADM-016 가입 허가 3값 모드를 기존 `member.signup.enabled` 불리언 키를 열거형으로 확장할지,
   별도 키(`member.signup.accessMode`)를 신설해 병행할지 — run phase에서 `admin.settings.ts`의 기존
   트랜잭션 패턴을 참고해 결정.
3. REQ-MADM-023 닉네임 허용 특수문자 지정 시 정확한 문자 클래스 화이트리스트(레거시 기본값 대응).
4. Group E `ManagedEmailHost`의 동일 호스트에 `ALLOW`와 `DENY`가 동시에 등록된 경우의 충돌 해석 정책
   (권장: `ALLOW` 우선 — 화이트리스트 모드가 활성화된 이상 그 목록이 유일한 진실).
5. REQ-MADM-026 Argon2id `timeCost` 안전 범위의 정확한 하한/상한(과도하게 낮은 값으로 인한 보안 약화
   방지) — RFC 9106 권고치 대비 클램프 값.
