# 레거시 parity 판정표 모음 (갭 분석 2~4단계)

- 기준: 레거시 Rhymix 2.1.41, 지도 `../legacy-admin-map/coverage.md`(관리자 133개)·`../legacy-front-map/`(방문자 76개)
- 규약: `SPEC-LEGACY-PARITY-000` v0.2.0 — 영역 001~010, 판정 단위는 고유 act, 판정은 대응 있음 / 격차 / 의도적 제외
- 작성: 002·007·008·010 은 moai3, 003·005·006·009 는 moai2, 004 는 moai. 각 초안은 moai 가 핵심 주장 4건 이상을 직접 재실행해 확인한 뒤 채택했다(2026-11-28).
- 001(사이트 제작/편집)은 `SPEC-LEGACY-PARITY-001`(completed)이 이미 판정·구현했으므로 여기 없다.

## 집계

| 영역 | 파일 | 행 | 대응 있음 | 격차 | 의도적 제외 후보 |
|---|---|---:|---:|---:|---:|
| 002 회원 | `lgp-002-member.md` | 16 | 9 | 6 | 1 |
| 003 콘텐츠 | `lgp-003-content.md` | 45 | 23 | 18 | 4 |
| 004 즐겨찾기 UI | `lgp-004-favorites.md` | 3 | 2 | 0 | 0 (+ rhymix-ts 고유 개선 1) |
| 005 설정 | `lgp-005-settings.md` | 17 | 7 | 8 | 2 |
| 006 고급 (관리자 36 + 방문자 잔여 15) | `lgp-006-advanced.md` | 51 | 22 | 23 | 6 |
| 007 메일·알림 (관리자 17 + 방문자 4) | `lgp-007-mail-notify.md` | 21 | 5 | 8 | 8 |
| 008 방문자 회원 셀프서비스 | `lgp-008-member-self.md` | 20 | 4 | 16 | 0 |
| 009 방문자 게시판·문서·댓글·커뮤니케이션 | `lgp-009-board-visitor.md` | 38 | 25 | 5 | 8 |
| **합계** | | **210** | **97** | **84** | **29** |
| 010 비-UI | `lgp-010-non-ui-facts.md` | 8항목 | 사실 조사만 — 판정은 사용자 결정 | | |

판정 누락 점검: 관리자 선언 133개 중 131개가 002~007 에 있고, 나머지 2개(`dispMenuAdminSiteMap`, `dispMenuAdminSiteDesign`)는 001 소관. 방문자 76개 전부 006~009 에 있다. 중복 0.

## 사용자 결정이 필요한 것 — 의도적 제외 후보 29건

### A. 레거시에서도 폐기·차단·결함 상태인 화면 (11건) — 제외 권고

| 영역 | act | 레거시 상태 |
|---|---|---|
| 005 | `dispAdminConfigFtp` | 2.1.41 에서 폐기("사용할 수 없는 기능") |
| 005 | `dispAdminRewriteTest` | 관리자 화면이 아니라 JSON 진단 응답. Next.js 는 웹서버 rewrite 에 의존하지 않음 |
| 003 | `dispTrashAdminView` | 서버 오류(`trash.admin.view.php:106`) |
| 006 | `dispLayoutAdminEdit` | 레거시가 "레이아웃 편집 기능은 더이상 제공하지 않습니다" 로 폐기 |
| 006 | `dispLayoutAdminLayoutModify` | 템플릿 없음(`about_faceoff.html`) |
| 006 | `dispKrzipSearchForm` | 템플릿 없음(`searchForm.daumapi.html`) |
| 006 | `dispModuleSelectList` | TypeError(`escape_js`) |
| 009 | `dispBoardDeleteTrackback` | 템플릿 없음, 엮인글 기능 자체가 rhymix-ts 에 없음 |
| 009 | `dispBoardVoteLog` | 기준선에서 "사용할 수 없는 기능". 다만 rhymix-ts 권한 키 `vote_log_view` 는 존재 — 제외하면 이 키도 정리 대상 |
| 009 | `dispDocumentPreview` | "보안정책상 허용되지 않습니다" 로 차단 |
| 007 | `dispNcenterliteUnsubscribeList` | 레거시도 "개별 수신 거부 기능을 제공하지 않습니다" |

### B. 이미 결정된 대체 — 에디터 계열 (8건) — 확인만

`dispEditorAdminIndex`, `dispEditorAdminSetupComponent`, `dispPageAdminPageAdditionSetup`(003), `dispEditorComponentInfo`, `dispEditorFrame`, `dispEditorPopup`, `dispEditorSkinColorset`, `dispEditorConfigPreview`(009).
근거: SPEC-MODULE-BACKLOG-001 triage 의 editor 모듈 DROP(Tiptap 대체), `SPEC-CONTENT-PARITY-001/spec.md:71-73`.

### C. 설계 결정이 필요한 것 (10건)

| 주제 | act | 결정할 것 |
|---|---|---|
| 레이아웃·컬러셋·모바일 스킨 체계 | `dispMemberAdminDesignConfig`(002), `dispNcenterliteAdminSkinsetting`(007) | 모듈별 레이아웃·컬러셋·모바일 스킨을 들이지 않고 한 벌의 반응형으로 갈 것인가 |
| SMS·푸시 발송 | `dispAdvanced_mailerAdminSMSLog/SMSTest/PushLog/PushTest`(007) | 메일 외 발송 채널을 범위에서 뺄 것인가 |
| 수신 거부 등록 | `dispNcenterliteInsertUnsubscribe`(007) | 메일 본문 수신 거부 링크를 둘 것인가 |
| 알림 더미 생성 | `dispNcenterliteAdminTest`(007) | 개발용 도구로 보고 뺄 것인가 |
| 쉬운 설치 | `dispAutoinstallAdminIndex`, `dispAutoinstallAdminPackageDetail`(006) | 외부 패키지 설치 기능을 뺄 것인가(코드 배포 방식) |

### D. 비-UI (010 사실 조사 기준)

| 항목 | 사실 | 결정할 것 |
|---|---|---|
| DB | 레거시 2.1.41 도 MySQL 단일(`common/framework/DB.php:122`), rhymix-ts 는 PostgreSQL 단일 | (6월 보고서의 "레거시는 MySQL/MariaDB/PostgreSQL 지원"은 틀린 기록) — 판정 불필요, 사실 정정만 |
| 데이터 이전 | 레거시 XML 6종 ↔ rhymix-ts 자체 JSON 번들, 레거시 데이터를 들여오는 경로 없음 | 레거시 → rhymix-ts 이전 도구를 만들 것인가 |
| 모바일 | 레거시 모듈별 `m.skins` 6개 ↔ rhymix-ts 반응형 한 벌 | C 의 레이아웃 체계 결정과 묶임 |
| 다국어 | 레거시 12개 언어 문구 파일 ↔ rhymix-ts 는 설치 마법사 언어 목록만, `next-intl` 은 의존성만 있고 import 0건 | 화면 문구 다국어를 범위에 넣을 것인가 |
| 쉬운 설치·우편번호 | rhymix-ts 0건 | C·A 와 같은 결정 |
| 설치 마법사 | 4화면 ↔ 4단계+완료 | 판정 불필요(대응) |
| 짧은 주소 | 레거시 rewrite 수준 1/2 ↔ Next.js 동적 라우트 | 레거시 URL 형태 호환이 필요한가(옛 링크 유지) |
