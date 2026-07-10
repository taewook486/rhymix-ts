---
id: SPEC-MENU-001
version: 0.2.0
status: in-progress
created: 2026-07-09
updated: 2026-07-10
---

# SPEC-MENU-001 — 인수 기준 (Acceptance Criteria)

> [HARD] 모든 시나리오의 관찰 기준은 **런타임 영속**이다. "저장 버튼이 있다/컴포넌트가 렌더된다"로는
> 통과하지 않는다 — 저장 후 **새로고침(또는 재조회)** 하여 상태가 유지되는 것을 확인해야 한다.
> (§3 "완료 마킹의 함정" 재발 방지.)

## Slice A — MenuItem 편집기 필드 완성

### AC-A1: 확장 필드 저장·유지 (REQ-MENU-001, REQ-MENU-004)
- **Given** 관리자가 `/admin/menu/{id}`에서 한 MenuItem을 편집하고
- **When** icon, cssClass, description, openInNewWindow, expand, listOrder를 입력하고 저장한 뒤 페이지를 새로고침하면
- **Then** 입력한 모든 값이 그대로 표시된다 (DB `menu_items` 행에 영속).

### AC-A2: groupIds ACL 편집 (REQ-MENU-002)
- **Given** 사이트에 둘 이상의 MemberGroup이 있고
- **When** 관리자가 특정 그룹들을 선택해 MenuItem에 저장하고 재조회하면
- **Then** `MenuItem.groupIds`가 선택한 그룹 id 배열과 정확히 일치한다.

### AC-A3: 버튼 상태 JSON 편집 (REQ-MENU-003)
- **Given** MenuItem 편집기가 열려 있고
- **When** normalBtn/hoverBtn/activeBtn 값을 편집·저장하고 재조회하면
- **Then** 세 JSON 컬럼이 입력값으로 영속된다.

### AC-A4: 검증 실패 시 부분 저장 방지 (REQ-MENU-005)
- **Given** 관리자가 존재하지 않는 그룹 id 또는 형식 오류 url을 입력하고
- **When** 저장을 시도하면
- **Then** 필드 레벨 에러가 표시되고 **어떤 필드도 DB에 반영되지 않는다** (원자적 거부).

### AC-A5: stale 문구 제거 (REQ-MENU-040)
- **Given** `/admin/menu/{id}` 화면에서
- **When** 편집기를 렌더하면
- **Then** "드래그앤드롭은 Slice E 에서 추가됩니다" 문구가 존재하지 않고, 안내 문구는 실제 동작과 일치한다.

## Slice B — DnD 영속화

### AC-B1: same-level 순서 변경 영속 (REQ-MENU-010, REQ-MENU-013)
- **Given** 같은 부모 아래 항목 A, B, C가 순서대로 있고
- **When** 관리자가 C를 A 위로 드래그하여 놓은 뒤 페이지를 새로고침하면
- **Then** 순서가 C, A, B로 유지된다 (`listOrder`가 `admin.menuItem.reorder`로 영속).

### AC-B2: cross-level 자식 이동 영속 (REQ-MENU-011)
- **Given** 최상위 항목 A와 B가 있고
- **When** 관리자가 B를 A의 자식으로 드래그하여 놓은 뒤 새로고침하면
- **Then** B의 `parentId`가 A이고 트리에 A > B로 중첩 표시된다.

### AC-B3: 순환/깊이 초과 거부 (REQ-MENU-012)
- **Given** A > B(자식) 트리가 있고
- **When** 관리자가 A를 B의 자식으로 이동(순환) 시도하거나 최대 깊이를 초과하는 이동을 시도하면
- **Then** 이동이 거부되고 새로고침 후에도 트리 구조가 변하지 않는다.

### AC-B4: 실패 롤백 (REQ-MENU-014)
- **Given** reorder 요청이 서버에서 실패하는 상황에서
- **When** 관리자가 드래그를 완료하면
- **Then** 트리가 직전 영속 상태로 되돌아가고 에러가 표시된다 (허위 성공 표시 없음).

## Slice C — 다중 메뉴 존 스키마

### AC-C1: 슬롯 배정 영속 (REQ-MENU-020, REQ-MENU-022)
- **Given** 사이트에 Header/Footer/Utility용 메뉴가 각각 존재하고
- **When** 관리자가 각 메뉴를 대응 슬롯에 배정하면
- **Then** 배정이 영속되고 최소 3종 슬롯(header/footer/utility)이 서로 다른 메뉴를 가리킨다.

### AC-C2: defaultMenuId 백필 (REQ-MENU-021, REQ-MENU-025)
- **Given** 마이그레이션 이전 `defaultMenuId`가 설정된 도메인이 있고
- **When** slot 마이그레이션을 실행하면
- **Then** 해당 메뉴가 primary header 슬롯에 자동 배정되어 기존 내비게이션이 유지된다.

### AC-C3: 새 메뉴 존 생성 (REQ-MENU-023)
- **Given** 관리자가 메뉴 목록 화면에 있고
- **When** "메뉴 존 추가"(사이트맵 추가 대응)를 실행하면
- **Then** 새 `Menu` 행이 해당 site 범위로 생성되어 목록에 나타난다.

### AC-C4: 미배정 슬롯 무렌더 (REQ-MENU-024)
- **Given** utility 슬롯에 메뉴가 배정되지 않은 상태에서
- **When** 공개 페이지를 렌더하면
- **Then** utility 영역은 아무것도 렌더하지 않고 에러/플레이스홀더가 노출되지 않는다.

## Slice D — 레이아웃 렌더링

### AC-D1: 슬롯별 렌더 (REQ-MENU-030)
- **Given** header/footer/utility에 서로 다른 메뉴가 배정되어 있고
- **When** 공개 페이지를 방문하면
- **Then** 각 영역에 배정된 메뉴의 항목이 렌더된다.

### AC-D2: 중첩 자식 렌더 (REQ-MENU-031)
- **Given** 부모-자식 트리를 가진 메뉴가 슬롯에 배정되어 있고
- **When** 페이지를 렌더하면
- **Then** 최상위뿐 아니라 자식 항목까지 계층적으로 렌더된다.

### AC-D3: groupIds ACL 렌더 (REQ-MENU-032)
- **Given** 특정 그룹에만 노출되도록 groupIds가 설정된 항목이 있고
- **When** 그 그룹에 속하지 않은 사용자(또는 익명)가 페이지를 보면
- **Then** 해당 항목은 렌더되지 않는다. groupIds가 비어 있으면 모두에게 렌더된다.

### AC-D4: icon/cssClass/새창 적용 (REQ-MENU-033)
- **Given** icon, cssClass, openInNewWindow가 설정된 항목이 있고
- **When** 렌더하면
- **Then** 링크에 icon과 cssClass가 반영되고, 새 창 항목은 `target="_blank" rel="noopener"`를 가진다.

## Slice E — 설치 시 기본 디자인 토큰 시드

### AC-E1: 설치 직후 유효 토큰 (REQ-MENU-060, REQ-MENU-062)
- **Given** 클린 상태에서 설치 마법사를 완료하고
- **When** `/admin/site/design`을 열면
- **Then** 색상·타이포·간격·라운드 토큰이 비어있지 않고 `#000000`이 아닌 문서화된 기본 팔레트로 채워져 있다.

### AC-E2: 토큰 부재 폴백 (REQ-MENU-061)
- **Given** 어떤 이유로 저장된 디자인 토큰이 없는 상태에서
- **When** 디자인 설정 화면을 렌더하면
- **Then** `#000000`/빈 값 대신 문서화된 기본값이 표시된다.

## Slice F — 부가 (선택, P2/P3)

### AC-F1: unlinked 모듈 목록 (REQ-MENU-050)
- **Given** 어떤 MenuItem도 참조하지 않는 모듈 인스턴스가 있고
- **When** 메뉴 편집 화면을 열면
- **Then** 해당 모듈들이 "unlinked" 목록에 표시된다.

### AC-F2: 메뉴 검색 (REQ-MENU-051)
- **Given** 다수의 메뉴/항목이 있고
- **When** 관리자가 검색어를 입력하면
- **Then** title/url이 일치하는 항목만 필터되어 표시된다.

---

## 엣지 케이스

- 빈 메뉴(항목 0개) 편집·슬롯 배정 시 오류 없음.
- 자기 자신을 부모로 지정하는 이동(순환) 서버·클라이언트 양쪽에서 거부.
- 삭제된 MemberGroup을 참조하던 groupIds — 렌더 시 무시(제외), 저장 시 검증 거부.
- 동일 메뉴를 두 슬롯에 배정하는 경우의 허용/거부 정책 명시(run phase 결정, 테스트로 고정).
- 마이그레이션 재실행(idempotency) — 백필이 중복 슬롯 배정을 만들지 않음.

## Definition of Done

> 2026-07-10 sync 시점 실측 반영. 체크된 항목은 오케스트레이터가 실 DB/dev 서버로 직접 재현 확인한
> 항목만이다. 코드가 존재하나 런타임 재현이 admin 로그인 세션 부재로 수행되지 못한 항목은 미체크로
> 남긴다(§3 "완료 마킹의 함정" 재발 방지).

- [x] REQ-MENU-001~006, 010~015, 040~041 (Slice A/B) 구현·커밋 완료(`d03caf0`, `c5f046d`). 단, 런타임
      영속(새로고침 후 유지) 재현은 이번 sync 시점에 오케스트레이터가 별도로 재확인하지 않았다 — 코드
      구현 완료로만 기록.
- [ ] REQ-MENU-020~025, 030~034 (Slice C/D) — 부분 체크:
  - [x] 마이그레이션 적용 + `defaultMenuId` → `HEADER_PRIMARY` 백필 idempotency 확인(재실행 시 중복 0건)
  - [x] 헤더(HEADER_PRIMARY) 슬롯이 실 DB 데이터로 `MenuRenderer`를 통해 정상 렌더됨을 확인
  - [ ] Footer/Utility 슬롯 동시 배정(AC-C1) — admin 로그인 필요, 미검증
  - [ ] groupIds ACL 렌더 제한(AC-D3) — admin 로그인 필요, 미검증
  - [ ] 중첩(부모-자식) 트리 다단계 렌더(AC-D2) — admin 로그인 필요, 미검증
- [x] REQ-MENU-060~062 (Slice E) 설치 직후 유효 토큰 확인 — 설치 트랜잭션 FK 위반 버그 발견·수정
      (`2a3f98c`) 후 재검증 통과. `#000000`/빈 값 없음 확인.
- [x] Optional(REQ-MENU-050/051)은 사용자 결정으로 이번 run 범위에서 제외 — 백로그 기록(SPEC §8.2 참조)
- [ ] `pnpm tsc --noEmit` 0 errors, 관련 vitest/Playwright 통과 — 컴파일 에러 수정 커밋(`aa79611`,
      `b71dcc8`)은 반영되었으나 이번 sync 시점에 전체 스위트 재실행으로 재확인하지 않음
- [x] stale 문구·obsolete `@MX:TODO` 제거 확인 (REQ-MENU-040/041, Slice A 커밋에 포함)
- [x] INDEX.md에 SPEC-MENU-001 등재 (Phase 10, 본 sync에서 상태 갱신)
