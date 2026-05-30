---
id: SPEC-PAGE-001-research
title: SPEC-PAGE-001 Research Notes (placeholder)
version: 0.1.0
status: stub
created: 2026-05-25
updated: 2026-05-25
author: MoAI manager-spec
parent: SPEC-PAGE-001
language: ko
---

# SPEC-PAGE-001 — Research (Placeholder)

> 본 문서는 스텁이다. 전체 코드베이스 연구는 구현 시점(`/moai run SPEC-PAGE-001` Slice A ANALYZE 단계)에 수행한다. 아래는 spec.md 작성 중 확인된 ground-truth 사실의 요약이며, 구현 전 expert-backend가 보강한다.

## 1. 확인된 사실 (spec.md 작성 중 검증)

### 1.1 Prisma 스키마 현황 (`packages/db/prisma/schema.prisma`)

- `ModuleInstance.id`는 `Int @default(autoincrement())` — **cuid 아님**. page service 시그니처는 number 사용.
- `ModuleInstance`에는 `moduleCode`, `mid`, `layoutId Int?`, `config ModuleConfig?` 등 존재. 본문(content/mcontent) 필드는 **없음** → 추가 필요(REQ-PAGE-001).
- `ModuleConfig`는 1:1 분리 테이블이며 `config Json`을 보유(가정) → page 옵션을 `config.page` 네임스페이스에 저장.
- `Domain.indexModuleInstanceId Int?` + `indexModuleInstance` 관계(`@relation("IndexModule")`) 존재 → 홈(`/`) 디스패치 근거.

### 1.2 모듈 레지스트리 (`packages/core/src/modules/`)

- `registry.ts` + `types.ts` 존재. `ModuleDefinition`, `ModuleRouteIndex`, `ModuleRoutePageProps`(`{ instance, params, searchParams, prisma }`) 정의됨.
- board 모듈이 동일 레지스트리에 등록되는 패턴 존재 → page도 동일 패턴.
- `routes.index`는 `(props) => Promise<ReactNode> | ReactNode` 시그니처.

### 1.3 레거시 `modules/page` (`D:\project\rhymix\modules\page`)

- `conf/module.xml`: page는 본문(content/mcontent)을 모듈 인스턴스 설정에 직접 저장. 별도 정규화 테이블 없음 → `mcontent` 필드 선택 근거.
- pageType 개념: ARTICLE(document 본문), WIDGET, CONTENT(직접 본문). Phase 1은 CONTENT/WIDGET만.
- `procPageAdminRemoveWidgetCache` 등 위젯 캐시 액션 존재 → 캐싱은 백로그.

### 1.4 의존 SPEC 경계

- SPEC-LAYOUT-001: `renderModuleWithLayout({ instance, moduleOutput, prisma, request })` 제공 — page는 소비자.
- SPEC-WIDGET-001: `<rx-widget>` 토큰 파서 — page는 토큰을 raw로 통과(pass-through 계약).

## 2. 구현 시 보강 필요 항목 (TODO)

- [ ] `ModuleConfig.config` Json 필드의 정확한 형태 확인 (네임스페이스 키 충돌 여부).
- [ ] sanitizer 라이브러리 최종 선택 (`isomorphic-dompurify` 권고) + rx-widget allow-list 설정 검증.
- [ ] `apps/web` 모듈 부트스트랩 지점 정확한 파일 경로 확인 (board 등록 위치).
- [ ] admin 모듈 인스턴스 생성 UI가 moduleCode='page'를 지원하는지 확인 (미지원 시 최소 생성 경로).
- [ ] 편집 권한 판별: SPEC-AUTH-001 RBAC API의 admin-group 판별 함수 식별.
- [ ] `apps/web/app/[mid]/page.tsx` 현재 디스패치 로직이 moduleCode='page'를 자연 처리하는지 확인.

## 3. 비고

전체 연구(legacy page.controller.php / page.view.php 상세 분석, document 본문 모드 ARTICLE 처리, 위젯 캐시 무효화 로직 등)는 본 SPEC 범위(Phase 1 CONTENT/WIDGET)를 넘어서므로 해당 후속 SPEC 작성 시 수행한다.
