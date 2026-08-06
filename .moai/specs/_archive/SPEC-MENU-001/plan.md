---
id: SPEC-MENU-001
version: 0.1.0
status: draft
created: 2026-07-09
updated: 2026-07-09
---

# SPEC-MENU-001 — 구현 계획 (Plan)

## 기술 접근

두 축으로 나뉜다.

1. **UI 완성 축 (Group A/B/E)** — 스키마·tRPC 변경 없음. 기존
   `MenuItemEditor` / `MenuItemDnDTree`를 백엔드(`admin.menuItem.update`, `admin.menuItem.reorder`)에
   실제로 연결하고 필드를 노출한다. 리스크 낮음, 마이그레이션 없음.
2. **렌더링 아키텍처 축 (Group C/D)** — 신규 slot 스키마 마이그레이션이 필요하다. `defaultMenuId` 단일
   필드를 다중 슬롯으로 확장하고 레이아웃 렌더링 레이어를 슬롯 기반으로 재배선한다. 리스크 중간
   (마이그레이션 + 렌더링 회귀), **반드시 독립 슬라이스로 분리**.
3. **설치 시드 축 (Group G)** — `seed.ts` 트랜잭션에 기본 디자인 토큰(ThemeAssignment) 삽입 1건. 독립적,
   병렬 가능.

## 슬라이스 분할

우선순위 라벨만 사용 (시간 추정 금지).

### Slice A — MenuItem 편집기 필드 완성 + stale 문구 정리 (P0)
- 대상 REQ: REQ-MENU-001~006, REQ-MENU-040, REQ-MENU-041
- 대상 파일: `apps/web/components/admin/MenuItemEditor.tsx`,
  `apps/web/app/admin/menu/[id]/page.tsx`, `apps/web/app/admin/menu/actions.ts`
- 내용: icon/cssClass/description/openInNewWindow/expand/groupIds/버튼상태 입력 컨트롤 추가, groupIds용
  MemberGroup 선택 UI, `update` 액션에 필드 매핑, stale 안내 문구 + `@MX:TODO` 제거.
- 마이그레이션: 없음. 리스크: 낮음.

### Slice B — DnD 영속화 (same-level + cross-level reorder 연결) (P1)
- 대상 REQ: REQ-MENU-010~015
- 대상 파일: `apps/web/components/admin/MenuItemDnDTree.tsx`, 필요 시 서버 액션 래퍼
- 내용: 드롭 완료 시 `admin.menuItem.reorder`(`{ ops: [{id, parentId, listOrder}] }`) 호출, 성공 시
  revalidate, 실패 시 롤백. cycle/depth 검사는 이미 존재 → 서버 거부와 정합성 확인. `toast.info('...연동
  필요')` 제거.
- 마이그레이션: 없음. 리스크: 낮음~중간(옵티미스틱 상태 정합).
- 의존: Slice A와 파일이 겹치지 않으나 같은 페이지에 렌더되므로 A 이후 진행 권장.

### Slice C — 다중 메뉴 존(slot) 스키마 + 관리 UI (P1, 마이그레이션)
- 대상 REQ: REQ-MENU-020~025, REQ-MENU-023(사이트맵 추가)
- 대상 파일: `packages/db/prisma/schema.prisma`(+마이그레이션), `admin` menu 라우터/액션,
  `apps/web/app/admin/menu/*`
- 내용: slot 배정 모델 신설(권장: `MenuSlotAssignment` 테이블) + `defaultMenuId` → HEADER_PRIMARY 백필
  마이그레이션, 슬롯 배정 admin UI, 신규 메뉴 존 생성.
- 마이그레이션: **있음(신규)**. 리스크: 중간. **독립 슬라이스 필수** — 스키마 변경 격리.

### Slice D — 레이아웃 렌더링 슬롯 재배선 + 트리/ACL 렌더 (P1)
- 대상 REQ: REQ-MENU-030~034
- 대상 파일: `apps/web/components/layout/GlobalHeader.tsx`, 신규 Footer/Utility 렌더 컴포넌트,
  `apps/web/lib/modules/registry.ts` 연계 확인
- 내용: 슬롯별 메뉴 조회·렌더, 중첩 자식 렌더, groupIds ACL 세션 기반 필터, icon/cssClass/openInNewWindow
  적용, expand 기본 상태.
- 마이그레이션: 없음(Slice C 스키마 소비). 리스크: 중간(공개 페이지 회귀). **의존: Slice C 완료 후.**

### Slice E — 설치 시 기본 디자인 토큰 시드 (P2, 독립)
- 대상 REQ: REQ-MENU-060~062
- 대상 파일: `packages/db/src/install/seed.ts`, (필요 시) `apps/web/app/admin/site/design/actions.ts` 폴백
- 내용: 설치 트랜잭션에 기본 ThemeAssignment(tokensOverride) 시드 1건, 토큰 부재 시 문서화된 기본값 폴백.
- 마이그레이션: 없음. 리스크: 낮음. **다른 슬라이스와 병렬 가능.**

### Slice F — 레거시 parity 부가 (unlinked / 찾기) (P2~P3, 선택)
- 대상 REQ: REQ-MENU-050(P2), REQ-MENU-051(P3)
- 내용: 미연결 모듈 목록, 메뉴/항목 검색. MVP 후 후속. 범위 압박 시 백로그로 유예 가능.

## 슬라이스 의존 그래프

```
Slice A (P0, UI 필드)
Slice B (P1, DnD 영속)        ← A 이후 권장 (동일 페이지)
Slice C (P1, slot 스키마) ──► Slice D (P1, 렌더링)
Slice E (P2, 시드)            ← 독립/병렬
Slice F (P2/P3, 부가)         ← 최후
```

## 마일스톤 (우선순위 순)

1. **M1 (P0)**: Slice A — 편집기가 모든 필드를 노출하고 저장한다. stale 문구 제거.
2. **M2 (P1)**: Slice B — DnD 순서/계층 변경이 새로고침 후에도 유지된다.
3. **M3 (P1)**: Slice C + D — 다중 슬롯이 스키마에 존재하고 헤더/푸터/유틸리티가 각 메뉴를 트리로 렌더한다.
4. **M4 (P2)**: Slice E — 설치 직후 유효한 디자인 토큰이 존재한다.
5. **M5 (P2/P3, 선택)**: Slice F — unlinked/찾기.

## 리스크

| 리스크 | 슬라이스 | 완화 |
|---|---|---|
| slot 마이그레이션이 기존 `defaultMenuId` 렌더를 깨뜨림 | C/D | 백필(REQ-MENU-025) + 렌더링 레이어를 슬롯 우선·`defaultMenuId` 폴백으로 이중화 후 단계적 제거 |
| DnD 옵티미스틱 상태와 서버 상태 불일치 | B | 성공 후 revalidate 강제, 실패 시 롤백(REQ-MENU-014) |
| groupIds ACL 렌더가 서버 컴포넌트 캐시와 충돌 | D | 세션 의존 렌더 경계 명시, 익명/그룹별 분기 테스트 |
| "완료" 마킹 재현 (UI 미검증) | 전체 | acceptance를 **런타임 영속·화면 관찰** 기준으로 강제 (§acceptance) |
| 디자인 토큰 시드가 install 트랜잭션 원자성 위반 | E | 기존 seed 트랜잭션 내부에 삽입, 부분 시드 방지 |

## MX 태그 대상

- `admin.menuItem.reorder` (fan_in 증가 예상) → `@MX:ANCHOR` 유지/갱신
- slot 조회 렌더 함수 (헤더/푸터/유틸리티 공용) → `@MX:ANCHOR`
- 마이그레이션 백필 로직 → `@MX:WARN` + `@MX:REASON`(데이터 이동)
- 기존 `MenuItemDnDTree`/`MenuItemEditor`의 `@MX:TODO`(DnD 예정) → 제거 (REQ-MENU-041)
