# 레거시 parity 계획서 점검 및 갭 분석 계획서

- 작성일: 2026-11-28
- 점검 대상: `SPEC-LEGACY-PARITY-000`(관리자 레거시 parity 시리즈 공통 규약, v0.1.0, draft)과
  그 근거 자료 `.moai/reports/legacy-admin-map/`, 그리고 `INDEX.md` Phase 15
- 비교 대상: 레거시 `/mnt/d/project/rhymix` (HEAD `08dda97d6`, 2.1.41) ↔ rhymix-ts (HEAD `026ed5c`)
- 방법: 정적 대조만 했다(레거시 `modules/*/conf/module.xml` 액션 선언, 크롤 요약 `summary.md`·`index.json`,
  rhymix-ts `apps/web/app` 라우트, 키워드 grep). 브라우저 실측은 하지 않았다.

---

## 1. 결론

관리자 화면에 한정한 **비교 방법론은 탄탄하다**. 같은 값으로 재설치한 두 사이트를 기준선으로 삼고,
요구사항마다 크롤 근거를 인용하게 하고, 화면마다 세 가지 판정(대응 있음 / 격차 / 의도적 제외)을 강제하고,
뉴버전 고유 개선을 보호하는 규칙(REQ-LGP-001~008)은 그대로 유지할 가치가 있다.

그러나 **완결도는 낮다 — 판정: 보완 후 재사용**. 근거 지도가 낡았고(레거시 2.1.41 반영 전),
지도가 선언된 관리자 화면의 약 23%를 빠뜨렸으며, 한 그룹의 귀속이 실제 기능과 어긋나 있고,
방문자 화면과 비-UI 영역은 어느 계획에도 들어가 있지 않다. 아래 7건이 근거다.

---

## 2. 점검 결과 (발견 7건)

| # | 발견 | 심각도 | 근거(이번에 실행한 명령과 관찰값) |
|---|---|---|---|
| F1 | 근거 지도가 낡았다 — 규약 스스로 재크롤을 요구하는 상태 | 높음 | `index.json` `crawledAt: 2026-08-15`. 레거시는 2026-11-22 에 253커밋 갱신(`4e8c55108`→`08dda97d6`). 그 사이 관리자 액션 변경: autoinstall 전면 재작성(`dispAutoinstallAdminInstall/Uninstall/InstalledPackages/Config` 삭제, `dispAutoinstallAdminPackageDetail` 신설), member `dispMemberAdminAuthLog`·`procMemberAdminClearAuthLog`·`procMemberAdminClearModifyNickNameLog` 신설, page·module·board·document·file 액션 선언 변경. REQ-LGP-007 조건 충족 |
| F2 | 지도가 관리자 화면 31개를 빠뜨렸다 | 높음 | 레거시가 선언한 `disp*Admin*` 액션 133개 중 크롤된 것 102개(누락 31). 누락은 주로 파라미터가 있어야 열리는 하위 화면: `dispBoardAdminInsertBoard`, `dispMemberAdminInsert`, `dispMemberAdminInsertJoinForm`, `dispModuleAdminModuleGrantSetup`, `dispLayoutAdminEdit`, `dispPageAdminMobileContent`, `dispPollAdminResult`, `dispDocumentAdminTrashList`, `dispAdminConfigFtp`, `dispAdminInsertDomain` 등. REQ-LGP-003("모든 화면 판정")은 지도 밖 화면을 셀 수 없으므로 지금 근거로는 충족 불가 |
| F3 | '즐겨찾기' 그룹이 실제로는 설정·메일·알림 화면 24개다 | 높음 | 즐겨찾기 그룹 24개 act 전부가 다른 그룹과 겹치지 않는 실기능 화면: `dispAdminConfigSecurity/Sitelock/SEO/Queue/Debug/Notification/Advanced`, `dispAdvanced_mailerAdmin*`(메일·SMS·푸시 로그, SPF/DKIM, 발송 테스트 등 9개), `dispNcenterliteAdmin*`(8개). 그런데 규약 §2.3 은 004 즐겨찾기를 "ADMIN-MENU-PARITY-001 재검증만"으로 두었고, 005 설정 그룹에는 고유 act 4개(`dispAdminConfigGeneral`, `dispAdminSetup`, `dispModuleAdminFileBox`, `dispAdminCopyDomain`)뿐이다. 순회 경로 상속으로 귀속이 틀어진 것(plan.md §3 리스크 1번이 예견한 경우)이고, 이대로면 시스템 설정의 대부분이 "재검증"으로 처리돼 판정 없이 지나간다 |
| F4 | 화면 수가 부풀려져 있다 | 중간 | 크롤 164건 중 고유 act 105개. 회원 17행→12, 콘텐츠 67행→34, 고급 44행→25. 같은 act 가 목록 파라미터만 달리해 여러 번 기록됐다. 화면 수로 진척률을 잡으면 왜곡된다 |
| F5 | 방문자 화면 parity 계획이 없다 | 높음 | 규약은 방문자 화면을 "`SPEC-FRONT-PARITY-001` 후속으로 별도 처리"로 미뤘지만 후속 SPEC 은 없고 FRONT-PARITY-001 은 인덱스 모듈·중복 마크업만 다뤘다(completed). 레거시 비관리자 `disp*` 액션 81개 ↔ rhymix-ts 방문자 라우트 22개. 회원 셀프서비스(정보 수정·비밀번호·이메일 변경·탈퇴·스크랩·임시저장 외 저장글·내 글/댓글·접속 기기·인증 로그): `apps/web/app` 비관리자 tsx 에서 `scrap`·`탈퇴/leave/withdraw`·`비밀번호 변경/changePassword/updateProfile`·`activeLogin/sessions` grep 0건. 친구(`dispCommunicationFriend` 등 3개)·문서 인쇄(`dispDocumentPrint`)·상담 게시판(`Board.consultation` 값만 있음, 보안 보고서 §2)도 0건 |
| F6 | 시리즈 진척 기록이 실제와 어긋난다 | 중간 | `INDEX.md` 는 001 을 "📝 draft"로 표기하지만 `SPEC-LEGACY-PARITY-001/spec.md` 는 `status: completed`. 000 자신은 아직 draft. 003 이 흡수할 `SPEC-CONTENT-PARITY-001` 은 in-progress 그대로이고, REQ-LGP-006(흡수된 선행 SPEC 을 superseded 처리)은 001 완료 뒤에도 이행 기록이 없다 |
| F7 | 비-UI 갭이 판정 대상에서 빠져 있다 | 중간 | 2026-06-27 보고서와 INDEX 의 레거시 모듈 triage 에 있던 항목 중 결론 없이 남은 것: DB 지원(레거시 MySQL/MariaDB/PostgreSQL ↔ PostgreSQL 전용), 데이터 이전(`importer` 는 NEEDS-RESEARCH 로 미해결), 모바일 전용 레이아웃·스킨(`m.layouts`, `dispPageAdminMobileContent`), 다국어 범위, 쉬운 설치(`autoinstall`), 우편번호(`krzip`). 일부는 의도적 제외가 맞을 수 있으나 그 판정과 사유가 어디에도 기록돼 있지 않다 |

참고 — 잘 된 점(유지): 기준선 동일 조건 재설치(§2.1), 근거 인용 의무(REQ-LGP-002), 3판정 강제(REQ-LGP-003),
그룹 순서 불변(REQ-LGP-004), 뉴버전 고유 기능 보호(REQ-LGP-005), 크롤의 무변경 보장(REQ-LGP-008).

---

## 3. 갭 분석 계획

목표: 레거시 2.1.41 기준으로 **관리자·방문자·비-UI 세 범위의 모든 항목**에 판정(대응 있음 / 격차 / 의도적 제외)을 붙인
단일 대조표를 만들고, 격차를 영역 SPEC 으로 넘긴다. 계획 자체는 제품 코드를 바꾸지 않는다.

### 단계 0 — 근거 재정비 (우선순위 높음)

| 작업 | 산출물 | 완료 기준 |
|---|---|---|
| 0-1. 레거시 2.1.41 로 재설치 후 관리자 재크롤 | `legacy-admin-map/` 갱신, `crawledAt` 2026-11-22 이후 | REQ-LGP-007 해소. `crawledAt` 이 레거시 HEAD 커밋 시각보다 뒤 |
| 0-2. 선언 액션 대비 커버리지 검사 추가 | `coverage.md` — `module.xml` 의 `disp*Admin*` 전체 vs 크롤 act | 누락 0, 또는 누락마다 "파라미터 화면 — 대표 레코드로 방문" / "도달 불가 — 사유" 기록 |
| 0-3. 파라미터 하위 화면 순회 | 시드 레코드(게시판·회원·레이아웃·페이지·설문 각 1건)를 넣고 하위 화면 방문 | F2 의 31개 화면 각각 근거 파일 존재 |
| 0-4. act 단위 중복 제거 | `summary.md` 를 고유 act 기준으로 재집계 | 표의 행 수 = 고유 act 수 |
| 0-5. 방문자 화면 지도 | `legacy-front-map/` — 비관리자 `disp*` 81개의 화면 근거(읽기 전용, 회원·비회원 두 계정) | 81개 각각 근거 또는 도달 불가 사유 |

### 단계 1 — 규약 개정 (우선순위 높음)

`SPEC-LEGACY-PARITY-000` v0.2.0 으로 개정한다(manager-spec 담당).

- §2.3 영역 재편: '즐겨찾기' 그룹의 24개 화면을 기능 귀속으로 재배치 — 시스템 설정 7개는 005 설정으로,
  메일·SMS·푸시(advanced_mailer 9개)와 알림센터(ncenterlite 8개)는 별도 판정 대상으로. 004 는
  "즐겨찾기 UI 자체" 재검증으로 축소. 근거는 GNB 위치가 아니라 `module.xml` 의 소속 모듈로 잡는다.
- 범위 확장: 방문자 영역 시리즈(007 회원 셀프서비스, 008 게시판·문서·댓글 방문자 기능, 009 커뮤니케이션·알림)와
  비-UI 판정표(010) 를 추가하거나, 별도 우산 SPEC 으로 분리한다. 어느 쪽이든 Out of Scope 의 "후속으로 별도 처리"는
  실제 SPEC ID 를 가리키게 한다.
- REQ-LGP-003 보강: 판정 대상 목록의 SSOT 를 "크롤된 화면"에서 "`module.xml` 선언 액션(재크롤로 근거 확보)"으로 바꾼다.
- 진척 기록 정정: `INDEX.md` 001 → completed, 000 상태 갱신, REQ-LGP-006 이행(흡수된 선행 SPEC 처리) 기록.

### 단계 2 — 영역별 판정표 작성 (우선순위 높음 → 중간)

영역마다 `research.md` 에 판정표를 만든다. 열: 레거시 act / 소속 모듈 / rhymix-ts 대응 라우트·액션 / 판정 / 근거 파일 / 비고.

| 순서 | 영역 | 판정 대상(고유 act 기준, 단계 0 후 재확정) | 선행 처리 |
|---|---|---|---|
| 1 | 002 회원 | 관리자 12 + 누락 3(`Insert`, `InsertJoinForm`, `AuthLog`) | MEMBER-PARITY-001 재검증 |
| 2 | 003 콘텐츠 | 관리자 34 + 누락(게시판·문서·댓글·파일·설문·휴지통) | CONTENT-PARITY-001 잔여 AC 전량 이관 후 흡수 |
| 3 | 005 설정 | 4 + 즐겨찾기에서 옮긴 시스템 설정 7 + `dispAdminConfigFtp`·`InsertDomain` | 신규 |
| 4 | 메일·알림(신설) | advanced_mailer 9 + ncenterlite 8 | 신규 |
| 5 | 006 고급 | 25 + 누락(레이아웃·페이지·모듈·애드온·위젯·쉬운 설치) | 신규 |
| 6 | 004 즐겨찾기 UI | 즐겨찾기 추가·정렬·삭제 동작 | ADMIN-MENU-PARITY-001 재검증 |

### 단계 3 — 방문자 영역 판정 (우선순위 중간)

이번 grep 에서 대응 구현이 0건이었던 기능부터 판정한다: 회원 정보 수정·비밀번호·이메일 변경·탈퇴,
스크랩·저장글·내 글/댓글, 접속 기기·인증 로그, 친구, 문서 인쇄, 상담 게시판, 게시판 추천 로그·카테고리 목록·공지 목록.
판정은 반드시 브라우저로 확인한다(키워드 grep 0건은 "다른 이름으로 구현됐을 가능성"을 배제하지 못한다 —
`feedback-placeholder-comments-may-be-wrong` 교훈).

### 단계 4 — 비-UI 판정 (우선순위 중간 → 낮음)

DB 지원 범위, 데이터 이전(importer), 모바일 레이아웃, 다국어, 쉬운 설치, 우편번호 각각에 판정과 사유를 붙인다.
"의도적 제외"는 사용자 결정 사항이므로 판정표 초안 뒤 사용자 확인을 받는다.
레거시 2.1.41 보안 대조(`legacy-2.1.41-security-audit-2026-11-22.md` §2 잔여)는 이미 진행 중이므로 여기서 중복하지 않고 참조만 한다.

### 세션 분담 (3세션 협업 구성 기준)

- `moai3`(탐색): 단계 0 크롤·커버리지 집계, 단계 3 grep·라우트 대조 초안 — 결과는 `.moai/state/collab/<작업명>.md`
- `moai2`(구현): 크롤 스크립트 보강(0-2, 0-3, 0-5)
- `moai`(총괄): 단계 1 규약 개정 위임, 판정 확정, 의도적 제외에 대한 사용자 확인, 커밋

---

## 4. 이번 점검에서 확인하지 않은 것

- 방문자 기능의 부재는 키워드 grep 으로만 확인했다. 다른 이름의 구현이 있을 수 있다(단계 3 에서 브라우저로 확정).
- 레거시 2.1.41 변경은 `module.xml` 액션 선언 차이만 봤다. 템플릿·스크립트 변경이 화면에 주는 영향은 재크롤로 확인한다.
- rhymix-ts 관리자 라우트 80개(`apps/web/app` 아래 admin 경로의 `page.tsx` 수)와 레거시 act 의 1:1 대응은 만들지 않았다(단계 2 산출물).
- 크롤 누락 31개가 정말 파라미터 때문인지, 일부는 레거시에서 메뉴로 노출되지 않는 화면인지는 0-3 에서 판가름한다.

---

## 5. 0단계 실행 결과 (2026-11-28)

레거시 컨테이너(`rhymix-app`, 소스 `/mnt/d/project/rhymix` 를 그대로 마운트, `RX_VERSION 2.1.41`)를 직접 띄워 확인했다.
로그: `.moai/state/verify/legacy-recrawl/` (커밋 대상 아님).

| 작업 | 결과 | 근거 |
|---|---|---|
| 0-1 관리자 재크롤 | 완료. 162개 페이지, 오류 0, 변경성 링크 179건은 기록만 | `index.json` `crawledAt: 2026-11-28T05:11:24Z`. 첫 시도는 크롤 도중(03:26:52) 두 컨테이너가 외부에서 재시작돼 41건 연결 끊김 → 폐기 후 재실행 |
| 0-1 2.1.33→2.1.41 차이 | 크롤된 고유 act 105→104. 사라짐: `dispAutoinstallAdminConfig`, `dispAutoinstallAdminInstalledPackages`(쉬운 설치 재작성). 새로 생김: `dispMemberAdminAuthLog`(회원 그룹) | 옛 `summary.md`(HEAD) 와 새 `summary.md` 의 act 집합 비교 |
| 0-2 선언 대비 커버리지 | `module.xml` 선언 `disp*Admin*` 133개 **전부 근거 확보**(크롤 103 + 보충 30) | `legacy-admin-map/coverage.md` |
| 0-3 파라미터 하위 화면 | 30개를 기준선 DB 레코드 번호로 직접 방문. 정상 렌더 22, 오류 화면 8(아래) | `coverage.md` "보충 방문 결과" |
| 0-4 중복 제거 | 판정 단위를 고유 act 로 고정: 사이트 제작/편집 2 · 회원 13 · 콘텐츠 34 · 즐겨찾기 24 · 설정 4 · 고급 23 · 공통 3 · 보충 30 = 133 | `coverage.md` "그룹별 고유 act" |
| 0-5 방문자 화면 지도 | 비관리자 `disp*` 81개 중 76개를 비회원·관리자로 각각 방문(152개 파일). 제외: install 모듈 4개, `dispMemberLogout` | `legacy-front-map/summary.md`, `pages/*.json` |

### 보충·방문자 방문에서 오류가 난 화면 (판정 때 참고)

| 화면 | 관찰 | 해석 |
|---|---|---|
| `dispAdminConfigFtp` | "사용할 수 없는 기능입니다" | 2.1.41 에서 FTP 기능 폐기 — 의도적 제외 후보 |
| `dispModuleAdminModuleGrantSetup` | TypeError `count()` on stdClass (`module.admin.view.php:233`) | 레거시 결함(PHP 8.2). 일괄 권한 설정 화면 |
| `dispLayoutAdminLayoutModify` | Template not found `about_faceoff.html` | 레거시 결함(폐기된 faceoff 템플릿 참조) |
| `dispTrashAdminView`, `dispPollAdminResult`, `dispFileAdminEdit` | 대상 없음 / 서버 오류 | 기준선에 휴지통·설문·파일 레코드 0건 — 화면 존재만 확인, 내용은 미확인 |
| `dispCommunicationNewMessage`, `dispModuleSelectList` | TypeError | 파라미터 없이 열 때의 레거시 결함 |
| `dispCommunicationAddFriend`, `dispCommunicationSendMessage`, `dispNcenterliteInsertUnsubscribe` | "잘못된 요청" | 대상 회원·알림 번호가 필요한 팝업 — 화면 존재만 확인 |
| `dispTempSavedList` | `ERR_ACT_NOT_FOUND` | 게시판 mid 문맥에서는 열리지 않음 — 문서 모듈 문맥 재확인 필요 |
| `dispKrzipSearchForm` | Template not found `searchForm.daumapi.html` | 우편번호 API 키 미설정 상태의 레거시 동작 |

### 레거시 DB 변경과 복원

방문자 화면 중 글·댓글이 있어야 열리는 화면을 보려고 표본 글 1건(114)·댓글 1건(116)을 board 게시판에 넣었고,
수집 직후 크롤 전 덤프(`rhymix-baseline-2026-11-28.sql`)로 복원했다. 복원 후 확인: 문서 2건(67·68, 조회수 0), 댓글 0건, 회원 1명.
관리자 재크롤·보충 방문은 조회 화면만 열었다(방문 전 소스에서 각 화면 함수의 DB 쓰기 여부를 확인).

### 발견 사항 갱신

- **F1 해소** — 지도가 2.1.41 기준으로 바뀌었다.
- **F2 해소** — 선언된 관리자 화면 133개 모두 근거 파일이 있다. 단 레코드 0건 화면 3개는 내용 미확인.
- **F3 유지** — 재크롤해도 '즐겨찾기' 그룹은 같은 24개 act(시스템 설정 7 · 메일 9 · 알림센터 8). GNB 즐겨찾기 메뉴에서 출발한 순회가 이 화면들을 차지하는 구조는 그대로이므로, 1단계 규약 개정에서 모듈 소속 기준 재배치가 필요하다.
- **F4 해소** — `coverage.md` 의 고유 act 집계를 판정 단위로 쓴다.
- **F5 일부 해소** — 방문자 화면 근거가 생겼다. 비회원으로는 76개 중 72개가 로그인 요구 화면이라, 회원 기능의 실제 모습은 관리자 신분 파일로 본다. 일반 회원 계정으로 본 화면은 없다(기준선에 회원 1명).

### 도구 변경 (커밋 전)

- `apps/web/e2e/legacy-crawl/crawl-admin.ts` — 함수 내보내기 + 직접 실행할 때만 크롤. 실행 안내를 `node`(Node 22 타입 제거)로 수정 — 저장소에 `tsx` 가 없다.
- `apps/web/e2e/legacy-crawl/crawl-supplement.ts` (신규) — 선언 대비 커버리지 + 파라미터 화면 보충 방문 → `coverage.md`
- `apps/web/e2e/legacy-crawl/crawl-front.ts` (신규) — 방문자 화면 지도 → `legacy-front-map/`
