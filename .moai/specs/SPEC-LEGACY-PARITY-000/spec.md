---
id: SPEC-LEGACY-PARITY-000
title: "레거시 parity 시리즈 — 공통 규약(기준선·근거·불변식·승계)"
version: "0.2.0"
status: draft
created: 2026-08-13
updated: 2026-11-28
author: MoAI
priority: P1
phase: "Phase 15 — 레거시 parity 시리즈"
module: ".moai/specs/SPEC-LEGACY-PARITY-*, .moai/reports/legacy-admin-map, .moai/reports/legacy-front-map, apps/web/e2e/legacy-crawl, apps/web/e2e/reset-baseline"
lifecycle: spec-anchored
tier: M
tags: "umbrella, legacy-parity, admin, visitor, non-ui, baseline, evidence, supersession"
depends_on: [SPEC-ADMIN-MENU-PARITY-001, SPEC-INSTALL-001]
related_specs: [SPEC-CONTENT-PARITY-001, SPEC-MEMBER-PARITY-001, SPEC-FRONT-PARITY-001, SPEC-MENU-001, SPEC-ADMIN-EXTRAS-001]
---

# SPEC-LEGACY-PARITY-000 — 레거시 parity 시리즈 공통 규약

> 레거시 Rhymix(PHP) 2.1.41 과 rhymix-ts 를 관리자·방문자·비-UI 세 범위에 걸쳐 10개 영역으로
> 나누고, 영역마다 레거시의 모든 선언 액션에 판정을 붙이는 시리즈의 **공통 규약**을 정한다.
> 이 SPEC 자체는 제품 코드를 바꾸지 않는다. 영역 SPEC 001~010 이 함께 쓰는 기준선, 근거 규칙,
> 깨뜨리면 안 되는 불변식, 선행 SPEC 승계 규칙만 정한다. PHP 1:1 포팅이 아니다.

## HISTORY

- 2026-11-28 (v0.2.0): 점검 보고서(`.moai/reports/legacy-parity-gap-plan-2026-11-28.md`)의
  발견 F1~F7 을 반영해 개정했다.
  - **재크롤**: 레거시를 2.1.41(`RX_VERSION`)로 올린 뒤 관리자 지도를 다시 수집했다(`crawledAt`
    2026-11-28T05:11:24Z, 162페이지, 오류 0). 2.1.33 대비 쉬운 설치 화면 2개가 사라지고
    `dispMemberAdminAuthLog` 가 생겼다(F1 해소).
  - **근거 확장**: 선언 액션 대비 커버리지 표 `coverage.md`(관리자 `disp*Admin*` 133개 전부 근거
    확보, 판정 단위는 고유 act)와 방문자 화면 지도 `legacy-front-map/`(비관리자 `disp*` 81개 중 76개
    방문)을 근거 자료에 추가했다(F2·F4 해소, F5 일부 해소).
  - **영역 재편**: 영역 경계를 GNB 위치가 아니라 액션의 소속 모듈(`module.xml`)로 다시 그었다.
    '즐겨찾기' 그룹으로 수집된 24개 act 는 시스템 설정 7 · advanced_mailer 9 · ncenterlite 8 이었고
    (F3), 이를 005 설정과 신설 007 메일·알림으로 옮겼다. 004 는 즐겨찾기 UI 동작만 다룬다.
  - **범위 확장**: 방문자 영역(008 회원 셀프서비스, 009 게시판·문서·댓글·커뮤니케이션)과
    비-UI 판정표(010)를 시리즈에 넣었다(F5·F7). 영역 SPEC 은 6개에서 10개가 됐다.
  - **요구사항**: REQ-LGP-001·002·003·007·008 을 개정하고 REQ-LGP-009(레거시 DB 시드 시 덤프·복원)를
    추가했다. 요구사항이 9건이 되어 Tier S 상한(8)을 넘으므로 `tier` 를 S 에서 M 으로 올렸다.
  - **기록 정정**: 001 은 `status: completed` 이며 `SPEC-MENU-001` 을 superseded 로 전환했다
    (커밋 `93dc1fb`, REQ-LGP-006 이행). §F 의 퇴역 모드 이름을 현행 용어로 바꿨다.
- 2026-08-13 (v0.1.0): 최초 작성. 양쪽 DB 초기화 + 재설치로 기준선을 새로 잡고
  (레거시 94테이블 / 뉴버전 68테이블, 관리자 계정 양쪽 동일), Playwright로 레거시 관리자
  화면 164개를 읽기 전용 수집했다(`.moai/reports/legacy-admin-map/`). 수집 과정에서
  레거시 GNB가 그룹별 `<li>` + 중첩 `<ul>` 구조임을 확인해(`modules/admin/tpl/_header.html:53-69`)
  화면의 그룹 귀속을 추론 없이 확정했고, 즐겨찾기가 GNB 안의 `<li>`라는 사실도 같은 근거로
  확인했다.

## 1. Why

레거시에서 옮겨오는 운영자와 방문자가 "레거시에서 하던 일을 뉴버전에서 그대로 할 수 있는가"를
영역 단위로 확인할 방법이 없었다. 지금까지의 parity 작업(`SPEC-MEMBER-PARITY-001`,
`SPEC-CONTENT-PARITY-001`, `SPEC-ADMIN-MENU-PARITY-001`, `SPEC-FRONT-PARITY-001`)은 각각
독립적으로 진행되어 다음 문제가 있었다.

1. **근거의 재현성** — 각 SPEC이 그때그때 레거시를 관찰해 근거를 만들었고, 관찰 범위와
   방법이 SPEC마다 달랐다. 같은 질문을 다시 던지면 같은 답이 나온다는 보장이 없었다.
2. **영역 경계의 모호함** — "이 기능은 콘텐츠인가 설정인가"가 SPEC 작성자의 판단이었다.
   그 결과 `SPEC-CONTENT-PARITY-001`과 `SPEC-ADMIN-MENU-PARITY-001` 사이에 위젯 시스템
   귀속 충돌이 실제로 발생해 plan-auditor 감사(D6)에서 잡혔다. v0.1.0 이 경계로 삼은 GNB
   순회 경로도 같은 문제를 낳았다 — 즐겨찾기 메뉴에서 출발한 순회가 시스템 설정·메일·알림
   화면 24개를 차지했다(F3).
3. **개선의 회귀 위험** — 레거시에 없는 뉴버전 고유 기능(즐겨찾기 추가 UI, DnD 순서 변경 등)이
   "레거시에 없으니 빼자"는 압력을 받는다. 실제로 `SPEC-ADMIN-MENU-PARITY-001` §4에서
   4건을 명시적으로 방어해야 했다.
4. **판정 범위의 공백** — 방문자 화면은 "후속으로 별도 처리"로 미뤄졌지만 후속 SPEC 이 없었고,
   DB 지원 범위·데이터 이전 같은 비-UI 항목은 어느 계획에도 판정이 없었다(F5·F7).

이 문제들은 영역별 SPEC 각각이 풀 수 없다 — 시리즈 전체에 걸친 공통 규약이 필요하다.

## 2. What

### 2.1 기준선 (baseline)

시리즈의 모든 비교는 **동일 조건으로 새로 설치한 두 사이트**를 기준으로 한다.

| | 레거시 | 뉴버전 |
|---|---|---|
| 버전 | Rhymix 2.1.41 (`common/constants.php` `RX_VERSION`, 저장소 HEAD `08dda97d6`) | rhymix-ts `main` |
| 주소 | `http://localhost:8080` | `http://localhost:3000` |
| DB | MariaDB 10.11 (`rhymix-db`, 호스트 3307) | PostgreSQL (`rhymix-ts-db`, 호스트 5444) |
| 관리자 | `admin` / `admin@example.com` | `admin` / `admin@example.com` |
| 재설치 절차 | `install-legacy.ts` | `install-new.ts` |

재설치 스크립트가 두 사이트에 **같은 값**을 넣으므로, 화면 차이는 구현 차이이지 설정
차이가 아니다. 이 전제가 깨지면(한쪽만 다른 계정·사이트명으로 설치) 비교 결과 전체가
무효가 된다.

**레거시 DB 복원 지점.** 기준선에 없는 레코드(글·댓글 등)가 있어야 열리는 화면을 보려면 레거시
DB 에 표본을 넣어야 한다. 이때는 시드 **전에** 덤프를 뜨고 수집 **직후** 그 덤프로 복원한다
(REQ-LGP-009). 2026-11-28 방문자 지도 수집이 이 절차를 따랐다 — 크롤 전 덤프
`rhymix-baseline-2026-11-28.sql` 을 뜬 뒤 표본 글 1건(114)·댓글 1건(116)을 board 게시판에 넣었고,
수집 직후 복원했다. 복원 후 확인값: 문서 2건(67·68, 조회수 0), 댓글 0건, 회원 1명
(점검 보고서 §5 "레거시 DB 변경과 복원").

### 2.2 근거 자료 (evidence)

아래 두 디렉터리가 시리즈의 1차 근거다.

**`.moai/reports/legacy-admin-map/` — 관리자 화면**

- `coverage.md` — **판정 대상의 기준표.** 레거시 `modules/*/conf/module.xml` 이 선언한
  `disp*Admin*` 액션 133개 각각에 근거 파일이 있는지와 수집 그룹을 적은 표. 133개 전부 근거가
  있다(크롤 103 + 파라미터 화면 보충 방문 30). 파라미터 화면 30개의 렌더 결과(정상 22, 오류 8)도
  여기에 있다.
- `summary.md` — 그룹별 화면 목록(화면당 링크/이벤트/폼/XHR 수)
- `pages/<act>-<hash>.json` — 화면별 링크·이벤트·폼(`module`/`act` 포함)·XHR 원본
- `events.md` / `events.json` — onclick 핸들러 → 서버 호출(`module.act`) 대응표
- `index.json` — 수집 시각(`crawledAt`)과 그룹별 페이지 수

**`.moai/reports/legacy-front-map/` — 방문자 화면**

- `summary.md` — 비관리자 `disp*` 액션 81개 중 76개를 비회원·관리자 두 신분으로 방문한 결과.
  방문하지 않은 5개(install 모듈 4개, `dispMemberLogout`)와 그 사유를 적는다.
- `pages/<act>-<guest|admin>.json` — 신분별 화면 원본(152개)
- `index.json` — 수집 시각(`crawledAt`)과 표본 레코드 번호

**판정 단위는 고유 act 다.** 같은 act 가 목록 파라미터만 달리해 여러 번 수집되므로(관리자 크롤 162페이지
가 선언 액션 103개에 해당) 페이지 수는 진척의 척도가 아니다. `coverage.md` 의 그룹별 고유 act 집계는
사이트 제작/편집 2 · 회원 13 · 콘텐츠 34 · 즐겨찾기 24 · 설정 4 · 고급 23 · 공통 3 ·
보충(파라미터 화면) 30 = 133 이다. 이 집계는 **수집 그룹** 기준이며, 영역 귀속은 §2.3 의
소속 모듈 기준을 따른다.

**"모든 화면"의 기준은 크롤된 집합이 아니라 선언된 집합이다.** 관리자는 `module.xml` 의
`disp*Admin*` 133개, 방문자는 비관리자 `disp*` 81개가 판정 대상 목록의 SSOT 다(REQ-LGP-003).

### 2.3 시리즈 구성

영역은 액션의 **소속 모듈**(`module.xml` 이 있는 디렉터리)로 나눈다. GNB 의 어느 메뉴에서 그
화면에 도달했는지는 영역 귀속에 쓰지 않는다(F3).

| SPEC ID | 영역 | 소속 모듈 → 판정 대상 (고유 act) | 선행 SPEC 처리 | 상태 |
|---|---|---|---|---|
| SPEC-LEGACY-PARITY-001 | 사이트 제작/편집 | menu → 관리자 2 | `SPEC-MENU-001` Slice D 잔여분 흡수(superseded 전환 완료) | completed |
| SPEC-LEGACY-PARITY-002 | 회원 | member 13 · point 3 → 관리자 16 | `SPEC-MEMBER-PARITY-001`(completed) 재검증 | 미작성 |
| SPEC-LEGACY-PARITY-003 | 콘텐츠 | board 10 · comment 3 · document 6 · editor 2 · file 5 · poll 3 · spamfilter 5 · trash 2 → 관리자 36 | `SPEC-CONTENT-PARITY-001`(in-progress) 흡수 | 미작성 |
| SPEC-LEGACY-PARITY-004 | 즐겨찾기 UI | 즐겨찾기 추가·정렬·삭제 동작(`events.md` 핸들러 기준, 선언 화면 없음) | `SPEC-ADMIN-MENU-PARITY-001`(completed) 재검증 | 미작성 |
| SPEC-LEGACY-PARITY-005 | 설정 | admin 16 — 일반 설정·관리자 화면 설정, 시스템 설정 7(`dispAdminConfigSecurity/Sitelock/SEO/Queue/Debug/Notification/Advanced`), 도메인(`dispAdminCopyDomain`, `dispAdminInsertDomain`) 등 | 없음(신규) | 미작성 |
| SPEC-LEGACY-PARITY-006 | 고급 | layout 8 · page 10 · module 9 · addon 3 · widget 3 · autoinstall 2 · integration_search 2 · communication · counter · extravar · importer · krzip · message · rss · session · tag 각 1 → 관리자 46 | 없음(신규) | 미작성 |
| SPEC-LEGACY-PARITY-007 | 메일·알림 | advanced_mailer 9 · ncenterlite 8 → 관리자 17 | 없음(신설) | 미작성 |
| SPEC-LEGACY-PARITY-008 | 방문자 — 회원 셀프서비스 | member 19(`dispMemberLogout` 포함) · ncenterlite 4 → 방문자 23 | 없음(신설) | 미작성 |
| SPEC-LEGACY-PARITY-009 | 방문자 — 게시판·문서·댓글·커뮤니케이션 | board 21 · communication 7 · document 5 · editor 5 · comment 1 → 방문자 39 | `SPEC-FRONT-PARITY-001`(completed) 후속 | 미작성 |
| SPEC-LEGACY-PARITY-010 | 비-UI 판정표 | DB 지원 범위, 데이터 이전(importer), 모바일 레이아웃, 다국어, 쉬운 설치, 우편번호(krzip) 6개 항목 + 방문자 install 모듈 4 | 없음(신설) | 미작성 |

관리자 합계: 2 + 16 + 36 + 16 + 46 + 17 = 133. 방문자 합계: 23 + 39 + 4(010) + 15 = 81.
나머지 방문자 15개(widget 4 · module 5 · page 2 · layout 1 · message 1 · krzip 1 · menu 1)는 대부분
관리자 권한(`root`/`all-managers`)으로 여는 보조 팝업이므로 같은 모듈의 관리자 화면을 판정하는
006 이 함께 판정한다. `dispMenuMenu` 는 소속 모듈로는 001 이지만 001 이 이미 completed 이므로
006 이 맡는다.

비-UI 항목과 관리자 화면이 겹치는 경우(importer, krzip, autoinstall 의 관리자 화면)는 화면 판정을
006 이, 기능 자체의 지원 여부 판정을 010 이 한다. 006 의 해당 행은 010 의 판정을 인용한다.

### 2.4 이미 충족된 것 — 재구현 대상이 아님

**관리자 메뉴 6그룹 순서는 이미 뉴버전에 반영돼 있다.** `AdminSidebar.tsx` 의 `NAV`
배열이 `사이트 제작/편집 → 회원 → 콘텐츠 → (즐겨찾기 조건부) → 설정 → 고급` 순서이며,
이는 `SPEC-ADMIN-MENU-PARITY-001`(status: completed)의 결과물이다. 시리즈는 이 순서를
**새로 만들지 않고 보존**한다(REQ-LGP-004).

**영역 재편은 사이드바 재편이 아니다.** §2.3 은 *판정 작업*을 소속 모듈 기준으로 나눈 것이다.
예컨대 시스템 설정 7개를 005 가 판정한다고 해서 뉴버전 사이드바에서 그 메뉴를 '설정' 그룹으로
옮기지 않으며, 007 이 생겼다고 사이드바에 '메일·알림' 그룹이 생기지도 않는다.

## 3. 요구사항 (GEARS)

**REQ-LGP-001 (Ubiquitous)**: The parity series SHALL consist of exactly ten area SPECs with IDs
`SPEC-LEGACY-PARITY-001`~`010`, covering the areas and taken up in the numeric order defined in §2.3
(사이트 제작/편집 → 회원 → 콘텐츠 → 즐겨찾기 UI → 설정 → 고급 → 메일·알림 → 방문자 회원 셀프서비스 →
방문자 게시판·문서·댓글·커뮤니케이션 → 비-UI 판정표). 영역을 추가·분할·재정렬하려면 본 SPEC의 개정이
선행되어야 한다.

**REQ-LGP-002 (Ubiquitous)**: Every functional requirement in an area SPEC SHALL cite at least one
concrete evidence item from `.moai/reports/legacy-admin-map/` 또는 `.moai/reports/legacy-front-map/` —
화면 `act` 이름, 폼의 `module`/`act` 값, 또는 `events.md`의 핸들러 이름 중 하나. 화면이 없는 010 의
비-UI 항목은 레거시 소스 경로(`module.xml`, 설정 파일, 클래스 파일)를 근거로 인용한다. 근거를 인용하지
못하는 요구사항은 "레거시가 그렇게 한다"고 주장할 수 없으며, 뉴버전 고유 개선으로 명시 분류해야 한다.

**REQ-LGP-003 (Ubiquitous)**: Each area SPEC SHALL declare one of exactly three verdicts —
**대응 있음**(뉴버전에 동등 기능 존재), **격차**(구현 대상), **의도적 제외**(사유 필수) — for every
legacy action assigned to it in §2.3. 판정 대상 목록은 크롤된 화면이 아니라 레거시 `module.xml` 이
선언한 액션이며, 판정 단위는 고유 act 다. 레거시 자체에서 오류가 나는 화면(예: `dispModuleAdminModuleGrantSetup`
TypeError, `dispLayoutAdminLayoutModify` 템플릿 없음)도 판정 대상이며, 판정표에 레거시 오류 내용을 함께
기록한다. 판정하지 않고 남겨둔 act 가 있으면 그 영역 SPEC은 완료로 표시할 수 없다.

**REQ-LGP-004 (Unwanted)**: The area SPECs SHALL NOT change the six-group order or the group
membership established by `SPEC-ADMIN-MENU-PARITY-001` (`AdminSidebar.tsx` `NAV` 배열). §2.3 의 영역
재편(소속 모듈 기준)은 판정 작업의 분담일 뿐 사이드바 구조를 바꾸지 않는다. 영역 작업은 각 그룹
**안에서** 이루어진다. 그룹 구조 변경이 꼭 필요하면 본 SPEC과 `SPEC-ADMIN-MENU-PARITY-001`을 함께
개정해야 한다.

**REQ-LGP-005 (Unwanted)**: The area SPECs SHALL NOT remove, hide, or regress any rhymix-ts-only
capability solely because the legacy version lacks it. 레거시에 없는 기능을 발견하면 제거
후보가 아니라 **개선점으로 기록**한다(`SPEC-ADMIN-MENU-PARITY-001` §4의 즐겨찾기 4건이 선례).

**REQ-LGP-006 (Event-Driven)**: WHEN an area SPEC reaches `status: completed`, the system SHALL
mark its absorbed predecessor SPEC (§2.3 표) as `superseded` with a pointer to the absorbing SPEC
ID, so that 같은 영역의 진실이 두 문서로 갈라지지 않는다.

**REQ-LGP-007 (State-Driven)**: WHILE the `crawledAt` recorded in `legacy-admin-map/index.json` or
`legacy-front-map/index.json` is earlier than the commit date of the legacy repository HEAD
(`/mnt/d/project/rhymix`), the series SHALL re-run the corresponding crawl before authoring or
auditing any area SPEC that cites that map. 레거시 HEAD 보다 오래된 지도를 근거로 쓴 SPEC은 감사에서
FAIL 처리한다.

**REQ-LGP-008 (Unwanted)**: The crawl tooling (`crawl-admin.ts`, `crawl-supplement.ts`,
`crawl-front.ts`) SHALL NOT mutate legacy state. 크롤러는 클릭하지 않고 DOM 속성만 읽으며, `proc*`
act 는 기록만 하고 방문하지 않는다. 이름에 변경성 낱말(Insert/Delete/Update 등)이 든 `disp*` act 는
화면 표시 전용이므로, 레거시 소스에서 그 화면 함수가 DB 에 쓰지 않음을 확인한 경우에만 방문하고 그
목록을 근거 자료에 남긴다. 이 성질이 깨지면 기준선 재현성이 무너진다.

**REQ-LGP-009 (State-Driven)**: WHILE evidence collection requires legacy records absent from the
baseline, the series SHALL seed the legacy DB only after taking a full dump, SHALL restore that dump
immediately after collection, and SHALL record the dump file name, the seeded records, and the
post-restore check values in the area SPEC that relied on the seeded evidence. 복원을 확인하지 못한
상태로 남은 레거시는 기준선이 아니며, 그 위에서 수집한 근거는 쓸 수 없다.

## 4. Out of Scope

### Out of Scope — 제품 코드 변경

- 본 SPEC은 제품 코드를 변경하지 않는다(`SPEC-TEST-DEBT-001`의 REQ-TDEBT-004와 같은 성격).
  실제 구현은 전부 영역 SPEC 001~010에서 이루어진다.

### Out of Scope — 방문자 화면의 처리 위치

- 방문자 화면 parity 는 이 시리즈 안에서 다룬다. 회원 셀프서비스(정보 수정·비밀번호·탈퇴·스크랩·
  접속 기기·알림 설정 등)는 `SPEC-LEGACY-PARITY-008`, 게시판·문서·댓글·커뮤니케이션(쪽지·친구)·
  에디터 방문자 화면은 `SPEC-LEGACY-PARITY-009` 가 맡는다. 본 SPEC 은 그 판정을 직접 하지 않는다.
- 일반 회원 신분으로 본 화면은 근거에 없다(기준선 회원 1명). 일반 회원 신분 수집이 필요하면 008·009 가
  REQ-LGP-009 절차로 표본 회원을 넣어 수집한다.

### Out of Scope — 레거시 코드 이식

- 레거시 PHP 코드를 그대로 옮기지 않는다. 근거 자료는 "레거시가 무엇을 제공하는가"의 목록이지
  "어떻게 구현하는가"의 청사진이 아니다.

### Out of Scope — 변경성 액션의 동작 검증

- 크롤은 `proc*` 계열을 방문하지 않으므로(REQ-LGP-008), 그 액션들의 **실제 동작**은
  근거 자료에 없다. 필요한 영역 SPEC이 각자 격리 환경에서 확인한다.

### Out of Scope — 보안 대조

- 레거시 2.1.41 보안 대조(`legacy-2.1.41-security-audit-2026-11-22.md`)는 별도로 진행 중이다.
  영역 SPEC 은 그 결과를 참조만 하고 중복 판정하지 않는다.

## §F 실행 방식

- 입력: tier M, 산출물은 본 SPEC 문서 3개(spec/plan/acceptance)와 `INDEX.md` 갱신, 제품 코드 변경 0
- 결정: 본 개정은 manager-spec 단일 위임(serial)으로 작성한다. 문서 한 묶음이라 fanout·sweep 이 이득이 없다.
- 영역 SPEC 001~010 의 판정표 작성은 영역마다 serial 로 진행하며, 레거시 act 수가 많은 003·006 의
  근거 대조(읽기 전용)에 한해 fanout 을 검토한다.
