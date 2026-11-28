# SPEC-LEGACY-PARITY-002 — research

> 판정 원본은 `.moai/reports/legacy-parity-verdicts/lgp-002-member.md` 다. 이 문서는 SPEC 을 쓰면서
> 판정표의 핵심 주장을 다시 확인한 결과와, 판정표에 없던 사실 몇 가지를 기록한다.
> 확인 시점: 2026-11-28, HEAD `b6a847b`. 모든 명령은 읽기 전용이다. v0.2.0 개정 때 HEAD `b6a847b` 의
> 작업 트리(오케스트레이터의 보안·약관 수리분이 스테이징된 상태)를 다시 확인했다(§2.6~§2.9).
> v0.2.1 개정 때 HEAD `9c74cde` 와 그 작업 트리에서 §2.6·§2.7·§5 를 다시 확인했다(그사이 약관 연결은
> `2f30dc7`, 포인트 라우트 가드는 `9c74cde` 로 커밋됨).

## 1. 판정표 주장 재확인

| # | 판정표 주장 | 실행한 확인 | 관찰 결과 | 판단 |
|---|---|---|---|---|
| 1 | `app/admin/members/[id]/` 에는 `points` 만 있다 | `find "app/admin/members/[id]" -type f` | `[id]/points/page.tsx`, `[id]/points/PointAdjustForm.tsx` 두 파일뿐 | 확인 |
| 2 | `user.get` 은 `user.ts:161`, `user.update` 는 `user.ts:236` 이고 update 는 상태만 받는다 | `grep -n -E "^\s+(get\|update\|...)\s*:" user.ts`, `sed -n 155,262p` | `get:` 161 (`userId` 로 `findUnique`), `update:` 236 (입력 `userId`·`status`, `changeUserStatus` 위임) | 확인 |
| 3 | 두 프로시저의 UI 호출자가 없다 | `grep -rn "user.get\|user\.update\|api.admin.user" app components` | `app/admin/members/page.tsx:9` 주석과 무관한 `prisma.user.update` 한 건뿐 | 확인 |
| 4 | `packages/point/src/schemas.ts` 의 사이트 설정은 4종 | `cat packages/point/src/schemas.ts` | `PointSiteConfigSchema` = `signupBonus`·`clampToZero`·`allowNegativeBalance`·`defaultLevel` | 확인 |
| 5 | `LoginAttempt` 열은 id·ip·identifier·result·createdAt | `sed -n 515,535p schema.prisma` | 확인. `result` 는 enum `LoginAttemptResult`(`schema.prisma:305`) = `SUCCESS`·`INVALID_CREDENTIALS`·`STATUS_BLOCKED`·`RATE_LIMITED` | 확인 |
| 6 | 사이드바 회원 링크는 5개 | `sed -n 90,110p components/admin/AdminSidebar.tsx` | `/admin/members`·`groups`·`new`·`settings`·`/admin/site/points` (98-102행) | 확인 |
| 7 | `terms`·`email-hosts` inbound 링크 0건 | `grep -rn -E "admin/members/(terms\|email-hosts)" app components` | 각자 자기 파일의 `revalidatePath`·자기 참조 링크뿐 | 확인 |

## 2. 판정표에 없던 사실 (SPEC 설계에 영향)

### 2.1 게시판별 포인트 열은 이미 있다 (판정표 서술 보정)

판정표의 `dispPointAdminModuleConfig` 행은 "`packages/point` 에 모듈 단위 키가 없다"고 적었다.
패키지 안에는 실제로 없지만, DB 모델에는 있다.

- `schema.prisma:788-794` `Board` 모델: `pointPerDocument`·`pointPerComment`·`pointPerVoteUp`·
  `pointPerVoteDown`·`pointPerDownload`·`pointPerFileUpload`, 모두 `Int @default(0)` (SPEC-POINT-001
  REQ-POINT-002).
- 소비처: `packages/document/src/document.ts:322,359`(문서 작성), `packages/comment/src/service.ts:125`
  (댓글 작성)만 이 값을 읽는다.
- 관리자 UI: `grep -rln pointPer apps/web/app apps/web/components apps/web/server` → 테스트 파일
  `server/api/routers/content/comment.test.ts` 하나. **값을 설정하는 화면이 없다.** 설치 시드도 이 열을
  쓰지 않는다(`packages` 전역 grep 에서 픽스처 외 0건).
- 여기서 "기존 행은 모두 기본값 0 일 것"은 코드 grep 에서 나온 **추론**이었다. 이를 측정으로 확인했다:
  2026-11-28 오케스트레이터가 개발 DB 에서 `select count(*), sum(case when … <> 0 …) from boards` 를 실행해
  `2|0`(2행, 0 이 아닌 값을 가진 행 0개)을 얻었다. 운영 DB 는 측정하지 않았다(§5).

판정은 그대로 격차다. 다만 구현은 "모듈 단위 키 신설"이 아니라 "기존 열의 의미 정리 + 화면 추가"에서
출발한다(`design.md` D2). 열의 "0 = 미지급" 의미는 `SPEC-POINT-001` REQ-POINT-005 가 정했고
(`_archive/SPEC-POINT-001/spec.md:79`), `schema.prisma:788` 주석은 같은 열을 REQ-POINT-002 로 표기한다.

### 2.2 연결되지 않은 포인트 훅

- `pointHooks.onVoteCast`: `packages/point/src/hooks.ts:84` 에 정의, 패키지 밖 호출자 0건.
- `pointPerDownload`·`pointPerFileUpload`: 소비처 0건.
- 결론: 추천·다운로드·업로드 포인트는 열은 있으나 지급되지 않는다. REQ-MEMB-012 가 이를 연결한다.

### 2.3 레벨 계산은 자리표시자

`packages/point/src/service.ts:172-175`:
`// REQ-POINT-007 (Phase 3 stub — 항상 level 1 반환)` → `getLevel(_memberId)` 는 항상
`{ level: 1, name: 'default', iconUrl: null, threshold: 0 }` 을 돌려준다. 판정표 § 미검증의
"`getLevel` 구현 여부"가 이것으로 해소된다 — 구현되지 않았다.

### 2.4 회원 수정용 서버 측 부품은 대부분 있다

| 부품 | 위치 | UI 호출자 |
|---|---|---|
| `setMemberStatusAction` | `lib/auth/admin-actions.ts:88` | 없음 |
| `deleteMemberAction` | `lib/auth/admin-actions.ts:123` | 없음 |
| `toggleAdminRoleAction` → `toggleAdminRole` (마지막 관리자 보호 `LAST_ADMIN_PROTECTED`) | `admin-actions.ts:153`, `packages/auth/src/admin-role.ts:91` | 없음 |
| `admin.user.updateNickname` (허용 여부·정책 검증·변경 기록) | `server/api/routers/admin/user.ts:310` | 없음(관리자 화면 기준) |
| AdminLog 자동 기록 | `server/api/trpc.ts:96` `auditLogger` | 모든 관리자 mutation(대상 열은 빈 문자열, §2.7) |
| 세션 무효화 | `packages/auth/src/session-revocation.ts` `revokeAllSessions` — 호출처 `admin.ts:184,283`, `password-reset.ts:195`, `autologin.ts:138` | — |

확인 명령: `grep -rn "toggleAdminRoleAction\|setMemberStatusAction\|deleteMemberAction" app components lib`
(정의 파일 외 0건).

### 2.5 `User` 모델에 없는 레거시 수정 필드

`awk '/^model User \{/,/^\}/' schema.prisma` 결과, 다음 레거시 필드에 대응하는 열이 없다:
`homepage`·`blog`·`birthday`·`signature`·`description`·`limit_date`·`limited_reason`·
`refused_reason`·`allow_mailing`. 있는 것: `userId`·`emailAddress`·`userName`·`nickName`·
`phoneNumber`·`status`·`isAdmin`·`denied`·`allowMessages`·`extraVars`(가입 추가 항목 값).
`grep -rn "allowMailing\|limitDate\|limitedReason"` 0건.

### 2.6 로그인 실패 시간창과 세션 무효화

- `packages/auth/src/login.ts:159-161`: `maxErrorCount = ctx.config.maxErrorCount ?? 5`,
  `windowMinutes = ctx.config.windowMinutes ?? 10` 으로 실패를 집계하고, 창 안의 실패가 `maxErrorCount` 이상이면
  `{ ok: false, code: 'RATE_LIMITED' }` 를 돌려준다(`:225-234`). 관리자 설정 `LoginSettingsSchema`
  (`server/api/routers/admin/settings.ts:86-89`)에는 `maxFailedAttempts` 만 있고 시간창은 없다.
- v0.2.0 시점(HEAD `b6a847b`)에는 **저장된 최대 실패 횟수가 로그인 판정에 전달되지 않았다.** `login()` 의
  유일한 앱 호출 지점 `apps/web/lib/auth/config.ts:139-152` 는 `passwordPolicy`·CAPTCHA 3종·
  `autoRehashEnabled` 만 넘겼고, `grep -rn "maxErrorCount\|windowMinutes" apps/web --include=*.ts | grep -v -e
  node_modules -e '\.test\.'` 는 0건이었다.
- v0.2.1 재확인: 이 SPEC 밖의 수리(커밋 제목 "fix(auth): 관리자가 저장한 최대 로그인 실패 횟수를 로그인 제한에
  반영")로 `config.ts:137` 이 `member.login.maxFailedAttempts` 를 읽고, 양의 정수일 때만 `maxErrorCount` 로
  넘긴다(`config.ts:144-147,164`). 테스트는 `apps/web/lib/auth/authorize-max-error.test.ts`. 이 확인은
  HEAD `9c74cde` 의 작업 트리 기준이다(`git diff apps/web/lib/auth/config.ts`). 이후 `14d04b2` 로 커밋됨(orchestrator 재실행: vitest 3파일 통과, tsc 0 오류).
- 시간창은 여전히 전달되지 않는다. `config.ts:142` 주석에 `windowMinutes` 라는 단어가 있으므로 단어 grep 은
  1건이 나온다. 속성 전달만 잡는 grep `grep -rnE "^\s*windowMinutes\b|\bwindowMinutes\s*:" apps/web
  --include=*.ts | grep -v -e node_modules -e '\.test\.'` → 0건(exit 1). REQ-MEMB-017 의 남은 범위는 시간창이다.
- 비밀번호 재설정 확정 시 무조건 전체 세션을 무효화한다(`password-reset.ts:195`). 레거시는 이를
  토글(`password_change_invalidate_other_sessions`)로 둔다 — rhymix-ts 가 더 엄격하다.

### 2.7 관리자 가드와 감사 기록

- D-7 커밋 `3f83a44` 이후 Server Action 은 `lib/auth/admin-guard.ts:23`(`assertAdminServerAction`)·
  `:40`(`adminServerActionCheck`)로 tRPC 와 같은 판정을 받거나, `getServerCaller()` 로 `admin.*` tRPC
  프로시저(`protectedAdminProcedure`)를 호출해 같은 판정을 받는다(예: `members/settings/actions.ts:11`).
  새 화면·액션도 이 경로를 써야 한다(REQ-MEMB-021).
- 관리자 라우트 핸들러: `find apps/web/app/admin/api -name route.ts | xargs grep -L -E "adminServerActionCheck|assertAdminServerAction"`
  → 출력 없음. 감사 시점(HEAD `b6a847b`)에는 `points/adjust`·`site/points/config` 두 라우트에 가드가 없었고,
  오케스트레이터의 수리(커밋 제목 "fix(security): 첨부 다운로드·관리자 포인트 API 에 권한 검사 추가")로 두
  라우트 모두 `adminServerActionCheck()` 거부 시 403 을 돌려준다(`route.ts:11,14-16`). 이 수리는 커밋
  `9c74cde` 로 main 에 들어갔다.
- 감사 기록: `auditLogger`(`server/api/trpc.ts:96`)는 성공한 tRPC mutation 만 기록하고, 대상 열은
  `target: ''` 로 비워 둔다(`trpc.ts:104-110`, 주석 "Slice E 에서 result 로부터 추출"). 대상은 입력에 id 가
  있을 때만 `diff.input` 안에 남는다. `AdminLog.target` 은 인덱스가 있는 전용 열이며(`schema.prisma:247,254`,
  스키마 주석 예시 `"module:notice" | "menu:1" | "site:settings"`), 일부 프로시저는 이미 직접
  `menu:<id>` 같은 형식으로 대상을 쓴다(`routers/admin/menu.ts:220`·`export.ts:44`·`document.ts:114`). 두 포인트
  라우트에는 `grep -n "adminLog\|AdminLog"` 0건으로, 기록 경로가 없다(REQ-MEMB-023).

### 2.8 이용 제한 거부와 로그인 단일 실패 응답

- `packages/auth/src/login.ts:17-19` 보안 불변식: 모든 실패는 단일 코드 `INVALID_CREDENTIALS`, 실패 단계를
  노출하지 않는다(REQ-AUTH-051). status 게이트(`:264-270`)는 비밀번호 검증 전에 `failClosed` 로 거부한다.
- 레거시는 거부(`refused_reason`)·이용 제한(`limited_reason`) 사유를 로그인 실패 메시지에 붙인다
  (`modules/member/member.controller.php:2787-2798`). 제한 경계는 `substr(limit_date,0,8) >= date('Ymd')`
  (`:2550`)로 종료일 당일까지 제한한다.
- 결론: REQ-MEMB-007 은 경계는 레거시를 따르고, 사유 노출은 rhymix-ts 불변식을 따른다(spec.md §4 의도적 차이).

### 2.9 약관 편집

- 감사 시점에는 `terms/actions.ts` 의 저장·삭제가 목업(`console.log('[Mock] …')`)이었다(`lgp-002-member.md` § 정정).
  작업 트리에서는 `getServerCaller()` 로 `admin.terms.update/create/delete` 를 호출한다(`terms/actions.ts:52,54,80`).
- 커스텀 약관은 개수 제한이 없고 행별 필수·선택 토글이 있다(`TermsEditor.tsx:183-186` 입력, `:243` 목록 표시,
  tRPC `terms.ts:46,86` `required`). 가입 화면은 약관별 필수·선택을 표시한다(`(auth)/signup/TermsConsent.tsx:84`).
  레거시 동의 항목 5칸은 이것으로 대응하므로 판정표 § 미검증의 "행별 필수 토글 UI" 는 있음으로 해소된다.

## 3. 레거시 포인트 동작의 의미 (`/mnt/d/project/rhymix/modules/point/point.controller.php`)

| 설정 | 레거시 동작 | 위치 |
|---|---|---|
| `login_point` | 하루 첫 로그인에만 지급("Points are given only once a day.") | 55-66행 |
| `insert_comment_limit` | 부모 문서 등록일이 N일보다 오래되면 댓글 포인트 없음 | 269-270, 337-338행 |
| `read_document_limit`·`read_document_author_limit` | 문서 등록일이 N일보다 오래되면 읽기 포인트 없음 | 508-512행 |
| `voter_limit`·`voted_limit` 등 | 대상 문서·댓글 등록일이 N일보다 오래되면 추천·비추천 포인트 없음, 취소 시 반대 부호로 회수 | 585-615행 |
| `disable_download` | 잔액 + 다운로드 비용 < 0 이면 다운로드 거부 | 426행 |
| `disable_read_document` | 잔액 + 읽기 비용 < 0 이면 읽기 거부 | 537행 |
| `*_revert_on_delete` | 삭제 시 회수 여부를 모듈별 설정에서 조회 | 214, 322, 385행 |
| `level_step` | `PointModel::getLevel($point, $config->level_step)` 로 잔액→레벨 계산. `point.model.php:107-118` 은 `level_step[1]` 미만이면 0 을 돌려주는 0 기반 | 683, 776행 |
| 일수 제한 경계 | `regdate < RX_TIME - (limit * 86400)` — 정확히 N×24시간 경과한 대상은 아직 지급 | 269-270, 508-512행 |
| 로그인 포인트 날짜 | `substr(last_login, 0, 8) === date('Ymd')` 이면 지급하지 않음(서버 시간대) | 56행 |

확인 명령: `grep -n -E "login_point|_limit|revert_on_delete|disable_read_document|disable_download|level_step|group_ratchet" point.controller.php`, `sed -n 50,80p`, `sed -n 585,615p`.

## 4. 레거시 폼 필드 추출

`pages/*.json` 의 `forms[].fields[].name` 을 파이썬으로 읽어 추출했다(즐겨찾기 토글 폼 제외).
SPEC 의 근거 필드명은 이 출력에서 왔다.

- `procPointAdminInsertConfig`: `point_name`, `max_level`, `level_step`, `level_icon`,
  `login_point`, `signup_point`, `insert_document(_revert_on_delete)`, `insert_comment(_limit,
  _revert_on_delete)`, `upload_file(_revert_on_delete)`, `download_file(_author)`, `read_document(_author,
  _limit, _except_notice …)`, `voter/voted/blamer/blamed(_comment, _limit)`, `disable_download`,
  `disable_read_document(_except_robots)`, `group_ratchet`, `group_reset`, `point_group_4`, `able_module`.
  행위 금액 키 16종: `login_point`·`insert_document`·`insert_comment`·`upload_file`·`download_file`·
  `download_file_author`·`read_document`·`read_document_author`·`voter`·`voted`·`blamer`·`blamed`·
  `voter_comment`·`voted_comment`·`blamer_comment`·`blamed_comment`. 일수 제한 11종: `insert_comment_limit`·
  `read_document_limit`·`read_document_author_limit`·`voter_limit`·`voted_limit`·`blamer_limit`·`blamed_limit`·
  `voter_comment_limit`·`voted_comment_limit`·`blamer_comment_limit`·`blamed_comment_limit`.
- `procPointAdminInsertModuleConfig`: 위 행위 키 15종 × 모듈 번호(`[1]`·`[51]`·`[53]`·`[55]`).
- `dispPointAdminPointList` 검색: `is_admin`·`selected_group_srl`·`search_target`·`search_keyword`,
  행 폼 `procPointAdminUpdatePoint`(`member_srl`·`point`).
- `dispMemberAdminAuthLog`: 검색 `search_target`·`search_keyword`·`action_type`, 정리
  `procMemberAdminClearAuthLog`(`days`).
- `procMemberAdminInsertFeaturesConfig`: `scrapped_documents`·`saved_documents`·`my_documents`·
  `my_comments`·`active_logins`·`auth_log`·`nickname_log`.
- `procMemberAdminInsertLoginConfig`: `identifiers[]`·`change_password_date`·`max_error_count`·
  `max_error_count_time`·`login_failure_except_ip`·`login_log`·`login_invalidate_other_sessions`·
  `after_login_url`·`after_logout_url`.
- `procMemberAdminInsert`: `user_id`·`email_address`·`reset_password`·`user_name`·`nick_name`·
  `homepage`·`blog`·`birthday`·`signature`·`allow_mailing`·`allow_message`·`status`·`limit_date`·
  `limited_reason`·`refused_reason`·`is_admin`·`description`·`group_srl_list[]`.

## 5. 미검증 (Gaps)

- `LoginAttempt` 에 실제로 행이 쌓이는지(런타임), 2FA 실패가 같은 테이블에 들어가는 형태는 코드
  (`two-factor.ts:117,126,144`)로만 확인했다.
- 레거시 인증 로그의 `action_type` 선택지 전체(로그인 외 동작 유형)는 캡처의 select 값까지 열어 보지
  않았다. rhymix-ts 의 결과 유형 4종으로 대응한다(`design.md` D4).
- 레거시 `limit_day` 의 정확한 의미는 확인하지 않았다(§4 로 보류).
- 게시판 포인트 값 분포는 개발 DB 에서만 측정했다. 운영 DB 는 측정하지 않았다.
- 로그인 최대 실패 횟수 전달 수리(§2.6)는 코드와 그 테스트 파일의 존재로만 확인했다. 이 SPEC 작성 중에
  그 테스트를 실행하거나 런타임으로 재현하지 않았고, 작성 시점에는 미커밋이었다 — 이후 `14d04b2` 로 커밋·푸시됨.
- 관리자 포인트 라우트 가드는 커밋 `9c74cde`, 약관 연결 수리는 커밋 `2f30dc7` 로 main 에 있다(§2.7·§2.9).
