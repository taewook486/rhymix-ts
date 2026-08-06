---
id: SPEC-ADDON-001
title: Research — Addon System Declarative Hook Replacement
version: 1.0.0
created: 2026-05-30
updated: 2026-05-30
parent: SPEC-ADDON-001/spec.md
language: ko
---

# SPEC-ADDON-001 — Research Notes

## HISTORY

- 2026-05-30 (v1.0.0): 최초 작성. MASTER-PLAN-002 §1.12 / §2.3 / Risk Register를 인용. 레거시 6개 빌트인 addon을 본 SPEC의 4개 hook 타입에 매핑한 상세 테이블(boost)을 추가하여 후속 SPEC-ADDON-BUILTIN-001의 작업 분해 근거를 제공한다.

---

## 1. Source Material

### 1.1 MASTER-PLAN-002 인용

본 SPEC은 MASTER-PLAN-002의 다음 부분을 직접 흡수한다:

- **§1.12 addon 모듈**(research.md line 379~408) — 레거시 hook 메커니즘(`$called_position`), 6개 빌트인 addon 인벤토리, PHP→TS 매핑 후보 결정("선언적 hook으로 재정의")
- **§2.3 Addon 서브시스템**(research.md line 485~514) — 디렉토리 구조, 훅 호출 위치, 신규 매핑 전략
- **§5.10 SPEC-ADDON-001**(spec.md line 341~349) — Phase 4 P1, Scope: registry + hook types + admin UI + 통합 지점, Acceptance headline 2개, 테스트 18개 추정, 2 슬라이스

### 1.2 레거시 PHP 코드 인용

레거시 Rhymix의 addon 메커니즘은 본 SPEC의 **반면교사**다. 본 SPEC은 이 메커니즘을 그대로 포팅하지 않는다.

- `D:\project\rhymix\modules\addon\` — addon module 컨트롤러/모델/뷰(admin 토글, setup, info)
- `D:\project\rhymix\addons\` — 6개 빌트인 구현체(adminlogging, autolink, counter, member_extra_info, photoswipe, point_level_icon)
- 각 빌트인은 `{addonName}.addon.php` 단일 진입점 + `conf/info.xml` 메타 + 옵션 `.lib.php` 헬퍼
- 훅 메커니즘: 전역 `$called_position` 변수를 if-가드로 분기해 자기 로직 실행. 호출 위치(실측):
  - `before_module_proc` (모듈 컨트롤러 실행 전, e.g., adminlogging)
  - `after_module_proc` (모듈 컨트롤러 실행 후, e.g., autolink, photoswipe)
  - `before_display_content` (display 직전, e.g., counter, point_level_icon, member_extra_info)
- 활성화 토글: `procAddonAdminToggleActivate` (module_extra_vars에 저장)

### 1.3 신규 rhymix-ts 매핑 결정(MP-002 §2.3 인용)

> "임의의 PHP 코드 삽입"은 보안상 포팅하지 않음. 대신 **선언적 hook system**으로 재설계:
> hook 종류: `onContentTransform`, `onUserRender`, `onPageView`, `onAdminAction`
> 각 addon은 hook 이름 + handler function (TS 모듈)로 등록
> registry: `packages/core/src/addons/registry.ts` (신규)

본 SPEC은 이 결정을 직접 구현한다.

---

## 2. Legacy Addon → New Hook Mapping (boost)

본 절은 후속 SPEC-ADDON-BUILTIN-001의 작업 분해 근거를 제공하기 위한 **per-addon 상세 매핑 테이블**이다. 본 SPEC(ADDON-001) 자체는 hook 핸들러 실구현을 만들지 않으나, 시스템 설계의 타당성을 검증하기 위해 6개가 모두 매핑 가능한지를 사전에 확인한다.

### 2.1 매핑 요약 테이블

| 레거시 Addon | 레거시 hook 위치 | 신규 hook 타입 | 핸들러 시그니처 핵심 동작 | Phase 4 흡수 우선순위 |
|---|---|---|---|---|
| **autolink** | `after_module_proc` | `onContentTransform` | 본문 HTML 안의 URL을 `<a href>`로 자동 치환 | High (단순, 즉시 가치) |
| **photoswipe** | `after_module_proc` | `onContentTransform` + 클라이언트 island | 본문 `<img>`를 PhotoSwipe 라이트박스 마크업으로 감쌈 | High (단순) |
| **counter** | `before_display_content` | `onPageView` | 페이지뷰 카운터 증가(별도 통계 테이블에 increment) | Medium (stats SPEC과 동시) |
| **point_level_icon** | `before_display_content` | `onUserRender` | 회원 닉네임 옆에 포인트 레벨 아이콘 추가 | Medium (SPEC-POINT-001 완료 후) |
| **member_extra_info** | `before_display_content` | `onUserRender` | 회원 프로필에 추가 표시(가입일, 글 수 등) | Low (백로그) |
| **adminlogging** | `before_module_proc` | `onAdminAction` 또는 폐기 | admin 작업 감사 로그 | **폐기** — 이미 SPEC-ADMIN-001 `AdminLog`로 흡수됨 |

### 2.2 매핑별 상세 분석

#### 2.2.1 autolink → onContentTransform

**레거시 동작**: 게시글/댓글 본문 안의 plaintext URL(`http://example.com`)을 발견하면 `<a href="http://example.com" target="_blank">http://example.com</a>`로 치환. `after_module_proc` 시점에 응답 HTML 전체를 정규식으로 스캔.

**신규 매핑**: `onContentTransform(html, ctx) → Promise<string>`. document/comment 본문에만 적용(page 본문은 운영자가 직접 작성하므로 보통 적용 불요).

**구현 메모(후속 SPEC용)**:
- URL 정규식은 보수적으로(이미 `<a>` 안에 있는 URL은 건너뜀).
- `defaultPriority: 50` 권장(다른 transform 사이 중간).
- 의존성: 없음. 즉시 흡수 가능.

#### 2.2.2 photoswipe → onContentTransform + 클라이언트 island

**레거시 동작**: 본문의 `<img>` 태그를 PhotoSwipe gallery 마크업으로 감싸고, 페이지 footer에 PhotoSwipe JS 라이브러리 + 초기화 스크립트를 주입.

**신규 매핑**:
- 서버 측: `onContentTransform`으로 `<img>`에 `data-photoswipe="true"` 같은 마커 속성을 추가하는 단순 HTML 변환.
- 클라이언트 측: 글로벌 layout에 PhotoSwipe React wrapper 컴포넌트를 두고 `data-photoswipe` 마커를 감지해 라이트박스 활성화.

**구현 메모(후속 SPEC용)**:
- 서버 transform은 가벼움. 무거운 JS 번들은 layout client island에만.
- `defaultPriority: 60` 권장(autolink 다음).
- 의존성: PhotoSwipe v5 npm 패키지.

#### 2.2.3 counter → onPageView

**레거시 동작**: `before_display_content` 시점에 현재 mid의 페이지뷰 카운트를 +1. 일별/월별 통계 테이블에 기록.

**신규 매핑**: `onPageView(mid, ctx) → Promise<void>`. fire-and-forget. ctx.prisma로 통계 테이블 increment.

**구현 메모(후속 SPEC용)**:
- 통계 테이블 모델은 후속 SPEC(SPEC-STATS-001 같은)에서 정의. 본 SPEC 시점에는 모델 없음.
- IP 기반 중복 차단(같은 IP 30분 내 재방문은 카운트 안 함)은 핸들러 내부 로직.
- `defaultPriority: 10` 권장(다른 onPageView 핸들러보다 먼저).
- **의존성: SPEC-STATS-001**(미존재). 따라서 counter 흡수는 후순위.

#### 2.2.4 point_level_icon → onUserRender

**레거시 동작**: 회원 닉네임이 표시되는 모든 곳(문서 작성자, 댓글 작성자)에서 포인트를 조회해 레벨 구간별 아이콘을 닉네임 옆에 추가.

**신규 매핑**: `onUserRender(user, ctx) → Promise<{ icon?: string }>`. `user.point`를 받아 레벨 매핑(설정 가능한 임계값 테이블) → icon URL 반환. wrapper(`AddonDecoratedUser`)가 icon을 닉네임 옆에 렌더.

**구현 메모(후속 SPEC용)**:
- 임계값 테이블은 admin/addons 페이지의 addon-specific config로 저장(향후 AddonConfig.options Json 추가 시).
- `user.point`가 없으면 아이콘 없음.
- `defaultPriority: 50` 권장.
- **의존성: SPEC-POINT-001**. POINT-001이 `user.point` 필드를 안정적으로 노출해야 흡수 가능.

#### 2.2.5 member_extra_info → onUserRender

**레거시 동작**: 회원 프로필 페이지에 가입일, 작성 글 수 등 부가 정보 표시.

**신규 매핑**: `onUserRender(user, ctx) → Promise<{ badge?: string }>`. badge에 가입일 요약 텍스트 같은 것을 반환.

**구현 메모(후속 SPEC용)**:
- 레거시 동작은 사실 wrapper UI라기보다 별도 페이지 섹션 추가에 가까움. 본 SPEC의 `onUserRender`는 inline decoration(icon/badge)만 지원하므로 완전 호환 불가.
- 완전 포팅을 위해서는 별도 hook type(예: `onUserProfilePage`) 또는 profile 페이지 자체의 slot 시스템 필요. → **백로그**.
- 즉시 흡수 가능한 것은 닉네임 옆에 짧은 badge(가입년도 등) 추가 정도.

#### 2.2.6 adminlogging → 폐기

**레거시 동작**: 모든 admin 작업(`before_module_proc` 시점)을 가로채 audit log 테이블에 기록.

**신규 매핑**: **불필요**. 신규 시스템은 SPEC-ADMIN-001의 admin Server Action 안에서 직접 `AdminLog` 모델에 기록(REQ-ADMIN-070~072). 즉 `onAdminAction` hook은 본 기능의 **대체가 아닌 확장 지점**(외부 SaaS audit 전송 같은 용도)으로만 의미가 있다.

**결정**: adminlogging은 흡수 대상에서 **제외**. 추후 외부 audit forwarding이 필요하면 `onAdminAction` 핸들러를 작성한다.

### 2.3 매핑이 보여주는 시스템 설계 타당성

위 6개 매핑 분석으로 본 SPEC의 4개 hook 타입이 **레거시 사용 사례의 100%를 커버 가능**함이 확인된다(단, member_extra_info의 profile 페이지 섹션 추가는 향후 별도 slot 시스템 필요). 즉:

- `onContentTransform`: 2개(autolink, photoswipe 서버 측)
- `onUserRender`: 2개(point_level_icon, member_extra_info inline 부분)
- `onPageView`: 1개(counter)
- `onAdminAction`: 0개 흡수(adminlogging은 폐기, ADMIN-001로 대체)

4개 hook 타입은 over-engineering이 아닌 **레거시 패턴의 최소 충분 커버리지**다.

---

## 3. Boundary Decisions

### 3.1 본 SPEC이 만드는 것 / 만들지 않는 것

| 항목 | 본 SPEC(ADDON-001) | 후속 SPEC |
|---|---|---|
| Hook 타입 정의(4개) | ✅ 만듦 | — |
| Registry / Executor / Config | ✅ 만듦 | — |
| AddonConfig Prisma 모델 | ✅ 만듦 | — |
| admin/addons UI | ✅ 만듦(기본 토글/순서) | drag-drop, addon-specific options(향후) |
| 통합 사이트 호출 | ✅ Slice B | — |
| autolink 핸들러 실구현 | ❌ | SPEC-ADDON-BUILTIN-001 |
| photoswipe 핸들러 실구현 | ❌ | SPEC-ADDON-BUILTIN-001 |
| counter 핸들러 실구현 | ❌ | SPEC-STATS-001 의존 |
| point_level_icon 핸들러 실구현 | ❌ | SPEC-POINT-001 의존 |
| member_extra_info | ❌ | 백로그(slot 시스템 필요) |
| adminlogging 포팅 | ❌ | 폐기(ADMIN-001 대체) |
| plugin loader / 외부 marketplace | ❌ | 보안 결정상 영구 제외 후보 |
| sandboxing | ❌ | in-tree 신뢰 모델로 불필요 |

### 3.2 신뢰 모델 결정 근거(spec.md §5.5 보충)

레거시 Rhymix가 임의 PHP 파일 disk drop으로 자동 등록을 허용한 것은 **잘 알려진 취약 표면**이다(파일 업로드 취약점 → addon 디렉토리 → RCE). 신규 시스템에서 이를 답습하지 않는 결정은 보안상 명확하다.

대안인 **외부 plugin loader + sandboxing**(VM2, isolated workers, WASM 등)도 검토 가치는 있으나:

1. TypeScript / Next.js 모노레포는 정적 빌드/번들링이 강력한 안전망. dynamic 코드 로딩은 그 안전망을 깬다.
2. sandbox는 100% 안전하지 않다(VM2 escape CVE 사례 다수).
3. 운영자가 정말 외부 plugin이 필요하다면 npm install로 충분(rhymix-ts addon 모듈을 만들어 publish → 사이트가 install + barrel에 추가 → 재빌드 → 등록).

따라서 본 SPEC의 결정: **in-tree 정적 등록만 지원**. 외부 marketplace는 향후 별도 SPEC에서 명시적 보안 검토와 함께 도입한다(있다면).

---

## 4. Open Risks (research → 본 SPEC Risk Register 반영)

본 research에서 도출한 위험요인은 spec.md §6 Risks 테이블에 1:1 반영되었다. 추가로 후속 SPEC에서 다룰 위험들:

| Risk | 현 SPEC 처리 | 후속 SPEC 처리 |
|---|---|---|
| 핸들러 무한 루프 | AbortSignal 지원 + 미들웨어 timeout | hook별 timeout(향후 옵션) |
| addon 간 부작용 충돌(같은 데이터 두 번 transform) | priority 명시 | 운영 가이드라인 |
| 핸들러 코드 자체에 보안 취약(SQL injection 등) | in-tree 신뢰 모델 + 코드 리뷰 | 정적 분석 자동화(향후) |
| AddonConfig orphan(코드 롤백 후 DB에만 남음) | listEffectiveAddons 필터링 | admin UI stale 라벨(향후) |
| transform이 사이즈 폭주(작은 입력 → 거대 출력) | 명시 없음 | 사이즈 한도(향후) |

---

## 5. References

### 5.1 본 SPEC 의존 SPEC들

- `.moai/specs/SPEC-PAGE-001/spec.md` — page 본문 통합 지점(REQ-ADDON-060)
- `.moai/specs/SPEC-ADMIN-001/spec.md` — AdminLog 모델, admin 라우트 가드 재사용(REQ-ADDON-023, 054)
- `.moai/specs/SPEC-DOCUMENT-001/spec.md` — document 렌더러 통합(REQ-ADDON-061)
- `.moai/specs/SPEC-COMMENT-001/spec.md` — comment 렌더러 통합(REQ-ADDON-062)

### 5.2 레거시 파일 인용

- `D:\project\rhymix\modules\addon\` — addon module
- `D:\project\rhymix\addons\autolink\autolink.addon.php` — `called_position` 분기 패턴 예시
- `D:\project\rhymix\addons\counter\counter.addon.php` — 페이지뷰 카운트 패턴
- `D:\project\rhymix\addons\point_level_icon\point_level_icon.addon.php` — 닉네임 decoration 패턴

### 5.3 MASTER-PLAN-002 cross-link

- `.moai/specs/MASTER-PLAN-002/spec.md` §5.10 SPEC-ADDON-001
- `.moai/specs/MASTER-PLAN-002/research.md` §1.12, §2.3
- `.moai/specs/MASTER-PLAN-002/research.md` Risk Register: addon hook security 항목

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
