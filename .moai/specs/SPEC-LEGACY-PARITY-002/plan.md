# SPEC-LEGACY-PARITY-002 — plan

> 마일스톤은 **바뀔 가능성이 큰 결정부터** 놓았다. 데이터 모델(되돌리기 어려움)과 화면 흐름(사용자 검토가
> 필요함)이 앞에 오고, 기계적인 배선·링크·회귀 확인이 뒤에 온다. 시간 추정은 쓰지 않는다.

## A.0 티어 판정 — L

- 요구사항 23건(Tier M 상한 16 초과, Tier L 상한 25 이내). 수용 기준도 23건(1:1).
- 예상 변경 파일 25개 안팎(아래 A.3), Prisma 스키마·마이그레이션 포함 → Tier L 기준(15파일 초과)에 해당한다.
- SPEC-LEGACY-PARITY-000 REQ-LGP-001 이 영역 SPEC 을 정확히 10개로 묶으므로 회원과 포인트를 별도 SPEC 으로
  쪼갤 수 없다. 범위를 줄이는 대신 티어를 올렸다.
- 결과: 5개 산출물(spec·plan·acceptance·design·research). Tier L 의 기본 경로는 Route B(PR 경로)이므로
  run 착수 시 오케스트레이터가 브랜치·PR 전략을 확인한다.
- `depends_on` 없음. `SPEC-LEGACY-PARITY-000`(draft)은 상위 규약이라 `related_specs` 로만 둔다(run-phase
  Depends_on 사전 점검에서 막히지 않는다).

## A.1 마일스톤

### M1 — 데이터 모델 결정과 마이그레이션 (Priority High — 되돌리기 가장 어려움)

- 대상 REQ: REQ-MEMB-007·011·012·013·014·015·017 의 저장소 부분, REQ-MEMB-010 의 설정 키
- 작업:
  1. `SitePointConfig` 확장 — 포인트 이름, 최대 레벨, 레벨 기준점 배열, 레벨 아이콘 세트, 행위별 기본 금액
     16종·일수 제한 11종, 회수 토글 3종, 공지 제외 2종, 다운로드·읽기 제한 2종 (`design.md` D1)
  2. 게시판별 금액 6개 열을 nullable 로 바꾸고 기존 0 → NULL 로 옮긴다 (`design.md` D2, 결정됨)
  3. `User` 에 이용 제한 종료일·제한 사유·거부 사유·관리자 메모 열 추가 (`design.md` D3)
  4. 회원 설정 스키마에 기능 토글 7종(D5)과 로그인 실패 시간창·다른 세션 무효화 키 추가
- 결정 기록(2026-11-28 사용자 결정): 기존 게시판 포인트 값 0 은 "사이트 기본값 사용"이다. 근거 측정:
  개발 DB `boards` 2행, 0 이 아닌 값을 가진 행 0개(`2|0`). 다른 DB 에 적용하기 전에는 같은 질의로 0 이 아닌
  행 수를 세어 progress.md 에 기록하고, 0 이 아닌 값은 바꾸지 않는다.
- 이 결정은 `SPEC-POINT-001` REQ-POINT-005 의 "0 = 미지급" 의미를 뒤집는다(spec.md §7). 이전 직후에도
  사이트 기본 금액이 0 이므로 문서·댓글 지급 결과는 같아야 한다(회귀 테스트 선행).
- 파일: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/<new>/migration.sql`,
  `packages/point/src/schemas.ts`, `packages/point/src/config.ts`,
  `apps/web/server/api/routers/admin/settings.ts`

### M2 — 회원 상세·수정 화면 (Priority High — 사용자 흐름, 검토 필요)

- 대상 REQ: REQ-MEMB-001~007
- 작업: 회원 목록 행 → 상세 화면 링크, 상세 화면, 수정 폼, 비밀번호 재설정, 이용 제한 입력, 저장 경로.
  저장은 기존 부품(`changeUserStatus`·`toggleAdminRole`·`updateNickname` 판정·`hashPassword`·
  `revokeAllSessions`)을 거친다(`design.md` D6). 로그인 판정에 이용 제한 종료일 검사를 status 게이트와 같은
  단일 실패 경로로 추가한다(`design.md` D3).
- 파일: `apps/web/app/admin/members/[id]/page.tsx`(신규), `apps/web/app/admin/members/[id]/` 아래 수정 폼·
  Server Action(신규), `apps/web/app/admin/members/components/MemberTable.tsx`,
  `apps/web/server/api/routers/admin/user.ts`, `apps/web/lib/auth/admin-actions.ts`,
  `packages/auth/src/login.ts`
- 화면 흐름 결정(검토 대상): 상세와 수정을 한 화면에 둘지(레거시 방식) 나눌지는 run-phase 의 설계 단계에서
  정하되, REQ-MEMB-003 의 "전체 거부·부분 저장 없음"은 어느 쪽이든 지킨다.

### M3 — 인증 로그 화면과 기록 정리 (Priority High)

- 대상 REQ: REQ-MEMB-008·009
- 작업: `LoginAttempt` 조회 라우터(검색·결과 유형 필터·페이지), 회원 매칭(`design.md` D4), 기간 삭제 액션
  (인증 로그·닉네임 변경 기록 둘 다, 최소 일수 규칙 포함), 화면.
- 착수 전 실측: 로컬 앱에서 로그인 성공·실패를 한 번씩 만든 뒤 `login_attempts` 행이 생기는지 확인한다
  (`research.md` §5 미검증 해소).
- 파일: `apps/web/server/api/routers/admin/` 아래 인증 로그 라우터(신규 또는 `log.ts` 확장),
  `apps/web/server/api/routers/admin/index.ts`(라우터 등록), `apps/web/app/admin/members/auth-log/page.tsx`(신규),
  `apps/web/app/admin/members/nickname-log/page.tsx`, `apps/web/server/api/routers/admin/user.ts`
  (`nicknameLog` 정리)

### M4 — 포인트 엔진: 레벨·행위별 지급·게시판별 덮어쓰기·회수·제한 (Priority Medium)

- 대상 REQ: REQ-MEMB-011(계산), 012, 013(해석), 014, 015
- 작업: `getLevel` 자리표시자 교체(D7), 금액 해석 규칙(게시판 값 → NULL 이면 사이트 기본값), 일수 제한
  (24시간 단위, D8), 하루 1회 로그인 포인트(사이트 시간대, D8), 연결되지 않은 훅(`onVoteCast`, 업로드·다운로드)
  의 배선, 읽기 포인트, 삭제 시 회수, 다운로드·읽기 제한.
- 파일: `packages/point/src/service.ts`, `packages/point/src/hooks.ts`, `packages/document/src/document.ts`,
  `packages/document/src/vote.ts`, `packages/comment/src/service.ts`, `packages/file/src/attachment.ts`,
  `apps/web/app/api/files/[id]/download/route.ts`, `apps/web/app/api/files/by-key/[key]/download/route.ts`,
  `packages/auth/src/login.ts`
- 주의: 다운로드 라우트 2개에는 이 SPEC 밖에서 추가된 읽기 권한 검사(`apps/web/app/api/files/_lib/can-read-attachment.ts`)
  가 있다. 포인트 차감·제한은 그 검사 뒤에 붙이고, 관리자 가드는 넣지 않는다(REQ-MEMB-021 은 관리자 표면만).

### M5 — 포인트 관리 화면 (Priority Medium)

- 대상 REQ: REQ-MEMB-011(설정 입력), 012(기본 금액 입력), 013(게시판별 화면), 016
- 파일: `apps/web/app/admin/site/points/page.tsx`, `apps/web/app/admin/site/points/PointConfigForm.tsx`,
  `apps/web/app/admin/api/site/points/config/route.ts`, 게시판별 포인트 화면(신규, 위치는
  `apps/web/app/admin/site/points/` 아래 또는 `apps/web/app/admin/boards/[mid]/` 아래 — 기존 `feed`·
  `permissions` 하위 화면과 같은 형태), 포인트 목록 화면(신규)
- 주의: `route.ts` 의 기존 가드(`adminServerActionCheck`, 403)는 그대로 둔다.

### M6 — 대응 있음 행의 세부 격차 (Priority Medium/Low)

- 대상 REQ: REQ-MEMB-017·018·019
- 작업: 로그인 설정 탭에 시간창 입력 추가, `apps/web/lib/auth/config.ts` 의 `login()` 호출에 저장된 시간창
  전달(지금은 설정이 없어 기본값 10분이 쓰인다 — `research.md` §2.6). 최대 실패 횟수 전달은 이 SPEC 밖에서
  이미 수리되었으므로(spec.md §2.3) 같은 자리에 시간창만 더하고 그 테스트(`authorize-max-error.test.ts`)를
  깨지 않는다. 다른 세션 무효화, 일괄 그룹 배정.
- 파일: `apps/web/app/admin/members/settings/forms.tsx`, `apps/web/app/admin/members/settings/actions.ts`,
  `apps/web/lib/auth/config.ts`, `packages/auth/src/login.ts`, `apps/web/app/admin/members/components/MemberTable.tsx`,
  `apps/web/server/api/routers/admin/user.ts`(`bulk` 확장)

### M7 — 회원 기능 토글 (Priority Medium — 독립)

- 대상 REQ: REQ-MEMB-010
- 결정 기록(2026-11-28 사용자 결정): 이 SPEC 은 토글 7종의 설정 키·관리자 탭·저장을 맡고, 008 의 구현 여부와
  관계없이 닫는다. 토글에 따른 방문자 메뉴 숨김·직접 접근 거부는 `SPEC-LEGACY-PARITY-008` 이 맡는다(A.7).
- 작업: 기능 설정 탭에 토글 7개, 저장·재조회. 설정 키 목록을 progress.md 에 기록해 008 이 읽게 한다.
- 파일: `apps/web/app/admin/members/settings/forms.tsx`, `apps/web/app/admin/members/settings/actions.ts`,
  `apps/web/server/api/routers/admin/settings.ts`

### M8 — 진입 경로·가드·감사 기록과 회귀 재검증 (Priority Medium — 기계적)

- 대상 REQ: REQ-MEMB-020·021·022·023
- 작업: 회원 설정 화면 머리 링크에 약관·이메일 도메인·인증 로그 추가, 포인트 화면에 포인트 목록·게시판별
  포인트 링크 추가. 새·변경 관리자 표면 전부에 가드 적용 확인과 요청 단위 가드 테스트. tRPC 를 거치지 않는
  상태 변경(포인트 라우트 2개, Server Action)에 AdminLog 기록 추가. `SPEC-MEMBER-PARITY-001` 수용 기준 재실행.
- 감사 대상 열(REQ-MEMB-023, 2회차 감사 D2-1): `apps/web/server/api/trpc.ts` 의 `auditLogger` 는 지금
  `target: ''` 를 쓴다(`trpc.ts:104-110`). 프로시저가 자기 대상을 공급할 수 있게 확장한다. 방식은 run-phase 가
  고르되 후보는 (a) 프로시저 meta 에 대상 결정 함수를 두는 방식(`initTRPC.meta<…>()` 와 `.meta({…})`),
  (b) 입력·결과에서 대상을 계산하는 경로별 해석기 표다. 공급하지 않은 프로시저는 지금처럼 빈 문자열로 남겨
  기존 동작을 바꾸지 않는다. 이 SPEC 이 추가·변경하는 tRPC 작업만 대상을 공급하고, Server Action·라우트
  핸들러는 같은 형식(spec.md REQ-MEMB-023 표)으로 직접 쓴다. 형식 문자열을 만드는 작은 공용 함수를 두어
  세 경로가 같은 문자열을 쓰게 한다. 수동으로 AdminLog 를 쓰는 기존 프로시저 패턴(`menu.ts:220` 등)과 겹쳐
  한 작업이 2건을 남기지 않게 한다(AC-MEMB-023 검증 3).
- 파일: `apps/web/app/admin/members/settings/page.tsx`, `apps/web/app/admin/site/points/page.tsx`,
  `apps/web/app/admin/api/points/adjust/route.ts`, `apps/web/app/admin/api/site/points/config/route.ts`,
  `apps/web/server/api/trpc.ts`(`auditLogger` 대상 공급 확장 — 모든 관리자 mutation 이 지나는 공용 파일이므로
  기존 프로시저의 기록이 그대로인지 회귀 테스트로 확인), 대상 형식 공용 함수(신규, 위치는 run-phase 결정)

## A.2 의존 관계

- M1 → M2·M3·M4·M6·M7 (스키마 선행). M4 → M5 (화면은 엔진 규칙을 따른다).
- M2 와 M3 는 서로 독립이지만 `user.ts` 를 함께 고치므로 순차로 진행한다.
- M7 은 외부 SPEC 에 의존하지 않는다.
- M8 은 마지막. 다만 REQ-MEMB-021·023 은 각 마일스톤에서 새 표면을 만들 때 함께 지키고, M8 에서 전체를 확인한다.

## A.3 영향 파일 (예상)

신규: `app/admin/members/[id]/page.tsx` 와 그 하위 폼·액션, `app/admin/members/auth-log/page.tsx`, 인증 로그
라우터, 게시판별 포인트 화면, 포인트 목록 화면, 감사 대상 형식 공용 함수, 마이그레이션 1~2개, 테스트
파일(acceptance.md 참조).

수정: `schema.prisma`, `packages/point/src/{schemas,config,service,hooks}.ts`, `packages/auth/src/login.ts`,
`packages/document/src/{document,vote}.ts`, `packages/comment/src/service.ts`, `packages/file/src/attachment.ts`,
다운로드 라우트 2개, `server/api/trpc.ts`(`auditLogger` 대상 공급),
`server/api/routers/admin/{user,settings,index}.ts`, `lib/auth/{admin-actions,config}.ts`,
`app/admin/members/{components/MemberTable.tsx, settings/{page,forms,actions}.tsx|ts, nickname-log/page.tsx}`,
`app/admin/site/points/{page,PointConfigForm}.tsx`, `app/admin/api/site/points/config/route.ts`,
`app/admin/api/points/adjust/route.ts`.

## A.4 PRESERVE — 건드리지 않을 것

- `components/admin/AdminSidebar.tsx` 의 그룹 순서·소속(REQ-LGP-004). 새 화면은 그룹 안 링크로 연결한다.
- `app/admin/members/{denied-list,email-hosts,new,groups,terms}`, `settings/social` 의 동작(REQ-MEMB-022).
  약관 저장·삭제의 tRPC 연결(`terms/actions.ts`)은 이 SPEC 밖의 수리 결과이므로 그대로 둔다.
- 관리자 포인트 라우트 2개의 가드(`adminServerActionCheck` → 403)와 그 테스트(`route.test.ts`).
- 첨부 다운로드의 읽기 권한 검사(`apps/web/app/api/files/_lib/can-read-attachment.ts`).
- `packages/auth/src/password-reset.ts` 의 무조건 세션 무효화, Argon2id 고정, 로그인 단일 실패 응답(REQ-AUTH-051).
- `SPEC-MEMBER-PARITY-001` 이 만든 목록 정렬·필터·검색·일괄 삭제.
- 다른 SPEC 디렉터리, `.moai/state/`, `.moai/reports/legacy-admin-map/`.

## A.5 위험

| 위험 | 영향 | 대응 |
|---|---|---|
| D2 이전이 기존 지급 동작을 바꿈 | 문서·댓글 포인트가 갑자기 지급·미지급 | 사이트 기본 금액 기본값 0. M1 직후 회귀 테스트로 결과 동일 확인. 다른 DB 는 적용 전 0 이 아닌 행 수 측정 |
| 추천·다운로드 훅 연결로 실제 포인트가 움직이기 시작 | 운영 중 잔액 변화 | 기본 금액 0 이 기본값이라 설정 전에는 변화 없음. 테스트로 확인 |
| 회원 수정이 여러 부품을 거치며 부분 저장 | 데이터 불일치 | 검증 선행 + 단일 트랜잭션(D6), AC-MEMB-003 |
| 관리자 가드 누락 | 권한 상승 | AC-MEMB-021 의 요청 단위 테스트 + 가드 없는 라우트 0건 확인 |
| 감사 기록 누락(Server Action·라우트) 또는 대상 열 공백 | 기록 삭제 등 사고 추적 불가, 대상별 로그 조회 불가 | REQ-MEMB-023 대상 형식, AC-MEMB-023 의 `target` 열 단언 |
| `trpc.ts` 공용 미들웨어 수정 | 모든 관리자 mutation 의 감사 기록이 바뀜 | 대상을 공급하지 않는 프로시저는 기존과 같은 행을 남기는지 회귀 테스트 |
| 이용 제한 검사가 단일 실패 응답을 깸 | 계정 상태 노출 | status 게이트와 같은 `failClosed` 경로, AC-MEMB-007 응답 deep-equal 단언 |
| 시간창 전달 추가로 차단이 강해짐 | 기존 기본값(10분)과 다른 저장값이 갑자기 적용 | 저장값이 없으면 기존 기본값 유지. 최대 횟수는 이미 저장값이 쓰이므로(spec.md §2.3) 저장값이 있는 사이트는 progress.md 에 두 값을 기록 |
| 인증 로그 대량 행 | 화면 느림 | 페이지 제한, `createdAt` 인덱스(`schema.prisma` LoginAttempt 에 이미 있음) 활용 |
| 이용 제한 검사 추가로 로그인 경로 회귀 | 로그인 불가 | `packages/auth/src/login.test.ts` 계열 기존 테스트 전부 통과 + 새 케이스 |
| WSL2 에서 전체 테스트 경합 | 거짓 실패 | 범위 테스트 우선, vitest 는 저장소 루트에서 실행 |

## A.6 검증 실행 규칙

- vitest 는 저장소 루트에서 경로를 지정해 실행한다(예: `pnpm vitest run packages/point/src`).
- 브라우저 확인은 dev 서버 재기동 후 http://localhost:3000, 관리자 `admin` / `Admin1234!`.
- 타입 확인: `pnpm --filter web exec tsc --noEmit`, 패키지별 `tsc --noEmit`.

## A.7 교차 SPEC 인계

이 SPEC 이 하지 않고 다른 영역 SPEC 이 받아야 하는 항목이다. 해당 SPEC 을 작성할 때 이 목록을 범위에 옮긴다.
`SPEC-LEGACY-PARITY-000` §2.3 과 007·008 판정표 문서는 이 SPEC 의 수정 범위가 아니므로, 반영은 각 SPEC 작성
시점에 한다.

| 받는 SPEC | 항목 | 출처 act·필드 |
|---|---|---|
| `SPEC-LEGACY-PARITY-008` | 기능 토글 7종이 꺼졌을 때 방문자 메뉴 숨김·직접 접근 거부 (설정 키는 M7 이 progress.md 에 기록) | `dispMemberAdminFeaturesConfig` — `scrapped_documents`·`saved_documents`·`my_documents`·`my_comments`·`active_logins`·`auth_log`·`nickname_log` |
| `SPEC-LEGACY-PARITY-008` | 스크랩·저장함·작성 글·작성 댓글 방문자 기능 구현(2026-11-28 사용자 결정: 범위 안) | 같은 act |
| `SPEC-LEGACY-PARITY-008` | 회원 프로필 `homepage`·`blog`·`birthday`·`signature` 저장소와 관리자 상세 노출 | `dispMemberAdminInsert` |
| `SPEC-LEGACY-PARITY-007` | 메일 수신 동의 | `dispMemberAdminInsert` — `allow_mailing` |
| `SPEC-LEGACY-PARITY-007` | 가입 시 SMS·휴대폰 인증 | `dispMemberAdminSignUpConfig` — `special_phone_number`·`special_phone_code`·`max_auth_sms_count`·`max_auth_sms_count_time` |
