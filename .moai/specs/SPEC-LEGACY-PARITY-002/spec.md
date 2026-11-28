---
id: SPEC-LEGACY-PARITY-002
title: "회원 영역 레거시 parity — 회원 상세·수정, 인증 로그, 포인트 설정 격차 해소"
version: "0.2.1"
status: draft
created: 2026-11-28
updated: 2026-11-28
author: MoAI
priority: P1
phase: "Phase 15 — 레거시 parity 002"
module: "apps/web/app/admin/members, apps/web/app/admin/site/points, apps/web/app/admin/api, apps/web/server/api/routers/admin, apps/web/lib/auth, packages/point, packages/auth, packages/db/prisma"
lifecycle: spec-anchored
tier: L
tags: "legacy-parity, admin, member, point, auth-log"
related_specs: [SPEC-LEGACY-PARITY-000, SPEC-MEMBER-PARITY-001, SPEC-POINT-001, SPEC-MEMBER-ADMIN-001]
---

# SPEC-LEGACY-PARITY-002 — 회원 영역 (member · point 관리자 화면)

> 레거시 parity 시리즈의 두 번째 영역 SPEC. 공통 규약은 `SPEC-LEGACY-PARITY-000` v0.2.0 을 따른다.
> 판정 대상은 레거시 `modules/member`·`modules/point` 의 `module.xml` 이 선언한 관리자 act 16개다
> (member 13 · point 3). 판정 원본은 `.moai/reports/legacy-parity-verdicts/lgp-002-member.md`,
> 이 SPEC 이 직접 재확인한 코드 사실은 `research.md`, 데이터 모델 결정은 `design.md` 에 있다.

## HISTORY

- 2026-11-28 (v0.1.0): 최초 작성. 판정표 16행(대응 있음 9 · 격차 6 · 의도적 제외 1)을 확정하고
  격차 6건과 대응-있음 행의 주요 세부 누락에 대한 요구사항 22건(REQ-MEMB-001~022)을 정했다.
  `dispMemberAdminDesignConfig` 는 2026-11-28 사용자 결정(반응형 한 벌 유지)에 따라 의도적 제외로
  확정했다. 범위가 파일 15개를 넘고 데이터 모델 변경을 포함하므로 Tier L 로 판정했다.
- 2026-11-28 (v0.2.0): plan-audit 1회차(FAIL 0.76, 결함 D1~D21) 반영.
  - 사용자 결정 3건 반영(2026-11-28): ① 게시판 포인트 열의 기존 0 은 "사이트 기본값 사용"으로 보고
    6개 열을 nullable 로 바꿔 0 → NULL 로 옮긴다. 이는 `SPEC-POINT-001` REQ-POINT-005(기본값 0 = 미지급,
    `schema.prisma:788` 주석은 REQ-POINT-002 로 표기)의 의미를 명시적으로 뒤집는다. ② 회원 기능 토글은
    이 SPEC 이 설정 키 7종·관리자 탭·저장까지 맡고, 토글에 따른 방문자 기능 숨김·거부는
    `SPEC-LEGACY-PARITY-008` 이 맡는다. ③ 스크랩·저장함·작성 글·작성 댓글은 범위 안이며 008 이 구현한다.
  - 감사 시점에 관리자 포인트 라우트 2개(`app/admin/api/points/adjust`, `app/admin/api/site/points/config`)
    에 권한 검사가 없던 문제와 약관 저장·삭제 Server Action 이 목업이던 문제는 이 SPEC 밖에서 오케스트레이터가
    수리했다. 이 SPEC 은 두 라우트를 기존 가드 사례로 인용하고 다시 계획하지 않는다.
  - REQ-MEMB-021 을 관리자 표면으로 한정하고 rhymix-ts 고유 보안 불변식으로 분류했다.
    Server Action·라우트 핸들러의 감사 기록을 REQ-MEMB-023 으로 신설했다(요구사항 23건).
  - 이용 제한 중 로그인 거부는 rhymix-ts 의 단일 실패 응답 불변식(REQ-AUTH-051)을 지키도록 고쳤다.
    레거시는 거부 사유를 로그인 화면에 보여 주지만 이 SPEC 은 사유를 관리자 화면에만 둔다(§4 의도적 차이).
  - 로그인 실패 최대 횟수 설정이 저장만 되고 로그인 판정에 쓰이지 않는 사실을 재확인해
    REQ-MEMB-017 에 함께 담았다(`research.md` §2.6).
  - `depends_on: [SPEC-LEGACY-PARITY-000]` 를 `related_specs` 로 옮겼다(000 은 draft 상위 규약 SPEC).
- 2026-11-28 (v0.2.1): plan-audit 2회차(FAIL 0.89, 차단 결함 D2-1 1건) 반영.
  - D2-1: 감사 기록의 대상은 `AdminLog.target` 열에 쓴다(`diff` 에만 두지 않는다). 형식은 `user:<id>`·
    `board:<id>`·`group:<id>`·`point-config:site`·`point-config:board:<id>`·`auth-log`·`nickname-log`·
    `settings:<구역>`이다(오케스트레이터 결정). 지금 `auditLogger` 는 `target` 을 빈 문자열로 쓰므로 §2.3 의
    "이미 충족" 서술을 고치고 `server/api/trpc.ts` 확장을 계획 M8 에 넣었다. 이 SPEC 이 추가·변경하는 작업에만
    적용하며 기존 관리자 프로시저를 소급해 채우지 않는다(REQ-MEMB-023).
  - 로그인 최대 실패 횟수 전달은 이 SPEC 밖에서 수리되었다(커밋 제목 "fix(auth): 관리자가 저장한 최대 로그인
    실패 횟수를 로그인 제한에 반영"). REQ-MEMB-017 의 남은 일은 시간창이며 AC-MEMB-017 의 grep 을 시간창으로 좁혔다.
  - REQ-MEMB-007 의 거부 응답을 "틀린 비밀번호와 같은 응답(`INVALID_CREDENTIALS`)"으로 명확히 했다.
    로그인 실패 응답을 단일하게 유지하고 사유는 관리자 화면에만 두는 방침은 2026-11-28 사용자 확인으로 확정했다.
  - 수용 기준 문구 정리(AC-MEMB-009 경과 시간 표기, AC-MEMB-012 행위자·작성자 일수 제한 분리, AC-MEMB-006 grep 의
    보조 지위, AC-MEMB-013 비문서 행위 1건 추가)와 research.md 의 커밋 상태 갱신(`9c74cde`·`2f30dc7`).

## 1. Why

회원 영역은 SPEC-MEMBER-PARITY-001(completed)이 회원 목록(정렬·그룹 필터·검색 대상·일괄 삭제)과
포인트 사이드바 링크를 이미 맞췄다. 그러나 레거시 2.1.41 기준으로 다시 대조하면 운영자가 매일 쓰는
화면 두 개가 빠져 있다.

1. **회원 한 명을 열어 고칠 수 없다.** 레거시 `dispMemberAdminInsert` 는 회원 정보 조회·수정 화면이다.
   rhymix-ts 는 `admin.user.get`(`user.ts:161`)·`admin.user.update`(`user.ts:236`, 상태만)·
   `admin.user.updateNickname`(`user.ts:310`)과 Server Action `toggleAdminRoleAction`·
   `setMemberStatusAction`(`lib/auth/admin-actions.ts:88,153`)까지 갖췄지만 이를 호출하는 화면이 없다.
   `app/admin/members/[id]/` 아래에는 `points` 하나뿐이고 회원 목록 행에서 들어갈 링크도 없다.
2. **로그인 시도를 볼 수 없다.** 레거시 `dispMemberAdminAuthLog` 는 인증 로그 화면이다. rhymix-ts 는
   로그인과 2FA 의 성공·실패를 `LoginAttempt`(`schema.prisma:521`)에 이미 쌓고 있으나 관리자가
   조회하거나 정리할 경로가 없다. 무차별 대입 같은 사고를 확인할 수단이 없다는 뜻이다.

포인트는 사이트 설정 4종(`signupBonus` 등)만 있다. 레거시는 행위별 금액·포인트 이름·레벨·게시판별
금액·전체 회원 포인트 목록을 제공한다. rhymix-ts 의 레벨 계산은 항상 1을 돌려주는 자리표시자다
(`packages/point/src/service.ts:172`).

## 2. What

### 2.1 범위

- 판정 대상: `coverage.md` 의 member 13 · point 3 = 관리자 act 16개(REQ-LGP-003).
- 구현 대상: 격차 6건과, 대응 있음 행 가운데 운영·보안상 의미가 큰 세부 누락(REQ-MEMB-017~019,
  REQ-MEMB-009 의 닉네임 기록 정리). 나머지 세부 누락은 §4 에 사유와 함께 남긴다.
- 선행 SPEC 처리: `SPEC-MEMBER-PARITY-001`(completed)은 **흡수하지 않고 재검증**한다
  (SPEC-LEGACY-PARITY-000 §2.3). 그 SPEC 의 수용 기준이 계속 통과하는지만 확인하며, 상태를
  `superseded` 로 바꾸지 않는다.

### 2.2 판정 — 16개 act 전건 (REQ-LGP-003)

근거 파일은 모두 `.moai/reports/legacy-admin-map/pages/` 아래에 있다. 판정 원본 행은
`lgp-002-member.md` § 판정표의 같은 act 행이다.

| # | 레거시 act | 근거 파일 | 최종 판정 | 이 SPEC 의 처리 |
|---|---|---|---|---|
| 1 | `dispMemberAdminAgreementsConfig` | `dispMemberAdminAgreementsConfig-u27iz8.json` | 대응 있음 | 약관 탭·약관 CRUD 존재. 감사 시점에는 약관 저장·삭제 Server Action 이 목업(`console.log('[Mock] …')`)이라 격차였고(`lgp-002-member.md` § 정정), 이 SPEC 밖에서 tRPC `admin.terms` 연결로 수리되었다(`terms/actions.ts:52,54,80`). 레거시 동의 항목 5칸은 커스텀 약관(개수 제한 없음, 행별 필수·선택 토글 `TermsEditor.tsx:183-186,243`, 가입 화면 표시 `TermsConsent.tsx:84`)으로 대응하므로 남은 요구사항이 없다 |
| 2 | `dispMemberAdminAuthLog` | `dispMemberAdminAuthLog-khp4nn.json` | **격차** | REQ-MEMB-008·009 |
| 3 | `dispMemberAdminConfig` | `dispMemberAdminConfig-1i7oykr.json` | 대응 있음 | 세부 누락은 §4 (비밀번호 해시 선택 부재는 Argon2id 고정 — 보존) |
| 4 | `dispMemberAdminDesignConfig` | `dispMemberAdminDesignConfig-1kreill.json` | **의도적 제외** | 사유: 2026-11-28 사용자 결정 — 레이아웃·컬러셋·모바일 스킨 체계를 들이지 않고 반응형 한 벌을 유지한다(`README.md` § 사용자 결정). 기존 회원 스킨·템플릿 선택은 보존 |
| 5 | `dispMemberAdminFeaturesConfig` | `dispMemberAdminFeaturesConfig-14y16lk.json` | **격차** | REQ-MEMB-010 (토글 저장은 이 SPEC, 토글에 따른 방문자 기능 숨김·거부는 008) |
| 6 | `dispMemberAdminGroupList` | `dispMemberAdminGroupList-13ieuz8.json` | 대응 있음 | 그룹 설명·다국어 입력은 §4 세부 격차 |
| 7 | `dispMemberAdminInfo` | `dispMemberAdminInfo-j4e5v3.json` | 대응 있음 | 폼 없는 공통 헤더 act, 회원 목록과 같은 화면 |
| 8 | `dispMemberAdminInsert` | `dispMemberAdminInsert-pw8mdg.json` | **격차** | REQ-MEMB-001~007 |
| 9 | `dispMemberAdminInsertJoinForm` | `dispMemberAdminInsertJoinForm-dkkhps.json` | 대응 있음 | 항목 설명·기본값·다국어는 §4 세부 격차 |
| 10 | `dispMemberAdminList` | `dispMemberAdminList-1a7p11w.json` 외 3 | 대응 있음 | 일괄 그룹 배정 REQ-MEMB-019. 행→상세 링크 REQ-MEMB-001 |
| 11 | `dispMemberAdminLoginConfig` | `dispMemberAdminLoginConfig-1913xeq.json` | 대응 있음 | 실패 집계 횟수·시간창 REQ-MEMB-017, 다른 세션 무효화 REQ-MEMB-018. 나머지는 §4 |
| 12 | `dispMemberAdminNickNameLog` | `dispMemberAdminNickNameLog-awwvql.json` | 대응 있음 | 기간 삭제 REQ-MEMB-009 |
| 13 | `dispMemberAdminSignUpConfig` | `dispMemberAdminSignUpConfig-99ra1v.json` | 대응 있음 | SMS·휴대폰 인증은 007 로 인계(§4), 나머지는 §4 |
| 14 | `dispPointAdminConfig` | `dispPointAdminConfig-pto8fh.json` | **격차** | REQ-MEMB-011·012·014·015 |
| 15 | `dispPointAdminModuleConfig` | `dispPointAdminModuleConfig-1hyghc.json`, `-ir0gl5.json` | **격차** | REQ-MEMB-013 |
| 16 | `dispPointAdminPointList` | `dispPointAdminPointList-b9j06e.json`, `-xstzb7.json` | **격차** | REQ-MEMB-016 |

집계: 대응 있음 9 · 격차 6 · 의도적 제외 1 = 16. 판정 누락 0.

### 2.3 이미 충족된 것 — 새로 만들지 않고 재사용·보존

- 상태 변경 + 세션 무효화 + 감사 기록: `changeUserStatus`(`packages/auth/src/admin.ts`)
- 관리자 권한 토글 + 마지막 관리자 보호: `toggleAdminRole`(`packages/auth/src/admin-role.ts:91`,
  `LAST_ADMIN_PROTECTED`)
- 닉네임 변경 정책·기록: `admin.user.updateNickname`(`user.ts:310`)
- 관리자 tRPC mutation 의 AdminLog 자동 기록: `auditLogger`(`server/api/trpc.ts:96`). **부분 충족**이다.
  행위자·작업 종류(`action` = 프로시저 경로)는 남기지만 대상 열은 `target: ''` 로 비워 두고(`trpc.ts:104-110`),
  대상 식별자는 입력에 id 가 있을 때만 `diff.input` 안에 남는다. 사이트 설정 저장처럼 입력에 id 가 없는
  작업은 대상이 어디에도 남지 않는다. tRPC 를 거치지 않는 Server Action·라우트 핸들러에는 아예 적용되지
  않는다. 두 부족분 모두 REQ-MEMB-023 이 다룬다.
- 관리자 가드(IP 제한·사이트 잠금·2FA): `protectedAdminProcedure`, Server Action·라우트 핸들러 용
  `assertAdminServerAction`·`adminServerActionCheck`(`lib/auth/admin-guard.ts:23,40`, D-7 커밋 `3f83a44`)
- 회원별 포인트 조정·이력 화면: `app/admin/members/[id]/points/page.tsx`, `packages/point/src/service.ts`.
  그 화면이 호출하는 `app/admin/api/points/adjust/route.ts` 와 사이트 포인트 설정 라우트
  `app/admin/api/site/points/config/route.ts` 는 감사 시점에 권한 검사가 없었다. 이 SPEC 밖의 수리
  (커밋 제목 "fix(security): 첨부 다운로드·관리자 포인트 API 에 권한 검사 추가")로 두 라우트 모두
  `adminServerActionCheck()` 를 호출하고 거부 시 403 을 돌려준다(`route.ts:14-16`, 테스트 `route.test.ts`).
  이 SPEC 은 이 두 라우트를 REQ-MEMB-021 의 기존 가드 사례로 쓴다. 감사 기록은 아직 없다(REQ-MEMB-023).
- 로그인 최대 실패 횟수의 판정 반영: v0.2.0 작성 시점에는 관리자가 저장한 `member.login.maxFailedAttempts` 가
  `login()` 에 전달되지 않았다. 이 SPEC 밖의 수리(커밋 제목 "fix(auth): 관리자가 저장한 최대 로그인 실패 횟수를
  로그인 제한에 반영")로 `apps/web/lib/auth/config.ts` 가 저장값을 읽어 `maxErrorCount` 로 넘긴다
  (`config.ts:137-164`, 테스트 `apps/web/lib/auth/authorize-max-error.test.ts`). 저장값이 없거나 양의 정수가
  아니면 `login()` 기본값 5회가 유지된다. 시간창은 여전히 설정 자체가 없으며 REQ-MEMB-017 의 남은 범위다.
- 게시판별 포인트 열 6개: `Board.pointPerDocument` 등(`schema.prisma:789-794`) — 관리자 UI 만 없다

### 2.4 다른 영역과의 경계 (교차 SPEC 인계)

- 방문자 회원 메뉴(스크랩·저장함·작성 글·작성 댓글·자동 로그인 관리·본인 인증 로그·닉네임 변경
  기록)의 화면과, REQ-MEMB-010 토글이 꺼졌을 때의 메뉴 숨김·직접 접근 거부는 `SPEC-LEGACY-PARITY-008`
  소관이다. 이 SPEC 은 토글 7종의 설정 키·관리자 탭·저장을 맡는다(2026-11-28 사용자 결정).
- 메일 수신 동의(`allow_mailing`)·가입 시 SMS·휴대폰 인증(`special_phone_number`·`special_phone_code`·
  `max_auth_sms_count`·`max_auth_sms_count_time`)·메일 발송은 `SPEC-LEGACY-PARITY-007` 로 인계한다. 이 필드들은
  002 소관 act(`dispMemberAdminInsert`·`dispMemberAdminSignUpConfig`)의 폼에 있으므로, 007 이 이 목록을
  받아 처리해야 누락되지 않는다(`plan.md` A.7).

## 3. 요구사항 (GEARS)

우선순위는 High / Medium / Low 세 단계다. 근거 표기는 REQ-LGP-002 를 따른다
(근거 파일명은 `pages/` 아래 상대 이름). "사이트 시간대"는 `Site.timeZone`(`schema.prisma:31`)이다.

### 3.A 회원 상세·수정 — `dispMemberAdminInsert`

**REQ-MEMB-001 (Event-driven) — Priority High**: WHEN an administrator selects a member row in the
member list, the admin console SHALL open a member detail screen for that member showing account
identity (아이디·이메일·이름·닉네임), status, administrator flag, group memberships, join date, last
login time and IP, current point balance, and navigation to that member's point history and nickname
change records. 근거: `dispMemberAdminInsert-pw8mdg.json`(폼 `member.procMemberAdminInsert`,
파라미터 `member_srl`). 회원 목록 행에서 상세 화면으로 가는 링크가 함께 생긴다.

**REQ-MEMB-002 (Ubiquitous) — Priority High**: The member detail screen SHALL let an administrator
edit and save, for an existing member, the user ID, email address, user name, nickname, status,
administrator flag, group memberships, message-receive permission, and the values of custom join-form
fields. 근거: `procMemberAdminInsert` 필드 `user_id`·`email_address`·`user_name`·`nick_name`·
`status`·`is_admin`·`group_srl_list[]`·`allow_message`, 가입 추가 항목은
`dispMemberAdminInsertJoinForm`. 저장소가 rhymix-ts 에 없는 필드는 REQ-MEMB-007 과 §4 가 다룬다.

**REQ-MEMB-003 (Event-driven) — Priority High**: WHEN a member edit is submitted with a duplicate user
ID, email address, or nickname, a nickname that violates the nickname policy, or a nickname change while
nickname changes are disallowed, the member edit flow SHALL reject the entire submission, keep every
stored value unchanged, and report the failing field. 근거: `procMemberAdminInsert`(같은 폼의 일괄
저장). 닉네임 정책·허용 여부는 기존 `updateNickname` 의 판정을 그대로 따른다.

**REQ-MEMB-004 (Event-driven) — Priority High**: WHEN an administrator sets a new password for a
member, the member edit flow SHALL store it only as a hash under the current password policy and SHALL
revoke all of that member's existing sessions. 근거: `procMemberAdminInsert` 필드 `reset_password`.
새 비밀번호는 응답·로그·감사 기록 어디에도 평문으로 남지 않는다.

**REQ-MEMB-005 (Ubiquitous) — Priority High**: Every member edit SHALL leave an administrator audit
record, and a nickname change made through it SHALL be written to the nickname change records under the
same save-log setting as other nickname changes. 근거: `dispMemberAdminNickNameLog-awwvql.json`
(닉네임 변경 기록 화면이 관리자 변경도 보여 준다).

**REQ-MEMB-006 (Unwanted) — Priority High**: The member edit flow SHALL NOT remove the administrator
flag from the last remaining administrator, and SHALL NOT change status or administrator flag by any
path that bypasses the existing session-revocation and audit behavior of `changeUserStatus` and
`toggleAdminRole`. 근거: `procMemberAdminInsert` 필드 `is_admin`·`status`. 마지막 관리자 보호는
rhymix-ts 고유 안전장치(REQ-LGP-005 보존 대상)다.

**REQ-MEMB-007 (State-driven) — Priority Medium**: WHILE the current date in the site timezone is on or
before a member's usage-restriction end date, the login flow SHALL refuse that member's login with the
same response it returns for a wrong password (`INVALID_CREDENTIALS`), disclosing neither the
restriction nor its reason; the member detail screen SHALL let an administrator set and clear the
restriction end date, the restriction reason, a refusal reason, and an administrator-only memo, and
those four values SHALL appear only on admin screens. 근거: `procMemberAdminInsert` 필드 `limit_date`·
`limited_reason`·`refused_reason`·`description`. 종료일 당일까지 제한하는 경계는 레거시와 같다
(`member.controller.php:2550` `substr(limit_date,0,8) >= date('Ymd')`). 사유 비공개는 레거시와 다르다
(§4 "의도적 차이", 2026-11-28 사용자 확인으로 확정). 요청 제한(`RATE_LIMITED`, `login.ts:234`)·CAPTCHA 실패는
지금도 별도 코드로 응답하며 이 요구는 그 응답을 바꾸지 않는다. `User` 모델에 해당 열이 없으므로 데이터 모델 변경이 필요하다(`design.md` D3).

### 3.B 인증 로그 — `dispMemberAdminAuthLog`

**REQ-MEMB-008 (Ubiquitous) — Priority High**: The admin console SHALL provide an authentication log
screen listing recorded login attempts newest first with time, IP address, submitted identifier,
result type, and the matching member when one exists, searchable by IP address, identifier, and the
matching member's user ID, email address, user name, or nickname, filterable by result type, and
paginated. 근거: `dispMemberAdminAuthLog-khp4nn.json`(검색 폼 `member.dispMemberAdminAuthLog` 필드
`search_target`·`search_keyword`·`action_type`). 데이터 원천은 기존 `LoginAttempt` 이며 새 로그
테이블을 만들지 않는다(`design.md` D4).

**REQ-MEMB-009 (Event-driven) — Priority Medium**: WHEN an administrator requests deletion of
authentication log entries or nickname change records older than a given number of days, the admin
console SHALL delete exactly the records whose time is earlier than the cutoff (now minus that many
24-hour days) and report how many were deleted, and SHALL reject a cutoff shorter than one day, or, for
authentication log entries, shorter than the configured failed-login counting window rounded up to
whole days. 근거: `procMemberAdminClearAuthLog`(필드 `days`, `dispMemberAdminAuthLog-khp4nn.json`),
`procMemberAdminClearModifyNickNameLog`(필드 `days`, `dispMemberAdminNickNameLog-awwvql.json`).
최소 일수 규칙은 진행 중인 실패 집계가 삭제로 초기화되는 것을 막는 rhymix-ts 안전장치다(`design.md` D4).

### 3.C 회원 기능 토글 — `dispMemberAdminFeaturesConfig`

**REQ-MEMB-010 (Ubiquitous) — Priority Medium**: The member feature settings tab SHALL provide an
on/off toggle for each of the seven visitor member-menu features (스크랩, 저장함, 작성 글, 작성 댓글,
자동 로그인 관리, 본인 인증 로그, 닉네임 변경 기록), each defaulting to on, and SHALL persist each saved
value so that it is returned unchanged when the settings are read again. 근거:
`procMemberAdminInsertFeaturesConfig` 필드 `scrapped_documents`·`saved_documents`·`my_documents`·
`my_comments`·`active_logins`·`auth_log`·`nickname_log`(`dispMemberAdminFeaturesConfig-14y16lk.json`).
토글 값에 따라 방문자 메뉴에서 숨기고 직접 접근을 거부하는 동작은 `SPEC-LEGACY-PARITY-008` 이 구현한다
(2026-11-28 사용자 결정, §2.4).

### 3.D 포인트 — `dispPointAdminConfig` · `dispPointAdminModuleConfig` · `dispPointAdminPointList`

**REQ-MEMB-011 (Ubiquitous) — Priority Medium**: The site point settings SHALL let an administrator set
the point display name, the maximum level, the point threshold of each level, and a level icon set, and
the point service SHALL compute a member's level as the highest level whose threshold the member's
balance has reached, capped at the maximum level, instead of the current fixed level 1. 근거:
`procPointAdminInsertConfig` 필드 `point_name`·`max_level`·`level_step`·`level_icon`
(`dispPointAdminConfig-pto8fh.json`). 레벨 번호는 1부터 시작하며, 0부터 시작하는 레거시
`PointModel::getLevel` 과 다르다(§4 "의도적 차이", `design.md` D7).

**REQ-MEMB-012 (Event-driven) — Priority Medium**: WHEN a member logs in for the first time on a
calendar day in the site timezone, writes a document or comment, uploads or downloads a file, reads a
document, or recommends or not-recommends a document or comment, the point service SHALL apply the
configured amount to the acting member and, where the legacy configuration defines an author-side
amount (download, read, recommended, not-recommended), to the content author; it SHALL apply no points
for an action whose target was registered more than the configured day limit for that action (in
24-hour days) before the action, and SHALL skip notices for read points where notice exclusion is on.
근거: `procPointAdminInsertConfig` 필드 `login_point`·`insert_document`·`insert_comment`·`upload_file`·
`download_file`·`download_file_author`·`read_document`·`read_document_author`·`voter`·`voted`·
`blamer`·`blamed`·`voter_comment`·`voted_comment`·`blamer_comment`·`blamed_comment`·`*_limit`·
`read_document_except_notice`·`read_document_author_except_notice`. 레거시 의미는 `research.md` §3 의
`point.controller.php` 대조를 따른다.

**REQ-MEMB-013 (State-driven) — Priority Medium**: WHILE a board has a per-board amount set for a point
action, the point service SHALL use that amount for actions on that board; WHILE it has none, the point
service SHALL use the site default amount; and the admin console SHALL provide a screen to set or clear
per-board amounts for every action in REQ-MEMB-012 except login. 근거: `procPointAdminInsertModuleConfig`
필드 `insert_document[<module_srl>]` 등(`dispPointAdminModuleConfig-1hyghc.json`). "설정 안 함"은 NULL,
"0점"은 0 으로 구분하며 기존 게시판 행의 0 은 NULL 로 옮긴다(`design.md` D2, 2026-11-28 사용자 결정).

**REQ-MEMB-014 (Event-driven) — Priority Medium**: WHEN a document, comment, or uploaded file that
earned points is deleted and revert-on-delete is enabled for that action, the point service SHALL
reclaim the points awarded for it exactly once. 근거: 필드 `insert_document_revert_on_delete`·
`insert_comment_revert_on_delete`·`upload_file_revert_on_delete`(`dispPointAdminConfig-pto8fh.json`).

**REQ-MEMB-015 (State-driven) — Priority Low**: WHILE download restriction or read restriction is
enabled and a member's balance would fall below zero by the configured download or read cost, the
content flow SHALL refuse that download or document read and tell the member the point shortfall.
근거: 필드 `disable_download`·`disable_read_document`(`dispPointAdminConfig-pto8fh.json`).

**REQ-MEMB-016 (Ubiquitous) — Priority Medium**: The admin console SHALL provide a point list screen
showing every member with point balance and level, searchable by keyword over member identity fields,
filterable by group and by administrator flag, paginated, and linking each row to that member's point
adjustment screen. 근거: `dispPointAdminPointList-b9j06e.json`(검색 폼 필드 `is_admin`·
`selected_group_srl`·`search_target`·`search_keyword`, 행 폼 `procPointAdminUpdatePoint`).

### 3.E 대응 있음 행의 세부 격차

**REQ-MEMB-017 (Ubiquitous) — Priority Medium**: The login settings tab SHALL let an administrator set
the maximum number of failed login attempts and the time window over which failed attempts are
counted, and the login flow SHALL apply both saved values when deciding whether to block further login
attempts. 근거: `procMemberAdminInsertLoginConfig` 필드 `max_error_count`·`max_error_count_time`
(`dispMemberAdminLoginConfig-1913xeq.json`). 최대 횟수(`member.login.maxFailedAttempts`)의 판정 반영은 이 SPEC
밖에서 수리되었고(§2.3), 이 SPEC 에 남은 일은 시간창의 설정 키·입력·판정 반영이다. 시간창은 지금 설정 자체가
없어 판정은 `login()` 기본값 10분으로 이루어진다(`research.md` §2.6). 최대 횟수는 회귀 확인 대상으로만 남는다.

**REQ-MEMB-018 (Capability gate) — Priority Low**: WHERE "invalidate other sessions on login" is
enabled in the login settings, the login flow SHALL revoke all of a member's other sessions when that
member logs in successfully. 근거: 필드 `login_invalidate_other_sessions`
(`dispMemberAdminLoginConfig-1913xeq.json`).

**REQ-MEMB-019 (Event-driven) — Priority Medium**: WHEN an administrator applies a group assignment to
members selected in the member list, the admin console SHALL set those members' group memberships to
the chosen groups in one transaction and record the change in the administrator audit log. 근거:
`dispMemberAdminList-1a7p11w.json` 의 선택 회원 처리 폼 필드 `groups[]`.

### 3.F 진입 경로

**REQ-MEMB-020 (Ubiquitous) — Priority Medium**: Every member-area admin screen — including terms,
email domain checks, the authentication log, the point list, the per-board point screen, and member
detail — SHALL be reachable through at least one in-app link from another admin screen of the 회원
group, without changing the sidebar's group order or group membership. 근거: 판정표 § 교차 발견 1
(`terms`·`email-hosts` inbound 링크 0건), 레거시 회원 설정 화면의 탭 링크(`dispMemberAdminConfig-1i7oykr.json`
의 `links`). 사이드바 구조 불변은 REQ-LGP-004.

### 3.G 불변식

**REQ-MEMB-021 (Ubiquitous) — Priority High — rhymix-ts 고유 보안 불변식**: Every admin surface this
SPEC adds or changes — screens under `app/admin/**`, route handlers under `app/admin/api/**`, Server
Actions under `app/admin/**` and in `lib/auth/admin-actions.ts`, and tRPC procedures under
`server/api/routers/admin/**` — SHALL apply the same administrator guard (administrator check, IP
restriction, site lock, two-factor requirement) as `protectedAdminProcedure` and SHALL reject a request
that fails it. 근거 분류: rhymix-ts 고유 보안 불변식(REQ-LGP-005 보존 대상). IP 제한·사이트 잠금·2FA 는
레거시 act 의 폼에서 나온 요구가 아니라 rhymix-ts 의 관리자 가드(`lib/auth/admin-guard.ts:23,40`)다.
방문자 경로(첨부 다운로드 라우트, 문서 조회)는 이 요구의 대상이 아니며 기존 읽기 권한 규칙을 따른다.
기존 가드 사례: `app/admin/api/points/adjust/route.ts`·`app/admin/api/site/points/config/route.ts`(§2.3).

**REQ-MEMB-022 (Unwanted) — Priority High**: This SPEC's changes SHALL NOT remove, hide, or weaken any
rhymix-ts-only member capability — denied identifier management, email domain checks, social login
settings, direct member registration, group edit screens, fixed Argon2id hashing, unconditional session
revocation on password change, the uniform login failure response (REQ-AUTH-051), or the member-list
features verified by `SPEC-MEMBER-PARITY-001`. 근거: REQ-LGP-005. 레거시에 없는 기능이라는 이유로
바꾸지 않는다.

**REQ-MEMB-023 (Ubiquitous) — Priority High**: Every state-changing admin operation this SPEC adds or
changes — including authentication log and nickname record deletion, member edit, bulk group
assignment, member point adjustment, site point settings, per-board point amounts, member feature
toggles, and login settings — SHALL leave an administrator audit record naming the acting
administrator, the operation, and its target, whether the operation runs as a tRPC mutation, a Server
Action, or a route handler; the record SHALL carry its target in the audit record's dedicated target
field (`AdminLog.target`) in the target format below, never only inside the change details; and the
record SHALL NOT contain passwords or other secrets. 근거 분류: rhymix-ts 고유 감사 불변식(REQ-LGP-005 보존
대상). 자동 기록 `auditLogger`(`trpc.ts:96`)는 tRPC mutation 에만 적용되고 대상 열을 빈 문자열로 쓴다
(`trpc.ts:104-110`). 지금 포인트 라우트 2개는 기록을 남기지 않는다(`research.md` §2.7). 기록 삭제
(REQ-MEMB-009)는 공격 흔적을 지울 수 있는 작업이므로 기록이 특히 필요하다. `AdminLog.target` 은 인덱스가
있는 전용 열이고(`schema.prisma:247,254`), 관리자 로그 조회는 이 열로 거른다(`routers/admin/log.ts:58`).

대상 형식(2026-11-28 오케스트레이터 결정). `<id>` 는 해당 모델의 정수 기본키(`User.id`·`Board.id`·
`MemberGroup.id`)다.

| 대상 형식 | 쓰는 작업 |
|---|---|
| `user:<id>` | 회원 정보 수정(비밀번호 재설정·이용 제한 포함), 회원 포인트 조정 |
| `group:<id>` | 일괄 그룹 배정(지정한 그룹. 여러 그룹이면 id 를 오름차순으로 쉼표로 잇는다: `group:<id>,<id>`) |
| `board:<id>` | 게시판 자체가 대상인 작업(이 SPEC 의 작업 목록에는 해당 없음, 형식만 예약) |
| `point-config:site` | 사이트 포인트 설정 저장 |
| `point-config:board:<id>` | 게시판별 포인트 저장(값이 바뀐 게시판마다 1건) |
| `auth-log` | 인증 로그 기간 삭제 |
| `nickname-log` | 닉네임 변경 기록 기간 삭제 |
| `settings:<구역>` | 회원 설정 탭 저장. `<구역>` 은 그 탭이 저장하는 설정 키의 접두어(예: 로그인 설정 `member.login`). 기능 토글 탭의 구역 이름은 M1 이 설정 키와 함께 정해 progress.md 에 기록한다 |

이 요구는 이 SPEC 이 추가·변경하는 작업에만 적용한다. 이 SPEC 이 건드리지 않는 기존 관리자 프로시저의 대상 열을
소급해 채우지 않는다.

## 4. Out of Scope

### Out of Scope — 의도적 제외: 레이아웃·컬러셋·모바일 스킨

- `dispMemberAdminDesignConfig` 의 `layout_srl`·`mlayout_srl`·`colorset`·`mskin` — 2026-11-28 사용자
  결정으로 반응형 한 벌을 유지한다. 기존 회원 스킨·템플릿 선택(`memberSkinId`·`memberTemplateId`)은
  그대로 둔다.

### Out of Scope — 의도적 차이: 레거시와 다르게 두는 동작

- 로그인 거부 사유 노출: 레거시는 이용 제한·거부 회원의 로그인 실패 메시지에 `limited_reason`·
  `refused_reason` 을 붙인다(`member.controller.php:2787-2798`). rhymix-ts 는 모든 로그인 실패를 같은
  응답으로 돌려주는 불변식(REQ-AUTH-051, `packages/auth/src/login.ts:17-19`)을 지키므로 사유를 관리자
  화면에만 둔다(REQ-MEMB-007·022). 2026-11-28 사용자 확인으로 확정된 결정이며 열린 결정이 아니다.
- 레벨 번호: 레거시 `PointModel::getLevel`(`modules/point/point.model.php:107-118`)은 잔액이
  `level_step[1]` 미만이면 레벨 0 을 돌려주는 0 기반이다. rhymix-ts 는 기존 `defaultLevel`
  (`packages/point/src/schemas.ts:7`, 최소 1)과 자리표시자의 반환값(레벨 1)에 맞춰 1 기반으로 둔다.
- 레벨 아이콘: 레거시 `level_icon` 은 아이콘 세트 이름이고 레벨별 이미지는 세트 안에서 번호로 찾는다.
  rhymix-ts 도 세트 하나를 고르고 레벨 번호로 이미지를 찾되, 레거시 아이콘 세트 이미지 자체는 옮기지
  않는다.

### Out of Scope — 방문자 회원 셀프서비스 (→ SPEC-LEGACY-PARITY-008)

- 스크랩·저장함·작성 글·작성 댓글·자동 로그인 관리·본인 인증 로그·닉네임 변경 기록 방문자 화면과,
  REQ-MEMB-010 토글이 꺼졌을 때의 메뉴 숨김·직접 접근 거부.
- 회원 프로필 항목 `homepage`·`blog`·`birthday`·`signature` 의 저장소와 편집. 지금 `User` 모델에
  저장소가 없고, 회원 본인 정보 수정(`dispMemberModifyInfo`)과 함께 008 이 정한다. 008 이 저장소를
  만들면 관리자 상세 화면 노출은 008 의 범위에서 함께 다룬다.

### Out of Scope — 메일·알림·SMS (→ SPEC-LEGACY-PARITY-007 인계)

- 메일 수신 동의 `allow_mailing`(`dispMemberAdminInsert`), 가입 시 SMS·휴대폰 인증
  `special_phone_number`·`special_phone_code`·`max_auth_sms_count`·`max_auth_sms_count_time`
  (`dispMemberAdminSignUpConfig`), 메일 발송 화면. 002 소관 act 의 필드이므로 007 로 넘기는 인계 목록이다
  (`plan.md` A.7).

### Out of Scope — 대응 있음 행의 나머지 세부 격차

- 회원 설정 기본: `member_mid`·`force_mid`(Next.js 라우팅에는 회원 모듈 식별 URL 개념이 없음),
  `password_reset_method`, `password_hashing_algorithm`(Argon2id 고정이 rhymix-ts 의 의도된 설계).
- 비밀번호 변경 시 다른 세션 무효화 토글 `password_change_invalidate_other_sessions` — rhymix-ts 는
  항상 무효화한다(`packages/auth/src/password-reset.ts:195`). 끌 수 있게 만드는 것은 보안 후퇴이므로
  두지 않는다(REQ-MEMB-022).
- 로그인 설정: `identifiers[]`, `change_password_date`, `login_failure_except_ip`, `login_log`
  (rhymix-ts 는 항상 기록), `after_login_url`·`after_logout_url`.
- 가입 설정: `limit_day`·`limit_day_description`(의미 확인 필요), `redirect_url`, `usable_list[]`·
  `list_order[]`, `is_user_id_public`.
- 가입 추가 항목의 설명·기본값·다국어·추가 입력 형식, 그룹 설명·다국어 입력.
- 회원 목록의 선택 회원 쪽지 발송(`message`).
- 필요해지면 이 SPEC 을 개정해 요구사항으로 올린다.

### Out of Scope — 포인트 레벨·그룹 연동과 기타 포인트 세부

- 레벨에 따른 그룹 자동 배정(`group_ratchet`·`group_reset`·`point_group_<n>`), 포인트 적용 모듈 제한
  (`able_module`), 크롤러 예외(`disable_read_document_except_robots`). 판정표 비고의 누락 목록에 오르지
  않은 필드라 이번 판에서는 다루지 않는다.

### Out of Scope — 레거시 저장 구조 이식

- 레거시 `member_auth_log` 테이블과 같은 구조를 새로 만들지 않는다. 인증 로그는 기존 `LoginAttempt` 로
  제공한다. 레거시 PHP 코드도 옮기지 않는다(SPEC-LEGACY-PARITY-000 §4).

### Out of Scope — 이 SPEC 밖에서 이미 수리된 것

- 관리자 포인트 라우트 2개의 권한 검사(`9c74cde`), 약관 저장·삭제의 실제 저장 연결(`2f30dc7`), 저장된 로그인
  최대 실패 횟수의 판정 반영(커밋 제목 "fix(auth): 관리자가 저장한 최대 로그인 실패 횟수를 로그인 제한에 반영").
  이 SPEC 은 다시 구현하지 않고, 회귀하지 않는지만 REQ-MEMB-017·021·022 의 검증으로 확인한다.

## 5. Acceptance Criteria

`acceptance.md` 참조. 요구사항 1건당 수용 기준 1건(AC-MEMB-001~023), 모두 Given-When-Then 과 구체적
검증 수단(추가할 테스트 파일, grep·SQL 과 기대값, 또는 http://localhost:3000 브라우저 절차)을 가진다.

## 6. 근거 강도 (정직 고지)

- 레거시 쪽: 폼 필드는 `pages/*.json` 캡처에서 읽었고, 포인트 동작의 의미(하루 1회 로그인 포인트,
  `*_limit` 일수, 다운로드·읽기 제한)와 이용 제한 경계·거부 사유 노출은 레거시 소스
  `modules/point/point.controller.php`·`point.model.php`·`modules/member/member.controller.php` 를 직접
  확인했다(`research.md` §3). 레거시 화면을 브라우저로 열어 확인하지는 않았다.
- rhymix-ts 쪽: §2.3 과 `research.md` §2 의 코드 사실은 이 SPEC 작성 시점(HEAD `b6a847b` + 작업 트리)에
  grep·sed 로 재확인했다. 게시판 포인트 값 분포는 개발 DB 에서 측정했다(`research.md` §2.1). 운영 DB 는
  측정하지 않았다. 런타임 동작(예: `LoginAttempt` 행이 실제로 쌓이는지)은 run-phase 첫 마일스톤에서 실측한다.
- 미확인: 판정표 § 미검증의 항목 중 그룹 설명 필드, `settings/social` redirect 조건은 이 SPEC 의
  요구사항과 무관해 재확인하지 않았다.

## 7. 관련 SPEC

- `SPEC-LEGACY-PARITY-000`(draft) — 공통 규약(근거·판정·불변식). 상위 규약이므로 `depends_on` 이 아니라
  `related_specs` 로 둔다. 000 §2.3 의 영역 경계(토글 동작은 008)는 이 SPEC 의 §2.4 에 기록했다.
- `SPEC-MEMBER-PARITY-001`(completed) — 재검증 대상. 그 SPEC 의 Out of Scope "회원 그룹 재배치 UI"·
  "Bulk 수정"은 당시 범위 판단이며, REQ-MEMB-002·019 가 레거시 근거로 다시 다룬다.
- `SPEC-POINT-001`(completed, `.moai/specs/_archive/`) — 포인트 엔진·게시판별 포인트 열의 출처.
  **이 SPEC 은 그 SPEC 의 REQ-POINT-005(게시판 포인트 열 `Int @default(0)`, "0 = 미지급")를 뒤집는다**:
  열은 nullable 이 되고 NULL = 사이트 기본값 사용, 0 = 명시적 0점이다(2026-11-28 사용자 결정).
  `schema.prisma:788` 의 주석은 같은 열을 REQ-POINT-002 로 표기한다.
- `SPEC-MEMBER-ADMIN-001`(completed, `.moai/specs/_archive/`) — 닉네임 변경 정책(REQ-MADM-020~023)의 출처
- `SPEC-LEGACY-PARITY-007`·`008`(미작성) — §2.4·§4 의 인계 대상
