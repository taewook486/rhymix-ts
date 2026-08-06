---
id: SPEC-WIDGET-001-research
title: Widget System — Research (placeholder)
version: 0.1.0
status: stub
created: 2026-05-25
updated: 2026-05-25
author: MoAI manager-spec
parent: SPEC-WIDGET-001
language: ko
---

# SPEC-WIDGET-001 Research (Placeholder)

> NOTE: 본 문서는 stub이다. 전체 codebase 심층 분석(research)은 구현 착수 시점(`/moai run SPEC-WIDGET-001`)에 수행한다. 현재는 MASTER-PLAN-002/research.md의 위젯 관련 분석을 참조하며, 본 SPEC 작성에 필요한 핵심 grounded 사실만 요약한다.

## 1. 이미 확인된 grounded 사실 (MASTER-PLAN-002/research.md 기반)

### 1.1 기존 코드 골조 (`packages/core/src/widgets/`)

- `registry.ts` — 모듈 수준 `Map<string, WidgetDefinition>`, `registerWidget` / `getWidget` / `listWidgets` / `resetWidgetRegistry`. React 의존 없음. (SPEC-ADMIN-001 Slice G)
- `types.ts` — `WidgetDefinition<P>` 인터페이스: `name`, `displayName`, `propsSchema: ZodSchema<P>`, `Component: WidgetComponent<P>`, `defaultProps?`. `WidgetComponent`는 React import 없이 구조적 타입(`(props: P) => unknown`)으로 정의.
- `index.ts` — barrel export.
- `registry.test.ts` — 기존 registry 테스트(회귀 가드).

### 1.2 기존 Prisma 모델

- `WidgetInstance` (schema.prisma line 528~538): `id Int`, `widgetName String`, `label String`, `props Json @default("{}")`, `createdAt`, `updatedAt`, `@@index([widgetName])`. `widgetName`은 in-memory registry의 연결 키이며 DB에 WidgetDefinition을 저장하지 않는다 (기존 @MX:NOTE 명시).
- `WidgetStyle` (line 942): 위젯 데코레이션 스타일 모델. 본 SPEC 범위 외(Phase 4).

### 1.3 레거시 위젯 메커니즘 (research §1.6, §2.1)

- legacy: page/layout 본문에 `<img class="zbxe_widget_output" widget="content" list_count="5" ... />` 토큰 임베드. `before display` 이벤트의 `triggerWidgetCompile`이 HTML 응답 직전 토큰을 파싱하여 위젯 `proc($args)` 출력으로 치환.
- 위젯 인스턴스는 별도 테이블이 아니라 본문 마크업 자체에 인코딩됨 (위젯 위치 = 본문 토큰).
- 6개 레거시 위젯: content, counter_status, language_select, login_info, mcontent, pollWidget. Phase 1 우선순위: login_info(헤더 필수) + content(메인 최근 글).
- `content.class.php`: `class content extends WidgetHandler`, `proc($args)` → args(conf/info.xml extra_vars)로 출력 HTML 반환.

### 1.4 신규 매핑 전략 (research §2.1)

- `<rx-widget name="content" data-list-count="5" data-target-mid="notice" />` 커스텀 엘리먼트를 RSC가 파싱하여 위젯 컴포넌트로 치환.
- 위젯 등록: `packages/core/src/widgets/registry.ts` (기존).
- 위젯 렌더러: `apps/web/lib/widgets/render.tsx` (신규, REMEDIATION §4.1 계획).

## 2. 구현 시점에 보강할 research 항목 (TODO)

- `apps/web/app/(auth)/login`의 정확한 로그인 폼 패턴 / CSRF / server action 흐름 (login_info 위젯 폼에 재사용)
- `packages/board`의 document accessor 시그니처 (content 위젯 최근 글 조회 임시 소스)
- `apps/web/app/admin` 라우트 가드 / 미들웨어 정확한 위치 (admin/widgets 접근 제어 재사용)
- 프로젝트 내 기존 sanitizer 존재 여부 (DOMPurify / sanitize-html) — 없으면 도입 결정
- SPEC-LAYOUT-001 `LayoutContextValue` 최종 모양 (위젯 ctx 상위 소스)
- `z.coerce` 기반 HTML attribute → 타입 강제 변환 패턴 확인

## 3. 참조

- `MASTER-PLAN-002/research.md` §1.6, §2.1 (위젯 서브시스템 인벤토리)
- `MASTER-PLAN-002/spec.md` Section 5.3 (SPEC-WIDGET-001 정의)
- `SPEC-LAYOUT-001/spec.md` (LayoutContext 인터페이스, 병행 SPEC)
- `packages/core/src/widgets/{registry,types,index}.ts` (기존 골조)
- `packages/db/prisma/schema.prisma` line 528~538 (WidgetInstance), line 942 (WidgetStyle)
