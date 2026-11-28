# SPEC-LEGACY-PARITY-002 — acceptance

> 요구사항 1건당 수용 기준 1건(AC-MEMB-001~023). 각 기준은 Given-When-Then 과 검증 수단을 가진다.
> 테스트 파일 경로는 추가할 파일의 권고 위치이며, 실제 위치는 run-phase 가 정하되 같은 검증을 해야 한다.
> 브라우저 절차: dev 서버 재기동 후 http://localhost:3000, 관리자 `admin` / `Admin1234!`.
> vitest 는 저장소 루트에서 실행한다. "사이트 시간대"는 `Site.timeZone` 이며, 시간이 걸린 케이스는
> 사이트 시간대를 `Asia/Seoul` 로 두고 시계를 고정(fake timer)해 검증한다.

## AC-MEMB-001 — 회원 상세 진입 (REQ-MEMB-001)

- Given 회원 `member1` 이 존재하고 관리자로 로그인한 상태
- When 관리자가 `/admin/members` 목록에서 `member1` 행의 링크를 누르면
- Then `/admin/members/<id>` 화면이 열리고 아이디·이메일·이름·닉네임·상태·관리자 여부·그룹·가입일·
  마지막 로그인 시각과 IP·포인트 잔액이 보이며, 포인트 이력과 닉네임 변경 기록으로 가는 링크가 있다
- 검증: `apps/web/app/admin/members/[id]/page.test.tsx`(렌더 단언) + 브라우저 절차.
  `grep -n "admin/members/\${" apps/web/app/admin/members/components/MemberTable.tsx` 가 1건 이상
  (작성 시점 0건)

## AC-MEMB-002 — 회원 정보 수정 저장 (REQ-MEMB-002)

- Given `member1` 의 상세 화면
- When 관리자가 이메일·이름·닉네임·쪽지 수신 허용·그룹·가입 추가 항목 값을 바꿔 저장하면
- Then 새로고침 후 바뀐 값이 그대로 보이고 DB 의 `users`·`member_group_members` 행이 같은 값이다
- 검증: 수정 경로 테스트(`apps/web/server/api/routers/admin/user.update-profile.test.ts` 또는 Server Action
  테스트) + 브라우저에서 저장 → 새로고침 확인

## AC-MEMB-003 — 검증 실패 시 전체 거부 (REQ-MEMB-003)

- Given 회원 A 와 B 가 있고, 닉네임 변경 허용이 켜져 있다
- When A 의 수정에서 이메일을 B 의 이메일로, 이름을 새 값으로 함께 바꿔 저장하면
- Then 저장이 거부되고 이메일 필드에 오류가 표시되며, A 의 이름을 포함한 어떤 값도 바뀌지 않는다
- And 닉네임 변경 허용이 꺼진 상태에서 닉네임을 바꾸면 같은 방식으로 거부된다
- 검증: 같은 테스트 파일에 중복 아이디·이메일·닉네임·정책 위반·변경 금지 5케이스, 각 케이스 후 DB 값 불변 단언

## AC-MEMB-004 — 관리자 비밀번호 재설정 (REQ-MEMB-004)

- Given `member1` 이 다른 브라우저에서 로그인해 있다
- When 관리자가 상세 화면에서 새 비밀번호를 지정해 저장하면
- Then `users."passwordHash"` 가 `$argon2id$` 로 시작하는 PHC 문자열로 바뀌고, `member1` 의 기존 세션이
  무효화되며(`session_revocations` 행 1건 추가), 새 비밀번호로 로그인된다
- And AdminLog·응답 본문에 새 비밀번호 평문이 없다
- 검증: 테스트에서 `revokeAllSessions` 호출과 해시 형식 단언, AdminLog 입력값에 비밀번호 키가 마스킹되었는지
  단언. 브라우저: 두 번째 브라우저에서 다음 요청 시 로그인 화면으로 이동

## AC-MEMB-005 — 변경 기록 (REQ-MEMB-005)

- Given 닉네임 변경 기록 저장이 켜져 있다
- When 관리자가 상세 화면에서 닉네임과 이메일을 바꿔 저장하면
- Then `nickname_change_logs` 에 `changedByAdminId` 가 관리자인 행이 1건 생기고, AdminLog 에 이 수정 행이 남는다
- And 기록 저장이 꺼져 있으면 닉네임 변경 기록 행은 생기지 않는다
- 검증: 수정 경로 테스트 2케이스 + `/admin/members/nickname-log` 브라우저 확인

## AC-MEMB-006 — 마지막 관리자 보호와 경로 단일화 (REQ-MEMB-006)

- Given 관리자가 `admin` 한 명뿐이다
- When 상세 화면에서 `admin` 의 관리자 여부를 끄고 저장하면
- Then 저장이 거부되고(`LAST_ADMIN_PROTECTED`) `admin` 은 여전히 관리자다
- And 다른 회원의 관리자 여부를 바꾸는 저장은 `toggleAdminRole` 을 정확히 1회 호출하고, 상태를 SUSPENDED 로
  바꾸는 저장은 `changeUserStatus` 를 정확히 1회 호출해 세션 무효화가 일어난다
- 검증:
  1. 수정 경로 테스트 3케이스. `toggleAdminRole`·`changeUserStatus` 를 spy 로 감싸 호출 횟수를 단언하고,
     Prisma mock 의 `user.update`·`user.updateMany`·`user.upsert` 호출 인자 중 `data` 에 `isAdmin` 또는
     `status` 키가 있는 호출이 0건임을 단언한다.
  2. 저장 경로 전체에 대한 grep:
     `grep -rnE "data:\s*\{[^}]*(isAdmin|status)\s*:" apps/web/server/api/routers/admin/user.ts apps/web/lib/auth/admin-actions.ts "apps/web/app/admin/members/[id]"`
     결과 0건. (작성 시점 `isAdmin:` 은 `user.ts:124`(목록 필터)·`:147`(select) 두 곳뿐이며 둘 다 이 패턴에
     걸리지 않는다.) 이 grep 은 한 줄 단위라 여러 줄로 감싼 `data: {…}` 를 놓칠 수 있는 보조 확인이다. PASS 판정의
     근거는 1번(spy·Prisma mock 단언)이며, 2번만으로 PASS 를 주장하지 않는다.

## AC-MEMB-007 — 이용 제한 (REQ-MEMB-007)

- Given 사이트 시간대 `Asia/Seoul`, 오늘은 2026-12-10, 관리자가 `member1` 에 종료일 2026-12-10 과 제한 사유
  "도배", 거부 사유 "광고", 관리자 메모 "확인 필요"를 저장했다
- When `member1` 이 올바른 비밀번호로 로그인하면
- Then 로그인이 거부되고 반환값은 틀린 비밀번호와 같은 `{ ok: false, code: 'INVALID_CREDENTIALS' }` 이다
  (키가 정확히 `ok`·`code` 두 개, 응답 어디에도 "도배"·"광고"가 없다)
- And 시계를 2026-12-11 00:00(사이트 시간대)로 옮기면 같은 로그인이 성공한다
- And 관리자가 제한을 지우면 2026-12-10 에도 로그인이 성공한다
- And 상세 화면에는 네 값이 보이고, 회원 본인 화면에는 보이지 않는다
- 검증: `packages/auth/src/login.test.ts` 에 당일·익일·해제 3케이스(응답 객체 deep-equal 단언) + 상세 화면 저장
  테스트. 회원 화면 노출 0건: `grep -rnE "limitedReason|refusedReason|adminMemo" "apps/web/app/(member)" "apps/web/app/(auth)"`
  결과 0건(열 이름은 run-phase 에서 정한 이름으로 치환해 실행하고, 실행한 명령을 progress.md 에 기록)

## AC-MEMB-008 — 인증 로그 화면 (REQ-MEMB-008)

- Given 로그인 성공 1회, 잘못된 비밀번호 2회가 기록되어 있다(`login_attempts`)
- When 관리자가 인증 로그 화면을 열고 결과 유형을 "실패(INVALID_CREDENTIALS)"로 거르면
- Then 실패 2건만 최신순으로 보이고 각 행에 시각·IP·식별자·결과·일치 회원이 표시된다
- And 회원 닉네임으로 검색하면 그 회원의 아이디·이메일로 시도한 기록이 나온다
- 검증: 라우터 테스트(`apps/web/server/api/routers/admin/auth-log.test.ts`)에서 필터·검색·정렬·페이지 단언.
  브라우저: 로그아웃 → 틀린 비밀번호 2회 → 관리자로 로그인 → 화면에서 3건 확인

## AC-MEMB-009 — 기록 기간 삭제 (REQ-MEMB-009)

- Given 인증 로그에 실행 시각 기준으로 40일 경과한 행 3건, 오늘(1시간 경과) 행 2건, 30일 1분 경과한 행 1건,
  29일 23시간 59분 경과한 행 1건이 있고 로그인 실패 집계 시간창은 10분이다
- When 관리자가 "30일보다 오래된 기록 삭제"를 실행하면
- Then 40일 경과 3건과 30일 1분 경과 1건, 모두 4건만 삭제되고 "4건 삭제"가 표시되며 나머지 3건은 남는다
- And 닉네임 변경 기록에도 같은 규칙으로 동작한다
- And 입력 0일은 두 기록 모두 거부되고, 시간창을 2880분(2일)으로 바꾸면 인증 로그 삭제의 1일 입력은 거부되고
  2일 입력은 수락된다
- 검증: 라우터 테스트 인증 로그 4케이스(경계 2 + 최소 일수 2) + 닉네임 기록 2케이스. 각 삭제 후 AdminLog 행 존재
  단언은 AC-MEMB-023 이 맡는다

## AC-MEMB-010 — 회원 기능 토글 저장 (REQ-MEMB-010)

- Given 기능 설정이 한 번도 저장되지 않은 사이트
- When 관리자가 기능 설정 탭을 열면
- Then 스크랩·저장함·작성 글·작성 댓글·자동 로그인 관리·본인 인증 로그·닉네임 변경 기록 토글 7개가 모두 켜진
  상태로 보인다
- And 7개를 모두 끄고 저장한 뒤 새로고침하면 7개 모두 꺼진 상태로 보이고, 설정 조회 결과의 7개 키 값이 모두 `false` 다
- And 그중 하나만 다시 켜고 저장하면 그 키만 `true` 로 읽힌다
- 검증: 설정 스키마 테스트(키 7종, 미저장 시 기본값 `true`) + 저장·재조회 라우터 테스트(Server Action 이면 그
  테스트) + 브라우저 저장 → 새로고침 확인. 방문자 메뉴 숨김·거부는 `SPEC-LEGACY-PARITY-008` 의 수용 기준이며 이
  기준에 포함하지 않는다

## AC-MEMB-011 — 포인트 이름과 레벨 (REQ-MEMB-011)

- Given 포인트 이름 "코인", 최대 레벨 3, 기준점 [0, 100, 500](레벨 1·2·3 의 기준점)이 저장되어 있다
- When 잔액 0·99·100·499·500·600 인 회원의 레벨을 조회하면
- Then 각각 1·1·2·2·3·3 이고, 포인트 표시 위치에 "코인"이 쓰인다
- And 최대 레벨을 2 로 바꾸면 잔액 600 의 레벨은 2 다
- And 기준점이 비어 있으면 모든 잔액의 레벨은 1 이다
- 검증: `packages/point/src/level.test.ts`(또는 `service.test.ts`) 경계값 케이스 +
  `grep -n "Phase 3 stub" packages/point/src/service.ts` 0건(작성 시점 1건)

## AC-MEMB-012 — 행위별 기본 포인트 지급 (REQ-MEMB-012)

- Given 사이트 시간대 `Asia/Seoul`, 게시판에는 개별 금액이 없고(NULL), 사이트 기본값과 일수 제한이 아래 표와 같다
- When 표의 각 행위를 수행하면
- Then 행위자와 작성자에게 표의 금액이 지급된다. 일수 제한은 행위자·작성자 각자 자기 쪽 제한으로 판단해,
  자기 경계 안쪽(자기 제한 × 24시간 − 1분 경과)은 지급, 바깥쪽(자기 제한 × 24시간 + 1분 경과)은 그쪽만 0 이다
  (예: `read_document` 는 7일 1분 경과 시 행위자 0·작성자 1, 14일 1분 경과 시 둘 다 0)

| 행위 키 | 행위 | 사이트 기본값(행위자 / 작성자) | 일수 제한 | 추가 경계 케이스 |
|---|---|---|---|---|
| `login_point` | 로그인 | 5 / — | — | 같은 날(사이트 시간대) 두 번째 로그인 0, 23:59 → 다음 날 00:01 로그인은 다시 5 |
| `insert_document` | 문서 작성 | 10 / — | — | — |
| `insert_comment` | 댓글 작성 | 3 / — | 30일(부모 문서 기준) | — |
| `upload_file` | 첨부 업로드 | 2 / — | — | — |
| `download_file`·`download_file_author` | 첨부 다운로드 | −1 / +1 | — | — |
| `read_document`·`read_document_author` | 문서 읽기 | 1 / 1 | 행위자 7일, 작성자 14일 | 공지 제외가 켜지면 공지 읽기는 0 / 0 |
| `voter`·`voted` | 문서 추천 | 1 / 2 | 각 7일 | — |
| `blamer`·`blamed` | 문서 비추천 | −1 / −2 | 각 7일 | — |
| `voter_comment`·`voted_comment` | 댓글 추천 | 1 / 2 | 각 7일 | — |
| `blamer_comment`·`blamed_comment` | 댓글 비추천 | −1 / −2 | 각 7일 | — |

- 검증:
  1. `packages/point/src/hooks.test.ts`(또는 금액 해석 테스트)에 위 표의 행마다 표 기반 케이스: 행위자 금액,
     작성자 금액, 일수 제한 안쪽·바깥쪽, 추가 경계 케이스. 작성자 쪽 일수 제한(`read_document_author_limit`
     등)은 행위자 쪽과 독립적으로 단언한다.
  2. 행위마다 실제 호출 지점 테스트: 로그인(`packages/auth/src/login.ts` 경로), 문서·댓글 작성, 업로드,
     다운로드 라우트 2개, 문서 조회, 문서·댓글 추천·비추천 경로의 테스트에서 포인트 훅(또는 서비스) 호출을 단언.
  3. 추천 훅 연결 확인:
     `grep -rnE "\.onVoteCast\(" packages apps/web --include=*.ts --include=*.tsx | grep -v -e '\.test\.' -e packages/point/src -e node_modules`
     결과 1건 이상. 작성 시점 결과는 0건(exit 1)이며, 정의 `packages/point/src/hooks.ts:84` 는
     `async onVoteCast(` 형태라 이 패턴에 걸리지 않는다. 훅 이름을 run-phase 에서 바꾸면 바뀐 이름으로 같은
     조건(포인트 패키지 밖 호출 1건 이상)을 확인한다.

## AC-MEMB-013 — 게시판별 덮어쓰기 (REQ-MEMB-013)

- Given 사이트 기본 문서 포인트 10, 게시판 A 는 값 없음(NULL), 게시판 B 는 0, 게시판 C 는 50
- When 각 게시판에 문서를 쓰면
- Then A 10, B 0, C 50 이 지급된다
- And 관리자 화면에서 C 의 값을 지우면 다음 문서부터 10 이 지급된다
- And 문서 외 행위도 같은 규칙을 따른다: 사이트 기본 `voted_comment` 2, 게시판 C 의 `voted_comment` 를 관리자
  화면에서 5 로 저장하면 C 의 댓글이 추천받을 때 작성자에게 5 가, A 의 댓글은 2 가 지급된다
- 검증:
  1. 금액 해석 단위 테스트 4케이스(NULL·0·양수·해제 후 NULL) + `voted_comment` 화면 저장·지급 1케이스.
  2. 마이그레이션 SQL 확인(개발 DB). 마이그레이션 전 측정값: `boards` 2행, 6개 열 중 하나라도 0 이 아닌 행 0개
     (2026-11-28 오케스트레이터 측정 `2|0`). 마이그레이션 후 다음 두 질의의 결과가 모두 **0** 이어야 한다.
     ```sql
     SELECT count(*) FROM boards WHERE "pointPerDocument" = 0 OR "pointPerComment" = 0
       OR "pointPerVoteUp" = 0 OR "pointPerVoteDown" = 0 OR "pointPerDownload" = 0 OR "pointPerFileUpload" = 0;
     SELECT count(*) FROM boards WHERE "pointPerDocument" IS NOT NULL OR "pointPerComment" IS NOT NULL
       OR "pointPerVoteUp" IS NOT NULL OR "pointPerVoteDown" IS NOT NULL OR "pointPerDownload" IS NOT NULL
       OR "pointPerFileUpload" IS NOT NULL;
     ```
     두 번째 질의의 기대값 0 은 "마이그레이션 전 0 이 아닌 행 수(개발 DB 0)"와 같다는 뜻이다. 다른 DB 에서는 그
     DB 의 마이그레이션 전 0 이 아닌 행 수와 같아야 하며 값도 바뀌지 않아야 한다. run-phase M1 이 열 구조를
     바꾸면 같은 의미의 질의로 대체하고 실행한 질의를 progress.md 에 기록한다.
  3. `prisma migrate reset` 계열로 빈 DB 에서 처음부터 적용해도 성공한다.

## AC-MEMB-014 — 삭제 시 회수 (REQ-MEMB-014)

- Given 문서 회수 켜짐, 회원이 문서 작성으로 10 을 받았다
- When 문서가 삭제되면
- Then 10 이 한 번 회수되고, 같은 문서의 삭제를 다시 처리해도 추가 회수가 없다
- And 회수가 꺼져 있으면 잔액이 그대로다
- And 댓글·첨부 업로드도 각자의 회수 설정에 따라 같은 방식으로 동작한다
- 검증: `packages/point/src/hooks.test.ts` 또는 `packages/document/src` 삭제 경로 테스트 — 문서 3케이스 + 댓글·첨부 각 1케이스

## AC-MEMB-015 — 포인트 부족 시 제한 (REQ-MEMB-015)

- Given 다운로드 제한 켜짐, 다운로드 비용 −20, 회원 잔액 10
- When 회원이 파일을 내려받으려 하면
- Then 다운로드가 거부되고 부족분 10 이 안내된다. 잔액 30 인 회원은 내려받고 잔액이 10 이 된다
- And 읽기 제한도 같은 방식으로 동작한다
- And 첨부 다운로드의 기존 읽기 권한 검사(`apps/web/app/api/files/_lib/can-read-attachment.ts`)는 그대로 먼저 적용된다
- 검증: 다운로드 라우트 테스트 2케이스 + 문서 조회 경로 테스트 2케이스 + 기존 다운로드 라우트 테스트 전부 통과

## AC-MEMB-016 — 포인트 목록 (REQ-MEMB-016)

- Given 회원 3명(관리자 1, 정회원 그룹 2)
- When 관리자가 포인트 목록에서 그룹 "정회원"으로 거르고 닉네임으로 검색하면
- Then 해당 회원만 잔액·레벨과 함께 보이고, 행의 링크가 `/admin/members/<id>/points` 로 간다
- And 관리자 여부 필터를 켜면 관리자 1명만 보인다
- 검증: 목록 조회 테스트(필터·검색·페이지) + 브라우저 절차

## AC-MEMB-017 — 로그인 실패 집계 횟수·시간창 (REQ-MEMB-017)

- Given CAPTCHA 꺼짐, 로그인 설정에 최대 실패 3회·시간창 5분이 저장되어 있다
- When 같은 IP 에서 0분·1분·2분에 틀린 비밀번호로 실패한 뒤 3분에 올바른 비밀번호로 로그인하면
- Then 그 로그인 결과는 `{ ok: false, code: 'RATE_LIMITED' }` 다
- And 같은 조건에서 실패를 0분·6분·12분에 낸 뒤 12분 30초에 올바른 비밀번호로 로그인하면 성공한다
- And 최대 실패를 4회로 바꿔 저장하면 첫 번째 시나리오의 로그인이 성공한다(저장값이 판정에 쓰인다는 증거)
- 검증: `packages/auth/src/login-rate-limit.test.ts` 확장(fake timer) + `apps/web/lib/auth/config.ts` 의 `login()`
  호출이 저장된 시간창을 전달하는지 단언하는 테스트 + 설정 탭 저장 테스트. 최대 횟수 전달은 이 SPEC 밖에서
  수리되었으므로(spec.md §2.3) 그 테스트 `apps/web/lib/auth/authorize-max-error.test.ts` 가 계속 통과하는지만
  확인한다. 시간창 전달 grep:
  `grep -rnE "^\s*windowMinutes\b|\bwindowMinutes\s*:" apps/web --include=*.ts | grep -v -e node_modules -e '\.test\.'`
  작성 시점 0건(exit 1) → 완료 후 1건 이상. 이 패턴은 속성 지정(`windowMinutes:`)과 축약형(`windowMinutes,`)만
  잡고, 작성 시점 `config.ts:142` 의 주석 속 `windowMinutes` 는 잡지 않는다

## AC-MEMB-018 — 로그인 시 다른 세션 무효화 (REQ-MEMB-018)

- Given 설정이 켜져 있고 회원이 브라우저 1 에서 로그인해 있다
- When 같은 회원이 브라우저 2 에서 로그인하면
- Then 브라우저 1 의 세션이 무효화된다. 설정이 꺼져 있으면 두 세션이 모두 유지된다
- 검증: 로그인 테스트 2케이스(`revokeAllSessions` 호출 여부) + 브라우저 2개 절차

## AC-MEMB-019 — 일괄 그룹 배정 (REQ-MEMB-019)

- Given 회원 목록에서 2명을 선택했다
- When 관리자가 그룹 "정회원"을 지정해 일괄 적용하면
- Then 두 회원의 그룹이 "정회원"으로 바뀌고 AdminLog 에 1건이 남는다. 처리 중 오류가 나면 둘 다 바뀌지 않는다
- 검증: `admin.user.bulk`(또는 새 프로시저) 테스트 — 정상·트랜잭션 롤백 2케이스

## AC-MEMB-020 — 진입 경로 (REQ-MEMB-020)

- Given 관리자 로그인 상태
- When 사이드바의 회원 그룹 링크와 그 화면 안의 링크만 따라가면
- Then 약관·이메일 도메인 검사·인증 로그·포인트 목록·게시판별 포인트·회원 상세에 모두 도달한다
- And 사이드바 `NAV` 배열의 그룹 순서·소속은 변경 전과 같다
- 검증: `grep -rn -E "admin/members/(terms|email-hosts|auth-log)" apps/web/app apps/web/components --include=*.tsx`
  에서 각 경로가 자기 디렉터리 밖 파일에 1건 이상. `git diff <base>..HEAD -- apps/web/components/admin/AdminSidebar.tsx`
  출력 없음. 브라우저에서 링크 따라가기

## AC-MEMB-021 — 관리자 가드 (REQ-MEMB-021)

- Given 관리자 2FA 가 필수로 설정되어 있고, (a) 일반 회원 세션, (b) 2FA 미인증 관리자 세션, (c) 2FA 인증을 마친
  관리자 세션이 있다
- When 각 세션으로 이 SPEC 이 추가·변경한 관리자 라우트 핸들러·Server Action·tRPC 프로시저를 요청 단위로 호출하면
- Then (a)·(b)는 거부되고(라우트 핸들러는 HTTP 403, Server Action 은 기존 관리자 액션과 같은 실패 계약, tRPC 는
  `FORBIDDEN`/`UNAUTHORIZED`) 상태가 바뀌지 않으며, (c)만 성공한다
- 검증:
  1. 추가·변경한 라우트 핸들러·Server Action 마다 (a)(b)(c) 3케이스 요청 단위 테스트(D-7 의 `*.guard.test.ts(x)`
     형태). 기존 사례 `apps/web/app/admin/api/points/adjust/route.test.ts`·
     `apps/web/app/admin/api/site/points/config/route.test.ts` 가 계속 통과한다.
  2. 가드 없는 관리자 라우트 핸들러 0건:
     `find apps/web/app/admin/api -name route.ts | xargs grep -L -E "adminServerActionCheck|assertAdminServerAction"`
     출력 없음(작성 시점 출력 없음 — 회귀 방지 기준선).
  3. 새·변경 tRPC 프로시저가 모두 `protectedAdminProcedure` 인지: 해당 라우터 파일에서
     `grep -nE "\b(publicProcedure|protectedProcedure)\b"` 0건.
  4. 새·변경 Server Action 파일마다 `assertAdminServerAction|adminServerActionCheck` grep 1건 이상, 또는 모든
     쓰기가 `getServerCaller()` 의 `admin.*` 프로시저 호출뿐임을 코드 리뷰로 확인하고 progress.md 에 파일별로 기록.
  5. 방문자 경로(`app/api/files/**`, 문서 조회)에는 관리자 가드를 추가하지 않는다: 이 SPEC 의 diff 에서
     `git diff <base>..HEAD -- apps/web/app/api/files | grep -E "^\+.*(adminServerActionCheck|assertAdminServerAction)"` 0건

## AC-MEMB-022 — 고유 기능 보존과 선행 SPEC 재검증 (REQ-MEMB-022)

- Given run-phase 시작 시점의 base SHA
- When 이 SPEC 의 변경이 끝난 뒤
- Then `denied-list`·`email-hosts`·`settings/social`·`members/new`·`groups/[id]/edit`·`terms` 화면이 계속
  동작하고, 비밀번호 재설정은 여전히 무조건 세션을 무효화하며, 로그인 실패 응답은 여전히 단일 형태이고,
  `SPEC-MEMBER-PARITY-001` 의 AC-MPAR-001~005 가 다시 통과한다
- 검증: 해당 화면들의 기존 테스트 실행(`pnpm vitest run apps/web/app/admin/members`),
  `grep -n "revokeAllSessions" packages/auth/src/password-reset.ts` 1건 이상 유지,
  `packages/auth/src/login.test.ts` 의 기존 단일 실패 응답 테스트 통과,
  SPEC-MEMBER-PARITY-001 acceptance.md 의 검증 방법 재실행 결과를 progress.md §E.2 에 기록

## AC-MEMB-023 — 관리자 감사 기록 (REQ-MEMB-023)

- Given 관리자 `admin` 으로 로그인한 상태
- When 인증 로그 기간 삭제, 닉네임 기록 기간 삭제, 회원 정보 수정(비밀번호 재설정 포함), 일괄 그룹 배정, 회원
  포인트 조정(`POST /admin/api/points/adjust`), 사이트 포인트 설정 저장(`POST /admin/api/site/points/config`),
  게시판별 포인트 저장, 회원 기능 토글 저장, 로그인 설정 저장을 각각 1회 수행하면
- Then 작업마다 `admin_logs` 에 행이 정확히 1건 생기고(게시판별 포인트 저장은 값을 바꾼 게시판 1개만 바꾼다),
  `actorId` 가 `admin` 의 id 이며, `target` **열**이 비어 있지 않고 아래 표의 값과 정확히 같다.
  `diff` 안에만 대상이 있는 행은 FAIL 이다
- And 어떤 행의 `target`·`diff` 에도 비밀번호 평문이나 해시가 없다
- And 작업이 가드나 검증에서 거부되면 감사 행이 생기지 않는다

| 작업 | 기대 `target` |
|---|---|
| 인증 로그 기간 삭제 | `auth-log` |
| 닉네임 기록 기간 삭제 | `nickname-log` |
| 회원 정보 수정(비밀번호 재설정 포함) | `user:<수정한 회원 id>` |
| 일괄 그룹 배정(그룹 1개 지정) | `group:<지정한 그룹 id>` |
| 회원 포인트 조정 | `user:<조정한 회원 id>` |
| 사이트 포인트 설정 저장 | `point-config:site` |
| 게시판별 포인트 저장 | `point-config:board:<바꾼 게시판 id>` |
| 회원 기능 토글 저장 | `settings:<M1 이 progress.md 에 기록한 기능 토글 구역>` |
| 로그인 설정 저장 | `settings:member.login` |

- 검증:
  1. 작업별 테스트에서 생성된 AdminLog 의 `target` 열 값을 위 표와 equal 로 단언한다. tRPC mutation 은
     `auditLogger` 를 거친 호출(호출자 단위 테스트)로, Server Action·라우트 핸들러는 직접 호출로 검증한다.
     `diff` 내용으로 대상을 확인하는 단언은 이 기준의 증거로 쓰지 않는다.
  2. 모든 행이 형식 정규식
     `^((user|board):[0-9]+|group:[0-9]+(,[0-9]+)*|point-config:(site|board:[0-9]+)|auth-log|nickname-log|settings:[a-z]+(\.[a-zA-Z]+)+)$`
     에 맞는지 같은 테스트에서 단언한다.
  3. tRPC 작업이 `admin_logs` 에 행을 2건(자동 기록 + 수동 기록) 남기지 않는지 단언한다.
  4. 작성 시점 기준선: `apps/web/server/api/trpc.ts:107` 은 `target: ''` 이고, `grep -n "adminLog\|AdminLog"
     apps/web/app/admin/api/points/adjust/route.ts apps/web/app/admin/api/site/points/config/route.ts` 0건이다.
     이 SPEC 이 건드리지 않는 기존 관리자 프로시저의 `target` 은 이 기준의 대상이 아니다(소급 채움 없음)

## 완료 조건 (Definition of Done)

- AC-MEMB-001~023 전건 PASS. 008·007 에 넘긴 항목(§2.4)은 이 SPEC 의 수용 기준이 아니다.
- 판정표 16행 모두 최종 판정 유지(spec.md §2.2), 판정 누락 0.
- 변경 패키지·앱 타입 확인 오류 0, 린트 새 오류 0.
- 새 코드 커버리지 85% 이상(변경 파일 기준).
- 마이그레이션은 빈 DB 에서 처음부터 적용(`prisma migrate reset` 계열)했을 때 성공.
- 브라우저 절차가 있는 AC 는 실제 화면 확인 결과(무엇을 눌러 무엇을 봤는지)를 progress.md 에 기록.
