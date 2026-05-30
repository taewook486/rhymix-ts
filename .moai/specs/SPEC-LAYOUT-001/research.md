---
id: SPEC-LAYOUT-001-research
title: Layout System Research — Legacy Rhymix layout module + current rhymix-ts theme/* state
created: 2026-05-25
status: complete
parent: MASTER-PLAN-002
source-legacy: D:\project\rhymix\modules\layout, D:\project\rhymix\layouts\default
source-current: d:\project\rhymix-ts\packages\core\src\theme, d:\project\rhymix-ts\apps\web
language: ko
---

# Research — SPEC-LAYOUT-001 Layout System (Phase 1 / P0)

본 문서는 SPEC-LAYOUT-001의 사전조사 산출물이다. 추측을 배제하고 실제 레거시 파일 + 현재 rhymix-ts 파일을 직접 읽은 결과만 정리한다. 모든 주장은 검증 가능한 파일 경로를 포함한다.

본 SPEC은 MASTER-PLAN-002 Section 5.1에서 정의된 Phase 1 P0 작업이며, 사용자 가시성 트리오(layout + page + widget) 중 첫 번째다. 동시에 SPEC-THEME-001의 Slice A~D를 흡수한다 (MASTER-PLAN-002 Section 2.1).

---

## 0. 조사 범위

조사 대상:

- 레거시 `modules/layout` 모듈 (PHP)
- 레거시 `layouts/default/` 디렉토리 (실제 레이아웃 구현)
- 현재 `packages/core/src/theme/` 27개 파일 (부분 구현 상태)
- 현재 `apps/web/app/layout.tsx` 루트 레이아웃
- 현재 `apps/web/components/layout/GlobalHeader.tsx` 기존 헤더
- 현재 `apps/web/app/[mid]/page.tsx` 모듈 디스패처
- 현재 `packages/db/prisma/schema.prisma`의 Layout/Theme/Skin/ThemeAssignment 5개 모델

검증 자료:

- `D:\project\rhymix\modules\layout\conf\module.xml`
- `D:\project\rhymix\modules\layout\schemas\layouts.xml`
- `D:\project\rhymix\modules\layout\layout.class.php` (실제로는 stub)
- `D:\project\rhymix\layouts\default\conf\info.xml`
- `D:\project\rhymix\layouts\default\layout.html` (115줄, Smarty 템플릿)
- `d:\project\rhymix-ts\packages\core\src\theme\resolver.ts`
- `d:\project\rhymix-ts\packages\core\src\theme\types.ts`
- `d:\project\rhymix-ts\packages\db\prisma\schema.prisma` (line 874~973)

---

## 1. 레거시 Layout 모듈 분석

### 1.1 modules/layout 자체

`layout.class.php`는 빈 ModuleObject다 (47줄, 모든 메서드 stub). 즉 layout 모듈의 비즈니스 로직은 admin controller / view / model 클래스에 분산되어 있다. PHP 구조는 본 SPEC에서 그대로 포팅하지 않는다 — 도메인 책임만 추출한다.

추출된 도메인 책임:

1. **레이아웃 정의 (installed layout)**: 디스크의 `layouts/{name}/` 디렉토리 = 1개의 "설치된 레이아웃". info.xml(메타) + layout.html(템플릿) + CSS/JS/이미지로 구성.
2. **레이아웃 인스턴스 (layout instance)**: DB row 1개 = 운영자가 "default 레이아웃을 site_srl=1에 적용, LOGO_TEXT='My Site', VISUAL_USE='YES'로 설정함" 같은 인스턴스화된 설정.
3. **레이아웃 적용**: ModuleInstance → Domain → Site 순서로 어떤 layout instance를 쓸지 결정.
4. **레이아웃 렌더**: 선택된 layout instance의 layout.html을 Smarty로 컴파일하여 모듈 출력(`{$content}`)을 슬롯에 삽입.

### 1.2 레거시 DB 스키마 (layouts.xml)

`D:\project\rhymix\modules\layout\schemas\layouts.xml` — 단일 테이블 `layouts`. 즉 레거시는 "설치된 레이아웃 디렉토리"와 "운영자가 만든 인스턴스"를 동일 테이블에 저장한다.

컬럼:

| 컬럼 | 타입 | 의미 |
|---|---|---|
| layout_srl | number, PK | 인스턴스 식별자 |
| site_srl | number, indexed | 어느 사이트에 속하는가 (0=글로벌) |
| layout | varchar(250) | 디스크 디렉토리 이름 (예: "default", "xedition") |
| title | varchar(250) | 운영자가 부여한 인스턴스 이름 |
| extra_vars | text | info.xml의 extra_vars에 대응하는 운영자 값 (JSON serialize) |
| layout_path | varchar(250) | 디스크 경로 (`./layouts/default/`) |
| module_srl | number, indexed | (드물게 사용) 모듈 별 오버라이드 |
| regdate | date | 생성일 |
| layout_type | char(1), default 'P' | 'P'=PC, 'M'=Mobile |

중요 관찰: 레거시는 `layout_instance.xml` 같은 별도 테이블이 **없다**. layout instance와 layout definition이 단일 `layouts` 테이블에 평탄화되어 있다. master plan 지시의 "layout_instance.xml" 파일은 실재하지 않는다 (Bash ls 검증 — 위 line 5).

### 1.3 layouts/default/conf/info.xml — info.xml 구조

`D:\project\rhymix\layouts\default\conf\info.xml` (105줄):

핵심 필드:

- `<title xml:lang="ko">기본 레이아웃</title>` — 표시명 (다국어)
- `<description>` — 설명
- `<version>`, `<date>`, `<author>` — 메타
- `<menus>` — 레이아웃이 노출하는 메뉴 슬롯
  - default 레이아웃: 1개 슬롯 (`name="GNB"`, `maxdepth="2"`, `default="true"`)
- `<extra_vars>` — 운영자가 입력하는 설정. default 레이아웃에서 13개:
  - LOGO_IMG (image), LOGO_TEXT (text)
  - WEB_FONT (select: NO/YES)
  - LAYOUT_TYPE (select: MAIN_PAGE/SUB_PAGE) — main은 1-column, sub는 2-column
  - VISUAL_USE (select: YES/NO)
  - VISUAL_IMAGE_1/2/3 + VISUAL_TEXT_1/2/3 + VISUAL_LINK_1/2/3 (배너 슬라이드)
  - FOOTER (textarea)

본 SPEC에서의 결정: extra_vars는 Zod 스키마(JSON schema)로 정의된 자유 형식 객체로 매핑하며, 본 SPEC Phase 1에서는 default 레이아웃이 사용하는 **5개 핵심 필드만 지원**한다: `siteTitle`, `logoImageUrl`, `logoText`, `footerText`, `layoutType`. 13개 모두 포팅은 SPEC-THEME-POLISH-001(Phase 4)으로 미룬다.

### 1.4 layouts/default/layout.html — Smarty 템플릿 구조

`D:\project\rhymix\layouts\default\layout.html` (115줄):

구조:

```
<div class="container">
  <p class="skip"><a href="#content">...</a></p>     ← 접근성 skip link
  <header class="header">
    <h1>...site title...</h1>
    <div class="side">
      <img widget="login_info" skin="default" />     ← 위젯 임베드 토큰 (레거시 형식)
      <form action="{getUrl()}" ...>...search...</form>
    </div>
    <nav class="gnb" id="gnb">
      <ul>... {loop $GNB->list} ...</ul>            ← 메뉴 슬롯 렌더
    </nav>
  </header>
  <div class="visual ...">...배너 슬라이드...</div>
  <div class="body ...">
    <nav class="lnb" cond="...SUB_PAGE...">...     ← 좌측 네비 (조건부)
    <div class="content" id="content">
      {$content|noescape}                            ← 모듈 출력 슬롯 (핵심)
    </div>
  </div>
</div>
<footer class="footer">...</footer>
```

핵심 변수:

- `{$content|noescape}` — **모듈 출력이 삽입되는 슬롯** (가장 중요)
- `{$GNB->list}` — 메뉴 트리 (info.xml의 menus 슬롯)
- `{$layout_info->LOGO_IMG}` 등 — extra_vars 값
- `{$mid}`, `{$is_keyword}` — 컨텍스트 변수
- `{$lang->skip_to_content}` — i18n
- `Context::getSiteTitle()` — 사이트 메타
- `<img widget="login_info" ... />` — **위젯 토큰** (SPEC-WIDGET-001에서 처리)

본 SPEC의 결정: 본 SPEC은 Smarty 템플릿을 직접 실행하지 않는다. Smarty 템플릿은 **참조 문서**(legacy reference)로만 사용되며, 새 default 레이아웃은 처음부터 React Server Component(TSX)로 작성된다. 위젯 토큰은 SPEC-WIDGET-001에서 별도 파서로 처리되며 본 SPEC은 호환 가능한 **삽입 지점**(`{children}` props)만 제공한다.

---

## 2. 현재 rhymix-ts 코드 베이스 실측

### 2.1 Prisma 스키마 (이미 존재)

`d:\project\rhymix-ts\packages\db\prisma\schema.prisma` line 874~973에 5개 모델이 **이미 정의됨**:

| 모델 | 라인 | 핵심 필드 |
|---|---|---|
| Theme | 874~894 | id (cuid), name (unique), displayName, version, manifest (Json), tokensSchema (Json), status enum, layouts/skins/widgetStyles 1:N |
| Layout | 896~912 | id, legacySrl, themeId FK, name, title, layoutPath, layoutType enum (DESKTOP/MOBILE), siteSrl, extraVars (Json) |
| Skin | 914~928 | id, themeId, moduleType, name, title, componentPath |
| ColorSet | 930~940 | id, skinId, name, tokens (Json) |
| WidgetStyle | 942~952 | id, themeId, name, componentPath |
| ThemeAssignment | 954~972 | id, themeId, scope enum, refType, refId, layoutName, mobileLayoutName, mlayoutMode (RESPONSIVE/SEPARATE), skinName, tokensOverride (Json) |

또한 `Domain` 모델(line 65~92)에는 다음 필드가 이미 존재:

- `defaultLayoutId Int?` (line 75)
- `defaultMobileLayoutId Int?` (line 76)
- `indexModuleInstanceId Int?` (line 79)

그리고 `ModuleInstance` 모델(line 97~131)에도:

- `layoutId Int?` (line 107)
- `mobileLayoutId Int?` (line 108)

**중요 발견**: Layout 모델의 PK는 `String` (cuid), 그러나 Domain의 FK는 `Int?` (`defaultLayoutId Int?`). 이는 **타입 불일치**다. 본 SPEC에서 Slice A 작업의 일부로 이 불일치를 해소해야 한다.

선택지:

- (A) Layout.id를 `Int autoincrement`로 변경 → Domain의 FK 정합화 (마이그레이션 필요)
- (B) Domain.defaultLayoutId를 `String?`로 변경 → 동일하게 마이그레이션 필요
- (C) Domain에 새 컬럼 `defaultLayoutCuid String?` 추가하고 기존 컬럼은 deprecated 표기

본 SPEC의 권고: **(B) Domain/ModuleInstance의 layoutId 컬럼을 String?로 변경**. Theme/Skin은 모두 cuid 기반이고 새 시스템은 string ID로 통일하는 게 자연스럽다. 또한 ModuleInstance.layoutId, ModuleInstance.mobileLayoutId, Domain.defaultMobileLayoutId도 같은 처리. 마이그레이션 시 기존 row의 `layoutId Int?`는 모두 null로 시작하므로 type 변경이 안전하다.

### 2.2 packages/core/src/theme/ 27개 파일 현황

검증된 파일 목록 (Glob 결과):

| 파일 | 역할 | 처분 |
|---|---|---|
| types.ts | ThemeManifest Zod, themeTokensSchema, LayoutProps, SkinProps | KEEP (extend) |
| resolver.ts | resolveLayout(opts) 순수 함수 | KEEP (이미 SPEC 정신과 정합) |
| resolver.test.ts | resolver 단위 테스트 | KEEP |
| manifest-validator.ts | ThemeManifest Zod 검증 | KEEP |
| manifest-validator.test.ts | 검증 테스트 | KEEP |
| inheritance.ts | parent 테마 inheritance 로직 | KEEP (Phase 4에서 사용) |
| inheritance.test.ts | 테스트 | KEEP |
| installer.ts | 디스크 → DB 테마 설치 | KEEP (Slice A에서 활용) |
| installer.test.ts | 테스트 | KEEP |
| hot-swap.ts | 런타임 테마 교체 | DEFER (Phase 4) |
| hot-swap.test.ts | 테스트 | DEFER |
| mobile-layout.ts | mlayout_srl=-2 (responsive) 로직 | **SUPERSEDE** (master plan 결정: m.layouts 폐기, responsive only) |
| mobile-layout.test.ts | 테스트 | **SUPERSEDE** |
| dark-mode.ts | 다크모드 토글 상태 | DEFER (SPEC-THEME-POLISH-001) |
| dark-mode.test.ts | 테스트 | DEFER |
| skin-resolver.ts | 스킨 해석 | KEEP (Slice B에서 layout과 통합 사용) |
| skin-resolver.test.ts | 테스트 | KEEP |
| token-css.ts | tokens → CSS custom properties 변환 | KEEP (Slice C에서 사용) |
| token-css.test.ts | 테스트 | KEEP |
| widget-style.ts | 위젯 스타일 래퍼 해석 | DEFER (SPEC-WIDGET-001) |
| widget-style.test.ts | 테스트 | DEFER |
| preview.ts | 테마 미리보기 모드 | DEFER (Phase 4) |
| preview.test.ts | 테스트 | DEFER |
| assignment-store.ts | ThemeAssignment CRUD | KEEP (Slice B에서 사용) |
| assignment-store.test.ts | 테스트 | KEEP |
| index.ts | barrel export | KEEP (재정리 필요) |

요약:

- **KEEP (재사용)**: 14개 파일 — types, resolver, manifest-validator, inheritance, installer, skin-resolver, token-css, assignment-store + 각 테스트
- **SUPERSEDE (마스터 플랜 결정으로 폐기)**: 2개 — mobile-layout.ts + test (responsive-only로 통일)
- **DEFER (Phase 4로 보류)**: 8개 — hot-swap, dark-mode, widget-style, preview + 각 테스트
- **index.ts**: 재정리 필요 (어떤 export가 본 SPEC range인지 명확화)

총 27개 중 14개는 본 SPEC에서 그대로 사용, 8개는 그대로 유지하되 본 SPEC range 외, 2개는 명시적으로 폐기.

### 2.3 resolver.ts 분석

이미 존재하는 `resolveLayout(opts)`는 본 SPEC의 REQ-LAYOUT-010 (해석 체인) 요구사항을 거의 충족한다:

- ✅ module_instance → domain → site → fallback 우선순위
- ✅ 순수 함수 (입력만으로 결정)
- ✅ console.warn 폴백 처리
- ❌ DB 조회 책임 분리 — opts에 이미 path가 들어와야 함 (호출자가 DB를 조회해야 함). 본 SPEC에서 **layoutPathLoader** 보조 함수를 신규로 작성해서 DB 조회 + resolver를 결합한 high-level API를 노출한다.

### 2.4 apps/web 현황

`apps/web/app/layout.tsx` (Root Layout):

- 현재 모든 페이지를 동일하게 감싸는 단일 루트 레이아웃
- `<GlobalHeader />`(server component) + `<main>{children}</main>` 구조
- TRPCProvider, SessionProviderWrapper, AutoLoginRefresher 포함
- **본 SPEC range가 아님** — 이건 Next.js 루트 레이아웃이고, "Rhymix layout"은 그 children 안에서 적용된다

`apps/web/components/layout/GlobalHeader.tsx`:

- async Server Component
- `headers().get('x-domain-id')` → Domain.defaultMenuId → MenuItem 목록 fetch
- 단순한 GNB 렌더 (Link 리스트)
- **본 SPEC에서 처분**: KEEP-AS-IS. 본 SPEC의 default 레이아웃은 GlobalHeader를 **삼키지 않는다**. 대신 Rhymix layout이 Next.js 루트 레이아웃의 `<main>{children}</main>` 안에서 모듈을 감싸는 형태로 동작한다. GlobalHeader는 Next.js 루트 레이아웃 책임이며 본 SPEC의 default 레이아웃이 추가 헤더를 노출하면 중복이 되므로, 본 SPEC default 레이아웃은 (Phase 1 시점에서는) GlobalHeader가 이미 그려진다고 가정하고 header 영역을 비워둔다. — 단, 이는 Phase 4(SPEC-THEME-POLISH-001)에서 재검토되어 통합될 수 있다.

`apps/web/app/[mid]/page.tsx`:

- siteId(헤더) + mid(파라미터) → ModuleInstance 조회 → def.routes.index() 위임
- 본 SPEC에서 처분: **수정 필요**. 현재는 모듈 출력만 반환한다. 본 SPEC Slice C에서 모듈 출력을 default layout 안으로 감싸야 한다 (REQ-LAYOUT-040).

### 2.5 미구현 영역 (본 SPEC의 작업)

검증된 누락 항목:

1. **DB-aware layout fetch 함수**: 현재 resolver.ts는 path를 받기만 함. ModuleInstance/Domain/Site에서 layoutId를 읽어 Layout row를 조회하는 layer가 없다.
2. **실제 default theme + layout 파일**: `themes/default/` 디렉토리가 없다. layout 컴포넌트가 없다.
3. **레이아웃 렌더 파이프라인**: layout이 어떻게 모듈 출력을 감싸는지를 정의한 곳이 없다. Next.js 루트 레이아웃은 일반적인 React 패턴이지만, "Rhymix layout"이라는 1차 위치에서 module output을 wrap하는 메커니즘은 새로 정의해야 한다.
4. **apps/web/[mid]/page.tsx의 layout integration**: 모듈 출력을 layout으로 감싸는 통합 지점.
5. **LayoutContext provider**: extraVars/siteTitle/menu를 layout 컴포넌트가 접근하는 방법 (React Context 또는 props).
6. **packages/layout 패키지 vs packages/core/src/theme/ 확장**: 둘 중 어디에 새 코드를 둘지 결정.

---

## 3. 결정 사항 (Decision Log)

본 SPEC 작성 과정에서 내려진 결정 사항. 모두 master plan과 일관성 유지.

### 3.1 패키지 위치: packages/core/src/theme/ 확장

**결정**: 새 `@rhymix-ts/layout` 패키지를 신규 생성하지 않고, 기존 `packages/core/src/theme/`를 확장한다.

근거:

- 이미 27개 파일이 진행 중이며 그 중 14개를 그대로 재사용
- "테마"와 "레이아웃"은 도메인적으로 분리되지 않음 (테마 = 레이아웃+스킨+위젯스타일+토큰 묶음). Rhymix 자체도 layout 모듈과 theme 개념을 분리하지 않는다 (layout = theme의 일부)
- 신규 패키지 분리는 import 경로 복잡도만 늘리고 응집도는 떨어뜨림
- 새 코드는 `packages/core/src/theme/layout/` 서브폴더에 둠 (resolver는 이미 있으나 layout-specific은 신규)

대안 (각하): `packages/layout` 별도 패키지 — 의존성 회피 가능하나 SPEC-THEME-POLISH-001(Phase 4)에서 어차피 통합 필요. 미리 분리하면 나중에 합쳐야 함.

### 3.2 Layout instance vs Layout definition: 단일 모델

**결정**: 기존 Prisma `Layout` 모델은 "Layout 인스턴스 + Layout 정의"를 모두 나타낸다. 별도 `LayoutInstance` 모델은 추가하지 않는다.

근거:

- 레거시도 단일 `layouts` 테이블로 운영함 (research §1.2)
- 디스크의 `themes/default/layouts/default.tsx`는 코드(컴포넌트), DB의 `Layout` row는 "이 코드를 이 사이트에 이 설정으로 적용한 인스턴스"
- 정의(componentPath)와 인스턴스(extraVars, siteSrl)를 분리해도 1:1 관계가 거의 항상이라 가치가 없음
- LayoutAssignment(scope-based 할당)는 `ThemeAssignment` 모델로 이미 표현됨

### 3.3 ID 타입 통일: String (cuid) 기반

**결정**: Domain.defaultLayoutId, Domain.defaultMobileLayoutId, ModuleInstance.layoutId, ModuleInstance.mobileLayoutId 컬럼을 `Int?` → `String?`로 변경 (research §2.1 옵션 B).

근거:

- Layout/Theme/Skin은 cuid 기반 (Prisma `@id @default(cuid())`)
- Domain/ModuleInstance만 Int FK이면 type mismatch → 컴파일 오류
- 마이그레이션은 안전: 기존 row의 layoutId는 모두 null이거나 0 (SPEC-ADMIN-001 시점에서 사용자가 직접 입력한 경우는 없음)

마이그레이션 명령: `pnpm prisma migrate dev --name layout-id-string`

### 3.4 m.layouts 폐기 (master plan 결정 반영)

**결정**: `LayoutType` enum에서 `MOBILE` value를 즉시 제거하지는 않으나(스키마 안정성), 본 SPEC range에서는 `MOBILE` layout type을 생성/소비하지 않는다. `Domain.defaultMobileLayoutId`, `ModuleInstance.mobileLayoutId`는 항상 null로 둔다. `ThemeAssignment.mobileLayoutName`도 사용하지 않으며, `ThemeAssignment.mlayoutMode`는 항상 `RESPONSIVE`다.

근거: master plan Section 6.6 결정 — responsive Tailwind only.

mobile-layout.ts/test.ts 2개 파일은 SUPERSEDE 처리(즉 본 SPEC 완료 시 deleted 또는 deprecated 표기).

### 3.5 xedition / user_layout 폐기

**결정**: `themes/default/` 1개만 포팅한다. xedition, user_layout은 레거시 디스크에 두고 본 SPEC range에서 마이그레이션하지 않는다.

근거: master plan Section 9.1 결정 6 (xedition은 백로그).

### 3.6 Layout shell은 RSC

**결정**: default layout 컴포넌트는 `'use server'` 지시 없는 일반 비동기 함수 컴포넌트 (Next.js 16 App Router 기준 = React Server Component).

근거:

- 사용자 메시지에 명시: "Layout shell must be a React Server Component (async, reads DB)"
- Site, Domain, Menu 정보를 DB에서 조회해야 하므로 서버 컴포넌트가 자연스러움
- 인터랙티브 부분(예: 모바일 햄버거 메뉴)은 client component island로 격리

### 3.7 Context 전달: props + 명시적 React Context

**결정**: Layout 컴포넌트는 다음 두 가지로 변수를 받는다:

1. **Props**: 부모(apps/web/[mid]/page.tsx)가 직접 넘김 — `children` (모듈 출력), `extraVars` (Layout row의 JSON 필드)
2. **React Context (LayoutContext)**: layout 내부의 nested component(예: SiteTitle, MenuRenderer, WidgetSlot)가 site/domain/user 정보를 끌어다 쓰는 경로. provider는 default layout root에서 한 번만 wrap.

근거:

- props는 명시적이고 type-safe
- Context는 deeply nested 컴포넌트가 prop drilling 없이 데이터 access 가능
- 위젯(SPEC-WIDGET-001)이 LayoutContext의 user/site 정보를 읽을 수 있어야 함 (다음 SPEC 의존성)

### 3.8 Render pipeline: 호출자 책임

**결정**: 본 SPEC은 "layout이 어떻게 모듈 출력을 wrap 하는지"를 명시적 호출자 책임으로 정의한다. 즉 `apps/web/app/[mid]/page.tsx` 같은 호출자가 다음 패턴을 따른다:

```
1. ModuleInstance 조회
2. resolveLayoutFromInstance(instance) → { Component, extraVars }
3. const moduleOutput = await def.routes.index(...)
4. return <LayoutComponent extraVars={...}>{moduleOutput}</LayoutComponent>
```

근거:

- 레거시 PHP의 `triggerWidgetCompile` 같은 글로벌 hook 메커니즘은 RSC 환경에서 비자연스러움
- Next.js는 명시적 wrap 패턴(부모 컴포넌트가 자식을 children prop으로 받음)이 표준
- 호출자가 무엇을 어떻게 감쌀지 결정 → 라우트마다 다른 layout 적용 가능 (admin 페이지는 admin layout, 콘텐츠 페이지는 site layout 등)

본 SPEC은 `renderModuleWithLayout(opts)` 헬퍼를 제공하여 위 4-step 패턴을 1줄로 줄인다.

---

## 4. 슬라이스 분해

본 SPEC을 3개 슬라이스로 분해한다.

### Slice A: 도메인 패키지 + Prisma 정합화

목표: Layout 도메인의 데이터 모델/검증/조회 헬퍼를 정비한다. (no UI)

산출:

1. Prisma 마이그레이션: Domain/ModuleInstance의 layoutId(s)를 String?로 변경
2. `packages/core/src/theme/layout/types.ts` — LayoutConfig, LayoutInstance, LayoutContextValue 등 인터페이스
3. `packages/core/src/theme/layout/loader.ts` — Layout row 로드 헬퍼 (cuid 기반 조회)
4. `packages/core/src/theme/layout/resolver-with-db.ts` — resolveLayoutFromInstance(instance, prisma, { site, domain }) (resolver.ts를 wrap)
5. `packages/core/src/theme/layout/extra-vars.ts` — extraVars JSON을 Zod로 parse (default layout 5 fields: siteTitle, logoImageUrl, logoText, footerText, layoutType)
6. `packages/core/src/theme/index.ts` 재정리 — layout 서브모듈 export
7. SPEC 적용 가드 테스트: resolver + loader + extra-vars unit tests

완료 정의:

- `pnpm prisma migrate dev` 통과
- 모든 새 파일에 unit test
- `pnpm tsc --noEmit` 0 error
- 테스트 추가 약 12개

### Slice B: Layout render pipeline + LayoutContext

목표: Layout이 모듈 출력을 어떻게 감싸는지를 정의하고, 그 메커니즘을 헬퍼로 제공한다. (still no concrete theme)

산출:

1. `packages/core/src/theme/layout/context.tsx` — LayoutContext + LayoutProvider (client component)
2. `packages/core/src/theme/layout/pipeline.ts` — renderModuleWithLayout({ instance, moduleOutput, prisma }) → JSX. Layout이 없으면 fallback (moduleOutput 그대로 return)
3. `packages/core/src/theme/layout/slot.tsx` — `<LayoutSlot name="content" />` 같은 기본 슬롯 컴포넌트 (children prop 패스스루)
4. `packages/core/src/theme/layout/registry.ts` — Layout name(legacyKey) → React Component 매핑. (e.g., "default" → default-layout RSC). 초기 빈 맵, Slice C에서 default 등록.
5. 통합 테스트: mocked instance + mock theme → renderModuleWithLayout이 올바른 JSX tree를 반환

완료 정의:

- pipeline.ts가 fallback + happy path를 모두 처리
- LayoutContext가 client에서 사용 가능
- `pnpm test` 통과
- 테스트 추가 약 10개

### Slice C: themes/default 1개 + apps/web 통합

목표: 실제 사용자가 화면에서 변화를 본다.

산출:

1. `themes/default/` 신규 디렉토리:
   - `themes/default/theme.json` — ThemeManifest (name="default", version="1.0.0", layouts=["default"], skins, supportsDarkMode=false)
   - `themes/default/layouts/default.tsx` — DefaultLayout RSC. props: { children, extraVars }. context provider 포함. Tailwind className, responsive container, header(GlobalHeader가 이미 있으므로 minimal), main, footer 3-영역. siteTitle / footerText 적용.
   - `themes/default/layouts/default.module.css` (선택) — Tailwind만 사용하면 불필요
2. `themes/default/install.ts` — theme installer를 호출해 DB에 Theme/Layout row를 시드(seed)하는 스크립트. `pnpm seed:default-theme` 명령으로 실행.
3. registry.ts에 default layout 등록
4. `apps/web/app/[mid]/page.tsx` 수정: def.routes.index() 결과를 renderModuleWithLayout()으로 감쌈
5. `apps/web/app/page.tsx` (root index) — 도메인의 indexModuleInstance를 따라가 mid를 결정한 뒤 [mid] 로직과 동일하게 처리
6. e2e 가드: install 후 도메인 홈 방문 → 200 응답 + default layout HTML structure (footer 텍스트 등) 확인

완료 정의:

- 클린 설치 + 시드 후 `/` 또는 `/{anyMid}` 방문 시 DefaultLayout 안에 모듈 출력이 들어있음
- e2e 테스트 1개 추가 (Playwright)
- 테스트 추가 약 8개 (unit + e2e)

---

## 5. 위험요인

| 위험 | 가능성 | 영향 | 완화 |
|---|---|---|---|
| Prisma migration 충돌 (기존 row의 layoutId가 Int → String 변환) | 중간 | 중간 | 기존 row는 모두 null로 시작 (사용자가 layoutId를 입력한 적이 없음). 빈 DB에서 migrate dev → safe. 운영 DB는 본 마이그레이션 적용 시 별도 검증 절차. |
| GlobalHeader 중복 노출 | 중간 | 낮음 | default layout은 Phase 1에서 GlobalHeader를 포함하지 않는다 (Next.js 루트 레이아웃이 이미 그림). Phase 4에서 통합 논의. |
| layout component path 보안 (RCE) | 낮음 | 높음 | registry.ts가 정적 매핑(name → import된 컴포넌트). 동적 require/import path 사용 금지. 새 레이아웃은 코드 추가 + registry 등록의 2단계로만 추가 가능. |
| extraVars JSON이 malformed면 layout이 crash | 중간 | 중간 | Zod safeParse + fallback. 검증 실패 시 default 값 사용 + warn 로그. |
| SPEC-WIDGET-001과의 인터페이스 충돌 | 중간 | 중간 | LayoutContext 모양을 본 SPEC에서 확정 (user/site/domain/menu). SPEC-WIDGET-001은 이를 read-only로 사용. children prop을 통해 widget 토큰 파서 결과가 layout 안으로 들어옴. |

---

## 6. 의존성

본 SPEC은 다음에 의존:

- ✅ SPEC-AUTH-001 (User, Session 모델)
- ✅ SPEC-ADMIN-001 Slice A (ModuleInstance, Domain, Site 모델)
- ✅ packages/core/src/theme/* (이미 진행 중인 14개 파일)

본 SPEC을 차단/의존하는 후속 SPEC:

- SPEC-WIDGET-001 (Phase 1) — LayoutContext가 widget 토큰 파서를 호출함
- SPEC-PAGE-001 (Phase 1) — page 모듈은 본 SPEC의 layout 안에서 렌더됨
- SPEC-THEME-POLISH-001 (Phase 4) — admin UI + dark mode가 본 SPEC의 토대 위에 추가됨

---

## 7. 검증된 파일 목록

본 research에서 직접 read한 파일:

- `D:\project\rhymix\modules\layout\conf\module.xml` (50 lines)
- `D:\project\rhymix\modules\layout\schemas\layouts.xml` (12 lines)
- `D:\project\rhymix\modules\layout\layout.class.php` (47 lines, stub)
- `D:\project\rhymix\layouts\default\conf\info.xml` (105 lines)
- `D:\project\rhymix\layouts\default\layout.html` (115 lines)
- `d:\project\rhymix-ts\packages\db\prisma\schema.prisma` line 60~92 (Domain), 97~131 (ModuleInstance), 874~973 (Theme/Layout/Skin/ColorSet/WidgetStyle/ThemeAssignment)
- `d:\project\rhymix-ts\packages\core\src\theme\types.ts` (69 lines)
- `d:\project\rhymix-ts\packages\core\src\theme\resolver.ts` (62 lines)
- `d:\project\rhymix-ts\apps\web\app\layout.tsx` (36 lines)
- `d:\project\rhymix-ts\apps\web\components\layout\GlobalHeader.tsx` (57 lines)
- `d:\project\rhymix-ts\apps\web\app\[mid]\page.tsx` (51 lines)
- `d:\project\rhymix-ts\.moai\specs\MASTER-PLAN-002\spec.md` (584 lines)
- `d:\project\rhymix-ts\.moai\specs\MASTER-PLAN-002\research.md` (700 lines)

Glob 결과 검증:

- `packages/core/src/theme/**/*` → 27 files
- `D:\project\rhymix\layouts\*` → 3 layout directories (default, user_layout, xedition)

Bash 검증:

- `D:\project\rhymix\modules\layout\schemas\` → 단일 `layouts.xml` (즉 layout_instance.xml은 실재하지 않음)

---

Version: 1.0.0
Last Verified: 2026-05-25
