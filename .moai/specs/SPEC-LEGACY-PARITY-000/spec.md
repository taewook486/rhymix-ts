---
id: SPEC-LEGACY-PARITY-000
title: "관리자 레거시 parity 시리즈 — 공통 규약(기준선·근거·불변식·승계)"
version: "0.1.0"
status: draft
created: 2026-08-13
updated: 2026-08-13
author: MoAI
priority: P1
phase: "Phase 15 — 관리자 레거시 parity 시리즈"
module: ".moai/specs/SPEC-LEGACY-PARITY-*, .moai/reports/legacy-admin-map, apps/web/e2e/legacy-crawl, apps/web/e2e/reset-baseline"
lifecycle: spec-anchored
tier: S
tags: "umbrella, legacy-parity, admin, baseline, evidence, supersession"
depends_on: [SPEC-ADMIN-MENU-PARITY-001, SPEC-INSTALL-001]
related_specs: [SPEC-CONTENT-PARITY-001, SPEC-MEMBER-PARITY-001, SPEC-FRONT-PARITY-001, SPEC-MENU-001, SPEC-ADMIN-EXTRAS-001]
---

# SPEC-LEGACY-PARITY-000 — 관리자 레거시 parity 시리즈 공통 규약

> 레거시 Rhymix(PHP) 관리자 화면을 6개 영역(사이트 제작/편집 → 회원 → 콘텐츠 → 즐겨찾기 →
> 설정 → 고급)으로 나누어 순서대로 parity를 맞추는 시리즈의 **공통 규약**을 정한다.
> 이 SPEC 자체는 제품 코드를 변경하지 않는다 — 6개 영역 SPEC이 공유할 기준선, 근거 규칙,
> 깨뜨리면 안 되는 불변식, 선행 SPEC 승계 규칙만 정의한다. PHP 1:1 포팅이 아니다.

## HISTORY

- 2026-08-13 (v0.1.0): 최초 작성. 양쪽 DB 초기화 + 재설치로 기준선을 새로 잡고
  (레거시 94테이블 / 뉴버전 68테이블, 관리자 계정 양쪽 동일), Playwright로 레거시 관리자
  화면 164개를 읽기 전용 수집했다(`.moai/reports/legacy-admin-map/`). 수집 과정에서
  레거시 GNB가 그룹별 `<li>` + 중첩 `<ul>` 구조임을 확인해(`modules/admin/tpl/_header.html:53-69`)
  화면의 그룹 귀속을 추론 없이 확정했고, 즐겨찾기가 GNB 안의 `<li>`라는 사실도 같은 근거로
  확인했다.

## 1. Why

레거시에서 옮겨오는 운영자가 "레거시에서 하던 일을 뉴버전에서 그대로 할 수 있는가"를
영역 단위로 확인할 방법이 없었다. 지금까지의 parity 작업(`SPEC-MEMBER-PARITY-001`,
`SPEC-CONTENT-PARITY-001`, `SPEC-ADMIN-MENU-PARITY-001`, `SPEC-FRONT-PARITY-001`)은 각각
독립적으로 진행되어 다음 세 가지 문제가 있었다.

1. **근거의 재현성** — 각 SPEC이 그때그때 레거시를 관찰해 근거를 만들었고, 관찰 범위와
   방법이 SPEC마다 달랐다. 같은 질문을 다시 던지면 같은 답이 나온다는 보장이 없었다.
2. **영역 경계의 모호함** — "이 기능은 콘텐츠인가 설정인가"가 SPEC 작성자의 판단이었다.
   그 결과 `SPEC-CONTENT-PARITY-001`과 `SPEC-ADMIN-MENU-PARITY-001` 사이에 위젯 시스템
   귀속 충돌이 실제로 발생해 plan-auditor 감사(D6)에서 잡혔다.
3. **개선의 회귀 위험** — 레거시에 없는 뉴버전 고유 기능(즐겨찾기 추가 UI, DnD 순서 변경 등)이
   "레거시에 없으니 빼자"는 압력을 받는다. 실제로 `SPEC-ADMIN-MENU-PARITY-001` §4에서
   4건을 명시적으로 방어해야 했다.

이 세 문제는 영역별 SPEC 각각이 풀 수 없다 — 시리즈 전체에 걸친 공통 규약이 필요하다.

## 2. What

### 2.1 기준선 (baseline)

시리즈의 모든 비교는 **동일 조건으로 새로 설치한 두 사이트**를 기준으로 한다.

| | 레거시 | 뉴버전 |
|---|---|---|
| 주소 | `http://localhost:8080` | `http://localhost:3000` |
| DB | MariaDB 10.11 (`rhymix-db`, 호스트 3307), 94테이블 | PostgreSQL (`rhymix-ts-db`, 호스트 5444), 68테이블 |
| 관리자 | `admin` / `admin@example.com` | `admin` / `admin@example.com` |
| 재설치 절차 | `install-legacy.ts` | `install-new.ts` |

재설치 스크립트가 두 사이트에 **같은 값**을 넣으므로, 화면 차이는 구현 차이이지 설정
차이가 아니다. 이 전제가 깨지면(한쪽만 다른 계정·사이트명으로 설치) 비교 결과 전체가
무효가 된다.

### 2.2 근거 자료 (evidence)

`.moai/reports/legacy-admin-map/` 이 시리즈의 유일한 1차 근거다.

- `summary.md` — 7개 그룹별 화면 목록(화면당 링크/이벤트/폼/XHR 수)
- `pages/<act>-<hash>.json` — 화면별 링크·이벤트·폼(`module`/`act` 포함)·XHR 원본
- `events.md` / `events.json` — onclick 핸들러 → 서버 호출(`module.act`) 대응표
- `index.json` — 그룹별 화면 수

수집 범위: 화면 164개, 이벤트 2,386건(폼 제출 버튼 1,585 + onclick 801),
변경 위험 링크 187건은 기록만 하고 방문하지 않았다(레거시 DB 무손상).

### 2.3 시리즈 구성

| SPEC ID | 영역 | 선행 SPEC 처리 |
|---|---|---|
| SPEC-LEGACY-PARITY-001 | 사이트 제작/편집 | `SPEC-MENU-001` Slice D 잔여분 흡수 |
| SPEC-LEGACY-PARITY-002 | 회원 | `SPEC-MEMBER-PARITY-001`(completed) 재검증만 |
| SPEC-LEGACY-PARITY-003 | 콘텐츠 | `SPEC-CONTENT-PARITY-001`(in-progress) 흡수 |
| SPEC-LEGACY-PARITY-004 | 즐겨찾기 | `SPEC-ADMIN-MENU-PARITY-001`(completed) 재검증만 |
| SPEC-LEGACY-PARITY-005 | 설정 | 없음(신규) |
| SPEC-LEGACY-PARITY-006 | 고급 | 없음(신규) |

### 2.4 이미 충족된 것 — 재구현 대상이 아님

**관리자 메뉴 6그룹 순서는 이미 뉴버전에 반영돼 있다.** `AdminSidebar.tsx:88-142`의 `NAV`
배열이 `사이트 제작/편집 → 회원 → 콘텐츠 → (즐겨찾기 조건부) → 설정 → 고급` 순서이며,
이는 `SPEC-ADMIN-MENU-PARITY-001`(status: completed)의 결과물이다. 시리즈는 이 순서를
**새로 만들지 않고 보존**한다(REQ-LGP-004).

## 3. 요구사항 (GEARS)

**REQ-LGP-001 (Ubiquitous)**: The parity series SHALL consist of exactly six area SPECs with IDs
`SPEC-LEGACY-PARITY-001`~`006`, implemented in the numeric order defined in §2.3
(사이트 제작/편집 → 회원 → 콘텐츠 → 즐겨찾기 → 설정 → 고급). 영역을 추가·분할·재정렬하려면
본 SPEC의 개정이 선행되어야 한다.

**REQ-LGP-002 (Ubiquitous)**: Every functional requirement in an area SPEC SHALL cite at least one
concrete evidence item from `.moai/reports/legacy-admin-map/` — 화면 `act` 이름, 폼의
`module`/`act` 값, 또는 `events.md`의 핸들러 이름 중 하나. 근거를 인용하지 못하는 요구사항은
"레거시가 그렇게 한다"고 주장할 수 없으며, 뉴버전 고유 개선으로 명시 분류해야 한다.

**REQ-LGP-003 (Ubiquitous)**: Each area SPEC SHALL declare, for every legacy screen assigned to its
group in `index.json`, one of exactly three verdicts: **대응 있음**(뉴버전에 동등 화면 존재),
**격차**(구현 대상), **의도적 제외**(사유 필수). 판정하지 않고 남겨둔 화면이 있으면 그 영역
SPEC은 완료로 표시할 수 없다.

**REQ-LGP-004 (Unwanted)**: The area SPECs SHALL NOT change the six-group order or the group
membership established by `SPEC-ADMIN-MENU-PARITY-001` (`AdminSidebar.tsx` `NAV` 배열). 영역
작업은 각 그룹 **안에서** 이루어진다. 그룹 구조 변경이 꼭 필요하면 본 SPEC과
`SPEC-ADMIN-MENU-PARITY-001`을 함께 개정해야 한다.

**REQ-LGP-005 (Unwanted)**: The area SPECs SHALL NOT remove, hide, or regress any rhymix-ts-only
capability solely because the legacy version lacks it. 레거시에 없는 기능을 발견하면 제거
후보가 아니라 **개선점으로 기록**한다(`SPEC-ADMIN-MENU-PARITY-001` §4의 즐겨찾기 4건이 선례).

**REQ-LGP-006 (Event-Driven)**: WHEN an area SPEC reaches `status: completed`, the system SHALL
mark its absorbed predecessor SPEC (§2.3 표) as `superseded` with a pointer to the absorbing SPEC
ID, so that 같은 영역의 진실이 두 문서로 갈라지지 않는다.

**REQ-LGP-007 (State-Driven)**: WHILE the legacy site has been modified since the crawl timestamp
recorded in `index.json` (`crawledAt`), the series SHALL re-run the crawl before authoring or
auditing any area SPEC. 오래된 지도를 근거로 쓴 SPEC은 감사에서 FAIL 처리한다.

**REQ-LGP-008 (Unwanted)**: The crawl tooling SHALL NOT mutate legacy state. `crawl-admin.ts`는
클릭하지 않고 DOM 속성만 읽으며, `proc*`/delete/insert/update/remove/reset/restore/purge/logout
계열 act는 기록만 하고 방문하지 않는다. 이 성질이 깨지면 기준선 재현성이 무너진다.

## 4. Out of Scope

### Out of Scope — 제품 코드 변경

본 SPEC은 제품 코드를 변경하지 않는다(`SPEC-TEST-DEBT-001`의 REQ-TDEBT-004와 같은 성격).
실제 구현은 전부 영역 SPEC 001~006에서 이루어진다.

### Out of Scope — 방문자(프론트) 화면

크롤 범위는 관리자 화면(`module=admin` 및 `disp*Admin*`)에 한정한다. 방문자 화면 parity는
`SPEC-FRONT-PARITY-001`(completed)의 후속으로 별도 처리한다.

### Out of Scope — 레거시 코드 이식

레거시 PHP 코드를 그대로 옮기지 않는다. 근거 자료는 "레거시가 무엇을 제공하는가"의 목록이지
"어떻게 구현하는가"의 청사진이 아니다.

### Out of Scope — 변경성 액션의 동작 검증

크롤은 `proc*` 계열 링크를 방문하지 않으므로(REQ-LGP-008), 그 액션들의 **실제 동작**은
근거 자료에 없다. 필요한 영역 SPEC이 각자 격리 환경에서 확인한다.

## §F Phase 4 Mode Selection

- 입력: tier S, scope 문서 3개(spec/plan/acceptance) + INDEX 등록, 제품 코드 변경 0, 도메인 1
- 모드 평가: trivial(아님 — 시리즈 전체 규약), background(아님), agent-team(RETIRED),
  parallel(아님 — 단일 문서 집합), workflow(아님 — 소규모), sub-agent(불요)
- Decision: 오케스트레이터 직접 작성 (Mode 1에 준함)
- Justification: 제품 코드 변경이 없고 산출물이 문서 3개다. 위임 비용이 작업 비용보다 크다.
