---
id: SPEC-ADMIN-001
title: Admin Dashboard & Module System
status: draft
priority: P0
created: 2026-05-10
domain: admin
related: [SPEC-AUTH-001, SPEC-CONTENT-001, SPEC-THEME-001]
---

# SPEC-ADMIN-001: Admin Dashboard & Module System

## Overview

본 SPEC은 Rhymix CMS를 Next.js 16 + TypeScript 기반으로 전면 재설계하기 위한 **시스템 기반 (Foundation)** 을 정의한다. 게시판, 회원 페이지, 위키, 쇼핑몰 등 모든 기능 모듈은 본 SPEC이 정의하는 **모듈 인스턴스 시스템 (Module Instance System)**, **멀티 사이트 라우팅 (Multi-Domain Routing)**, **관리자 셸 (Admin Shell)** 위에서 동작한다.

### 위치 및 책임

본 SPEC은 다른 모든 SPEC의 상위에 위치하는 기반 계층을 정의하며, 다음 핵심 추상화를 책임진다.

- **Module Instance System**: 하나의 모듈 코드(예: `board`)에서 다수의 인스턴스(예: `notice`, `qna`, `freetalk`)를 생성·구성·라우팅하는 메커니즘. 각 인스턴스는 고유한 `mid`(module instance identifier)를 가지며 자체적인 레이아웃·스킨·권한·콘텐츠 설정을 보유한다.
- **Multi-Domain & Multi-Site**: 단일 인스턴스에서 다수의 호스트네임을 운영하고, 도메인별로 기본 언어·시간대·기본 모듈·메뉴·레이아웃을 분리한다.
- **Admin Shell**: 디자인, 시스템 설정, 사용자 관리, 모듈 관리, 유지보수 기능을 통합한 관리자 대시보드 셸. 좌측 네비게이션, 즐겨찾기, 권한 기반 섹션 노출을 제공한다.
- **Plugin Architecture**: 새로운 모듈 타입(게시판, 위키, 쇼핑몰 등)이 등록·설치·구성·해제되는 라이프사이클과 인터페이스 규약.
- **Menu / Widget System**: 사이트 메뉴 트리와 위젯 레지스트리. 콘텐츠 영역에 동적 컴포넌트를 임베드하는 표준 메커니즘.
- **Cache / Audit / Health**: 캐시 무효화 전략, 관리자 감사 로그, 시스템 상태 대시보드.

### Rhymix 도메인 상속

Rhymix의 검증된 도메인 개념(`mid`, `module_srl`, `domain_srl`, `site_srl`, `module_config`, `menu_item`, 위젯 임베드 태그)을 그대로 상속하되, 다음과 같이 현대화한다.

| Rhymix 개념             | 재설계 대응                                          |
| ----------------------- | ---------------------------------------------------- |
| `modules` 테이블        | Prisma `ModuleInstance` 모델 + `mid` citext 유니크   |
| `module_config` (JSON)  | `ModuleConfig` 모델 + Zod 스키마 검증                |
| `domains.index_module_srl` | `Domain.indexModuleInstanceId` (사이트 홈)        |
| `menu` / `menu_item`    | `Menu` / `MenuItem` (parentId 트리, ACL 그룹)        |
| 파일 기반 위젯 (XML)    | React Server Component 위젯 레지스트리               |
| `<img widget="..." />`  | MDX/HTML 파서가 React 컴포넌트로 치환                |
| 관리자 즐겨찾기         | `AdminFavorite` 모델 (사용자별 핀)                   |

### 비고

본 SPEC은 “기능을 만든다”기보다 “이후 SPEC들이 플러그인할 수 있는 골격을 만든다”에 가깝다. 본 SPEC이 완료되어야 SPEC-AUTH-001(인증), SPEC-CONTENT-001(게시판/콘텐츠), SPEC-THEME-001(레이아웃/스킨/위젯 디자인)이 의미 있게 진행될 수 있다.

---

## User Stories

### US-1. 사이트 관리자: 멀티 도메인 운영
사이트 관리자로서, 하나의 Rhymix-TS 인스턴스에서 `example.com` 과 `community.example.com` 을 모두 운영하고 각 도메인마다 다른 기본 언어·시간대·홈페이지(인덱스 모듈)를 지정하고 싶다. 그래야 별도 서버를 띄우지 않고도 다국어/다브랜드 사이트를 운영할 수 있다.

### US-2. 사이트 관리자: 모듈 인스턴스 생성
사이트 관리자로서, "공지사항"용 게시판 인스턴스(`mid=notice`)와 "Q&A"용 게시판 인스턴스(`mid=qna`)를 같은 게시판 코드에서 두 개 만들고 각자 다른 권한·스킨·레이아웃을 부여하고 싶다. 그래야 동일 코드 베이스에서 다양한 게시판을 운용할 수 있다.

### US-3. 사이트 관리자: `mid` 충돌 방지
사이트 관리자로서, 모듈 인스턴스를 만들 때 `mid` 값이 예약어(`admin`, `api`, `_next` 등)나 실제 파일 경로, 기존 `mid`와 충돌하지 않도록 시스템이 자동 검증해 주길 바란다. 그래야 라우팅 충돌과 보안 사고를 예방할 수 있다.

### US-4. 사이트 관리자: 인스턴스별 레이아웃/스킨
사이트 관리자로서, 각 모듈 인스턴스에 데스크톱/모바일 레이아웃과 스킨을 따로 지정하고 인스턴스별 브라우저 타이틀과 메타 정보를 설정하고 싶다. 그래야 동일 게시판 코드라도 페이지마다 다른 룩앤필을 줄 수 있다.

### US-5. 콘텐츠 편집자: 메뉴 빌더
콘텐츠 편집자로서, 사이트 상단 메뉴를 드래그앤드롭 트리 형태로 구성하고 각 메뉴 항목에 URL·아이콘·노출 그룹(ACL)·새 창 여부·하위 항목 펼침 상태를 지정하고 싶다. 그래야 코드 수정 없이 정보 구조를 변경할 수 있다.

### US-6. 디자이너: 위젯 배치
디자이너로서, 사이트 메인 페이지나 게시판 인스턴스의 콘텐츠 영역에 “최신 글”, “인기 태그”, “배너” 같은 위젯을 코드 수정 없이 추가하고 스타일을 바꾸고 싶다. 그래야 비개발자도 페이지를 구성할 수 있다.

### US-7. 사용자 관리자: 회원·그룹·차단 관리
사용자 관리자로서, 회원 목록을 검색·필터·일괄 처리할 수 있고, 그룹별 권한을 관리하며, 차단 IP/이메일/닉네임 목록을 별도로 관리하고 싶다. 그래야 커뮤니티 운영을 효율적으로 수행할 수 있다.

### US-8. 시스템 관리자: 시스템 환경 모니터링
시스템 관리자로서, 관리자 대시보드에서 Node.js 버전, 환경 변수(민감 정보 제외), 데이터베이스 연결 상태, 캐시 상태, 큐/스케줄러 상태, 디스크 사용량을 한 화면에서 보고 싶다. 그래야 장애 진단 시간을 단축할 수 있다.

### US-9. 시스템 관리자: SEO/보안 기본값
시스템 관리자로서, 사이트 전역의 SEO 메타 기본값(robots, sitemap, og:image fallback), HTTPS 강제, CSP 기본 정책, 관리자 2FA 강제 여부를 한곳에서 설정하고 싶다. 그래야 사이트 전체의 일관된 보안·검색 정책을 유지할 수 있다.

### US-10. 시스템 관리자: 캐시 관리
시스템 관리자로서, 관리자 화면에서 “캐시 전체 비우기”, “모듈 인스턴스 단위 캐시 비우기”, “메뉴 캐시 비우기”, “위젯 캐시 비우기” 등 세분화된 무효화 작업을 수행하고 싶다. 그래야 콘텐츠 갱신이 즉시 반영된다.

### US-11. 시스템 관리자: 로그 및 감사 추적
시스템 관리자로서, 관리자가 수행한 모든 변경 작업(누가, 언제, 무엇을, 어떤 IP/User-Agent로)이 감사 로그에 남고 검색 가능하길 원한다. 그래야 사고 발생 시 책임 추적과 컴플라이언스를 충족할 수 있다.

### US-12. 시스템 관리자: 백그라운드 작업
시스템 관리자로서, 정기 작업(메일 발송, 사이트맵 생성, 통계 집계, 로그 로테이션)을 큐/스케줄러로 등록하고 실행 상태와 실패 알림을 모니터링하고 싶다. 그래야 운영 자동화가 가능해진다.

### US-13. 사이트 관리자: 즐겨찾기/단축키
사이트 관리자로서, 자주 쓰는 관리자 페이지(특정 게시판 설정, 차단 목록 등)를 사이드바에 핀처럼 고정하고 빠르게 접근하고 싶다. 그래야 매일 반복하는 작업의 클릭 수를 줄일 수 있다.

### US-14. 사이트 관리자: 사이트 설정 가져오기/내보내기
사이트 관리자로서, 도메인·메뉴·모듈 인스턴스·권한 설정을 JSON으로 내보내거나 가져와서 스테이징↔운영 환경 간에 동기화하고 싶다. 그래야 환경 간 일관성을 유지할 수 있다.

### US-15. 모듈 개발자: 새 모듈 등록
모듈 개발자로서, 새로운 모듈 타입(예: `wiki`, `shop`)을 정해진 `ModuleDefinition` 인터페이스로 등록하면 자동으로 관리자 화면에 “설치/구성” UI가 노출되고 라우팅과 권한이 작동하길 원한다. 그래야 핵심 코어를 건드리지 않고 기능을 확장할 수 있다.

---

## EARS Requirements

### 1. 모듈 인스턴스 시스템

**REQ-ADMIN-001 (Ubiquitous)**
시스템은 항상 모듈 인스턴스를 `mid`(citext, 길이 1–80, 패턴 `^[a-z0-9][a-z0-9_-]*$`)로 식별해야 한다.

**REQ-ADMIN-002 (Event-Driven)**
WHEN 관리자가 새 모듈 인스턴스를 생성 요청 THEN 시스템은 입력된 `mid`에 대해 (a) 패턴 검증, (b) 예약어 충돌 검증, (c) 라우트 경로 충돌 검증, (d) 동일 도메인 내 유니크 검증을 모두 수행해야 한다.

**REQ-ADMIN-003 (Unwanted)**
시스템은 예약어 목록(`admin`, `api`, `_next`, `static`, `assets`, `health`, `auth`, `404`, `500`, `robots.txt`, `sitemap.xml`, `favicon.ico` 등)에 포함된 `mid`로 인스턴스를 생성하지 않아야 한다.

**REQ-ADMIN-004 (Event-Driven)**
WHEN 모듈 인스턴스가 생성될 때 THEN 시스템은 해당 모듈 코드의 `ModuleDefinition.onInstall(instance)` 라이프사이클 훅을 호출하고 실패 시 트랜잭션을 롤백해야 한다.

**REQ-ADMIN-005 (Event-Driven)**
WHEN 모듈 인스턴스가 삭제될 때 THEN 시스템은 `ModuleDefinition.onUninstall(instance)`을 호출하고, 인스턴스 콘텐츠/설정/캐시 정리 정책을 적용해야 한다.

**REQ-ADMIN-006 (State-Driven)**
IF 모듈 인스턴스가 도메인의 `indexModuleInstanceId`로 지정되어 있다 THEN 해당 인스턴스는 삭제할 수 없으며 관리자에게 다른 인덱스 모듈 지정 후 다시 시도하라는 메시지를 표시해야 한다.

**REQ-ADMIN-007 (Ubiquitous)**
시스템은 인스턴스별 설정을 `ModuleInstance` 코어 필드 + `ModuleConfig` JSON 블롭으로 분리 저장하고, JSON 블롭은 모듈 정의가 제공하는 Zod 스키마로 검증해야 한다.

### 2. 멀티 도메인 라우팅

**REQ-ADMIN-010 (Event-Driven)**
WHEN HTTP 요청이 들어올 때 THEN 미들웨어는 `Host` 헤더로 `Domain` 레코드를 조회해 요청 컨텍스트에 `domainId`, `siteId`, `defaultLanguage`, `timezone`을 주입해야 한다.

**REQ-ADMIN-011 (State-Driven)**
IF 요청 호스트네임에 매칭되는 `Domain` 레코드가 없다 THEN 시스템은 `is_default_domain=true` 인 도메인으로 폴백하거나 404를 반환하도록 설정 가능해야 한다.

**REQ-ADMIN-012 (Event-Driven)**
WHEN 요청 경로가 `/{mid}` 또는 `/{mid}/...` 형태이며 해당 도메인에 `mid` 인스턴스가 존재할 때 THEN Next.js App Router의 `[mid]` 동적 세그먼트가 해당 인스턴스를 활성화하고 모듈 정의의 라우트 핸들러를 호출해야 한다.

**REQ-ADMIN-013 (Event-Driven)**
WHEN 요청 경로가 `/`(루트)일 때 THEN 시스템은 도메인의 `indexModuleInstanceId`가 가리키는 모듈 인스턴스를 인덱스로 렌더링해야 한다.

**REQ-ADMIN-014 (State-Driven)**
IF 도메인의 `forceHttps` 플래그가 true 다 THEN 미들웨어는 HTTP 요청을 동일 경로의 HTTPS로 영구 리다이렉트해야 한다.

### 3. 관리자 권한 및 라우트 가드

**REQ-ADMIN-020 (Ubiquitous)**
시스템은 `/admin` 라우트 그룹의 모든 페이지와 모든 `admin.*` tRPC 프로시저에 대해 사용자가 `Member.isAdmin === true`(또는 admin 그룹 소속)임을 확인해야 한다.

**REQ-ADMIN-021 (Unwanted)**
시스템은 비관리자 사용자에게 어떤 형태로든 관리자 데이터(회원 목록, 감사 로그, 사이트 설정 등)를 노출하지 않아야 한다.

**REQ-ADMIN-022 (State-Driven)**
IF 관리자 섹션이 권한 그룹으로 제한되어 있다 THEN 사용자가 해당 그룹에 속하지 않으면 좌측 네비게이션에서 해당 항목을 숨기고 직접 URL 접근 시 403을 반환해야 한다.

**REQ-ADMIN-023 (Event-Driven)**
WHEN 사이트 설정에서 `requireAdminTwoFactor=true`이면 THEN 관리자 라우트 진입 시 2FA 검증을 통과한 세션만 허용해야 한다.

### 4. 메뉴 시스템

**REQ-ADMIN-030 (Ubiquitous)**
시스템은 사이트별로 다수의 `Menu`와 각 `Menu`에 트리 구조의 `MenuItem`(parentId 자기 참조)을 가질 수 있어야 한다.

**REQ-ADMIN-031 (Event-Driven)**
WHEN 관리자가 메뉴 빌더에서 항목을 드래그앤드롭으로 이동·재배열할 때 THEN 시스템은 `parentId`와 `listOrder`를 단일 트랜잭션으로 갱신해야 한다.

**REQ-ADMIN-032 (Ubiquitous)**
시스템은 각 `MenuItem`에 노출 권한 그룹(`groupIds: number[]`)을 부여할 수 있어야 하며, 렌더링 시 현재 사용자의 그룹과 교집합이 비어 있으면 해당 항목을 숨겨야 한다.

**REQ-ADMIN-033 (Ubiquitous)**
시스템은 `MenuItem`에 URL, 아이콘, CSS 클래스, 설명, 새 창 여부, 기본 펼침 상태, 정상/호버/활성 상태별 버튼 이미지·텍스트 색상을 저장할 수 있어야 한다.

**REQ-ADMIN-034 (Ubiquitous)**
시스템은 관리자 좌측 네비게이션 메뉴를 일반 사이트 메뉴와 분리된 캐시 키로 캐싱해야 한다.

### 5. 위젯 시스템

**REQ-ADMIN-040 (Ubiquitous)**
시스템은 코드 기반 `WidgetRegistry`를 제공하며, 각 위젯은 `name`, `displayName`, `propsSchema` (Zod), `Component` (React Server Component), `defaultProps`를 등록해야 한다.

**REQ-ADMIN-041 (Event-Driven)**
WHEN 인스턴스 콘텐츠 또는 페이지 콘텐츠 HTML/MDX에 `<rx-widget name="..." props="...JSON..." />` 토큰이 포함되어 있을 때 THEN 렌더러는 해당 위젯을 레지스트리에서 조회하고 props를 검증한 뒤 React 컴포넌트로 치환해야 한다.

**REQ-ADMIN-042 (Unwanted)**
시스템은 검증되지 않은 props 또는 미등록 위젯을 렌더링하지 않으며, 안전한 fallback(예: 빈 placeholder 또는 관리자에게만 보이는 오류 메시지)을 표시해야 한다.

**REQ-ADMIN-043 (Optional)**
가능하면 위젯 인스턴스(`WidgetInstance`)를 DB에 저장하여 재사용 가능한 위젯 프리셋을 만들 수 있어야 한다.

### 6. 사이트 / 도메인 설정

**REQ-ADMIN-050 (Ubiquitous)**
시스템은 도메인 단위로 (a) 기본 언어, (b) 시간대, (c) 기본 레이아웃, (d) 기본 모바일 레이아웃, (e) 기본 메뉴, (f) 인덱스 모듈 인스턴스를 저장하고 적용해야 한다.

**REQ-ADMIN-051 (Ubiquitous)**
시스템은 사이트 단위로 (a) 사이트 이름, (b) 운영자 이메일, (c) SEO 기본 메타(title, description, ogImage), (d) 보안 정책(2FA 강제, 세션 만료), (e) 알림 채널 설정을 저장해야 한다.

**REQ-ADMIN-052 (Event-Driven)**
WHEN 관리자가 사이트 설정을 변경할 때 THEN 시스템은 변경 전/후 값과 변경자 정보를 `AdminLog`에 기록해야 한다.

### 7. 캐시 관리

**REQ-ADMIN-060 (Ubiquitous)**
시스템은 캐시 백엔드 추상화(`CacheAdapter`)를 제공하며, 기본 구현으로 Next.js `unstable_cache` + 선택적 Redis 어댑터를 지원해야 한다.

**REQ-ADMIN-061 (Event-Driven)**
WHEN 모듈 인스턴스 설정·콘텐츠·메뉴·위젯이 변경될 때 THEN 관련 캐시 태그(`module:{id}`, `menu:{id}`, `widget:{name}`, `domain:{id}`)가 무효화되어야 한다.

**REQ-ADMIN-062 (Ubiquitous)**
시스템은 관리자에게 (a) 전체 캐시 비우기, (b) 모듈 단위, (c) 메뉴 단위, (d) 위젯 단위, (e) 도메인 단위 캐시 비우기 액션을 제공해야 한다.

**REQ-ADMIN-063 (Unwanted)**
시스템은 캐시 비우기 액션을 비관리자에게 노출하지 않아야 하며, 모든 캐시 비우기는 감사 로그에 기록되어야 한다.

### 8. 감사 로그

**REQ-ADMIN-070 (Ubiquitous)**
시스템은 모든 관리자 mutation 작업(생성/수정/삭제/구성 변경/권한 변경)에 대해 `AdminLog` 레코드를 작성해야 한다.

**REQ-ADMIN-071 (Ubiquitous)**
`AdminLog`는 actorId, action(`create|update|delete|configure|...`), target(`module:notice`, `menu:1`, `site:settings` 등), diff(JSON), ip, userAgent, createdAt을 포함해야 한다.

**REQ-ADMIN-072 (Event-Driven)**
WHEN 관리자가 감사 로그 화면을 열 때 THEN 시스템은 actor / action / target / 기간 / IP 필터와 페이지네이션, CSV 내보내기를 제공해야 한다.

### 9. 시스템 헬스 대시보드

**REQ-ADMIN-080 (Ubiquitous)**
시스템은 관리자 홈에서 (a) Node.js 버전, (b) DB 연결 상태와 응답 지연, (c) 캐시 백엔드 상태, (d) 큐/스케줄러 상태, (e) 디스크 사용량(가능한 경우), (f) 최근 24시간 에러 수를 표시해야 한다.

**REQ-ADMIN-081 (Ubiquitous)**
시스템은 환경 변수 표시 시 민감 키(이름이 `*_SECRET`, `*_KEY`, `*_PASSWORD`, `*_TOKEN`을 포함)는 자동으로 마스킹해야 한다.

### 10. 일괄 작업 / 가져오기·내보내기

**REQ-ADMIN-090 (Ubiquitous)**
시스템은 회원·차단 목록·모듈 인스턴스 등 표 형태 데이터에 대해 다중 선택 후 일괄 작업(차단/해제/삭제/이동) 액션을 제공해야 한다.

**REQ-ADMIN-091 (Event-Driven)**
WHEN 관리자가 “사이트 설정 내보내기”를 요청할 때 THEN 시스템은 도메인·사이트·메뉴·모듈 인스턴스·기본 권한 설정을 JSON 번들로 다운로드 가능하게 제공해야 한다.

**REQ-ADMIN-092 (Event-Driven)**
WHEN 관리자가 JSON 번들을 업로드해 가져오기를 실행할 때 THEN 시스템은 (a) 스키마 검증, (b) 충돌 항목 미리보기(create/update/skip), (c) dry-run, (d) 최종 적용을 단계별로 제공해야 한다.

**REQ-ADMIN-093 (Unwanted)**
시스템은 가져오기 도중 일부 단계가 실패하면 전체 변경을 롤백해야 한다(부분 적용 금지).

### 11. 즐겨찾기 / 단축키

**REQ-ADMIN-100 (Ubiquitous)**
시스템은 관리자별 `AdminFavorite`(label, href, icon, order) 목록을 사이드바에 표시해야 한다.

**REQ-ADMIN-101 (Event-Driven)**
WHEN 관리자가 즐겨찾기 추가/제거/순서 변경을 수행할 때 THEN 변경은 즉시 저장되고 다음 페이지부터 반영되어야 한다.

---

## Acceptance Criteria

### REQ-ADMIN-002 / 003 (mid 검증)

```gherkin
Given 관리자 세션으로 로그인되어 있고
And 도메인 D에 mid="notice"인 인스턴스가 이미 존재한다
When 관리자가 mid="notice"로 새 인스턴스 생성을 요청하면
Then 시스템은 409 Conflict와 "mid already exists" 메시지를 반환한다
And 새 인스턴스는 생성되지 않는다

Given 관리자 세션으로 로그인되어 있다
When 관리자가 mid="admin" 으로 인스턴스 생성을 요청하면
Then 시스템은 422 Unprocessable Entity와 "reserved mid" 오류를 반환한다

Given 관리자 세션으로 로그인되어 있다
When 관리자가 mid="My Board!" 으로 인스턴스 생성을 요청하면
Then 시스템은 422를 반환하고 패턴 위반 오류를 표시한다
```

### REQ-ADMIN-004 / 005 (라이프사이클)

```gherkin
Given 게시판 모듈이 onInstall에서 기본 카테고리 3개를 생성하도록 정의되어 있다
When 관리자가 새 게시판 인스턴스를 생성한다
Then ModuleInstance, ModuleConfig, 기본 카테고리 3개가 모두 동일 트랜잭션에서 생성된다

Given 게시판 모듈의 onInstall이 실패하도록 모킹되어 있다
When 관리자가 새 게시판 인스턴스를 생성한다
Then 어떤 행도 DB에 남지 않는다
And 사용자는 500 응답과 친화적인 오류 메시지를 본다
```

### REQ-ADMIN-006 (인덱스 모듈 보호)

```gherkin
Given 도메인 D의 indexModuleInstanceId가 인스턴스 X 다
When 관리자가 인스턴스 X 삭제를 요청한다
Then 409가 반환되고 "this instance is the index module of domain D" 오류가 표시된다
```

### REQ-ADMIN-010 ~ 014 (라우팅)

```gherkin
Given 도메인 "community.example.com"이 등록되어 있고 indexModuleInstanceId가 mid="hub" 다
When 사용자가 https://community.example.com/ 에 접속한다
Then 미들웨어는 Domain 레코드를 찾고
And 페이지는 mid="hub" 인스턴스를 인덱스로 렌더링한다

Given 도메인 D에 mid="qna" 인스턴스가 존재한다
When 사용자가 /qna/123 경로로 접속한다
Then [mid] 라우트가 mid="qna"를 활성화하고
And 게시판 모듈의 단일글 라우트 핸들러가 articleId=123으로 호출된다

Given 도메인 D의 forceHttps=true 다
When 사용자가 http://D/path 로 접속한다
Then 응답은 301과 https://D/path 로의 리다이렉트다
```

### REQ-ADMIN-020 ~ 023 (관리자 가드)

```gherkin
Given 비관리자 사용자가 로그인되어 있다
When 사용자가 /admin 에 GET 한다
Then 응답은 403 또는 비관리자용 안내 페이지다

Given 비관리자 사용자가 admin.user.list tRPC를 호출한다
Then 호출은 UNAUTHORIZED로 거부된다

Given 사이트 설정 requireAdminTwoFactor=true 이고
And 관리자가 2FA 를 통과하지 않은 세션이다
When 관리자가 /admin 에 접속한다
Then 시스템은 2FA 검증 페이지로 리다이렉트한다
```

### REQ-ADMIN-031 (메뉴 드래그앤드롭)

```gherkin
Given 메뉴 M에 항목 A, B, C가 listOrder 1, 2, 3로 존재한다
When 관리자가 C를 A 앞으로 드래그한다
Then 단일 트랜잭션에서 listOrder가 (C=1, A=2, B=3)로 갱신된다
And 메뉴 캐시 태그 menu:M 이 무효화된다
```

### REQ-ADMIN-040 ~ 042 (위젯)

```gherkin
Given 위젯 레지스트리에 "latestPosts" 위젯이 등록되어 있고 propsSchema가 limit:number 를 요구한다
And 어떤 인스턴스 콘텐츠에 <rx-widget name="latestPosts" props='{"limit":5}' /> 가 포함되어 있다
When 페이지가 렌더링된다
Then "latestPosts" 위젯이 limit=5로 React Server Component로 렌더링된다

Given 콘텐츠에 <rx-widget name="latestPosts" props='{"limit":"oops"}' /> 가 포함되어 있다
When 페이지가 렌더링된다
Then 위젯은 안전한 fallback (관리자에게는 검증 오류, 일반 사용자에게는 빈 출력)으로 치환된다
```

### REQ-ADMIN-061 / 062 (캐시 무효화)

```gherkin
Given 관리자가 모듈 인스턴스 X의 설정을 수정한다
Then 캐시 태그 module:X 가 무효화된다
And 다음 요청은 새 설정을 반영한다

Given 관리자가 "전체 캐시 비우기" 액션을 실행한다
Then 모든 module:*, menu:*, widget:*, domain:* 태그가 무효화된다
And AdminLog에 action="cache.purge.all" 레코드가 생성된다
```

### REQ-ADMIN-070 ~ 072 (감사 로그)

```gherkin
Given 관리자 A가 사이트 이름을 "Old"에서 "New"로 변경한다
Then AdminLog 레코드가 actor=A, action="update", target="site:settings", diff={ name: ["Old","New"] } 로 기록된다
And 레코드는 IP와 User-Agent를 포함한다
```

### REQ-ADMIN-091 ~ 093 (가져오기/내보내기)

```gherkin
Given 관리자가 "내보내기"를 클릭한다
Then 응답은 도메인·사이트·메뉴·모듈 인스턴스 트리를 포함한 JSON 파일이다

Given 관리자가 가져오기 dry-run을 실행한다
Then 시스템은 create/update/skip 카운트와 항목 목록을 반환한다
And DB는 변경되지 않는다

Given 가져오기의 7번째 항목이 실패한다
Then 1~6번째 항목도 모두 롤백되어 DB는 가져오기 전 상태와 동일하다
```

---

## Domain Model

### Prisma Schema (PostgreSQL + citext)

다음 스키마는 본 SPEC이 정의하는 핵심 엔터티와 관계만을 포함한다. 회원/세션은 SPEC-AUTH-001, 콘텐츠는 SPEC-CONTENT-001에서 확장된다.

```prisma
// citext extension required:
// CREATE EXTENSION IF NOT EXISTS citext;

model Site {
  id                Int       @id @default(autoincrement())
  name              String
  defaultLanguage   String    @default("en")
  defaultTimezone   String    @default("UTC")
  contactEmail      String?
  settings          Json      @default("{}") // SiteSetting (Zod-validated)
  domains           Domain[]
  menus             Menu[]
  moduleInstances   ModuleInstance[]
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@map("sites")
}

model Domain {
  id                       Int      @id @default(autoincrement())
  siteId                   Int
  site                     Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  hostname                 String   @db.Citext
  isDefault                Boolean  @default(false)
  forceHttps               Boolean  @default(true)
  httpPort                 Int      @default(80)
  httpsPort                Int      @default(443)
  defaultLanguage          String?
  defaultTimezone          String?
  defaultLayoutId          Int?
  defaultMobileLayoutId    Int?
  defaultMenuId            Int?
  indexModuleInstanceId    Int?
  indexModuleInstance      ModuleInstance? @relation("IndexModule", fields: [indexModuleInstanceId], references: [id])
  settings                 Json     @default("{}") // language, timezone overrides, robots, csp, etc.
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@unique([hostname])
  @@index([siteId])
  @@map("domains")
}

model ModuleInstance {
  id                Int       @id @default(autoincrement())
  siteId            Int
  site              Site      @relation(fields: [siteId], references: [id], onDelete: Cascade)
  moduleCode        String    // e.g. "board", "wiki", "shop"
  mid               String    @db.Citext
  name              String
  browserTitle      String?
  description       String?
  layoutId          Int?
  mobileLayoutId    Int?
  skin              String?
  mobileSkin        String?
  menuId            Int?
  isDefault         Boolean   @default(false)
  rssEnabled        Boolean   @default(false)
  rssTitle          String?
  rssDescription    String?
  config            ModuleConfig?
  domainsAsIndex    Domain[]  @relation("IndexModule")
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@unique([siteId, mid])
  @@index([moduleCode])
  @@map("module_instances")
}

model ModuleConfig {
  id                Int            @id @default(autoincrement())
  moduleInstanceId  Int            @unique
  moduleInstance    ModuleInstance @relation(fields: [moduleInstanceId], references: [id], onDelete: Cascade)
  config            Json           @default("{}") // validated by ModuleDefinition.configSchema (Zod)
  updatedAt         DateTime       @updatedAt

  @@map("module_configs")
}

model Menu {
  id          Int        @id @default(autoincrement())
  siteId      Int
  site        Site       @relation(fields: [siteId], references: [id], onDelete: Cascade)
  title       String
  isAdminMenu Boolean    @default(false)
  listOrder   Int        @default(0)
  items       MenuItem[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([siteId])
  @@map("menus")
}

model MenuItem {
  id              Int        @id @default(autoincrement())
  menuId          Int
  menu            Menu       @relation(fields: [menuId], references: [id], onDelete: Cascade)
  parentId        Int?
  parent          MenuItem?  @relation("MenuItemTree", fields: [parentId], references: [id], onDelete: Cascade)
  children        MenuItem[] @relation("MenuItemTree")
  title           String
  url             String?
  icon            String?
  cssClass        String?
  description     String?
  groupIds        Int[]      @default([])
  openInNewWindow Boolean    @default(false)
  expand          Boolean    @default(false)
  listOrder       Int        @default(0)
  // button states
  normalBtn       Json?      // { image, textColor }
  hoverBtn        Json?
  activeBtn       Json?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@index([menuId, parentId, listOrder])
  @@map("menu_items")
}

model Widget {
  id           Int      @id @default(autoincrement())
  name         String   @unique // matches WidgetDefinition.name
  displayName  String
  description  String?
  category     String?
  enabled      Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  instances    WidgetInstance[]

  @@map("widgets")
}

model WidgetInstance {
  id         Int      @id @default(autoincrement())
  widgetId   Int
  widget     Widget   @relation(fields: [widgetId], references: [id], onDelete: Cascade)
  label      String
  props      Json     @default("{}")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("widget_instances")
}

model AdminLog {
  id         BigInt   @id @default(autoincrement())
  actorId    Int
  action     String   // "create" | "update" | "delete" | "configure" | "cache.purge.all" | ...
  target     String   // "module:notice" | "menu:1" | "site:settings"
  diff       Json     @default("{}")
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([actorId, createdAt])
  @@index([target, createdAt])
  @@index([action, createdAt])
  @@map("admin_logs")
}

model AdminFavorite {
  id         Int      @id @default(autoincrement())
  memberId   Int      // -> Member (SPEC-AUTH-001)
  label      String
  href       String
  icon       String?
  listOrder  Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([memberId, listOrder])
  @@map("admin_favorites")
}

model SiteSetting {
  // Reserved: settings stored as Site.settings JSON or as key-value table.
  // Using a key-value form lets us version individual keys.
  id        Int      @id @default(autoincrement())
  siteId    Int
  key       String
  value     Json
  updatedAt DateTime @updatedAt

  @@unique([siteId, key])
  @@map("site_settings")
}
```

### 키 설계 노트

- `mid`, `hostname`은 `citext`로 대소문자 무시 유니크 제약을 보장한다.
- `ModuleInstance.config`는 Prisma 모델 `ModuleConfig`에 분리해 인스턴스 코어 필드와 변형 가능 설정을 분리한다.
- `MenuItem.parentId`는 자기 참조 트리이며, 정렬은 `(menuId, parentId, listOrder)` 인덱스로 가속.
- `AdminLog.id`는 BigInt(누적량 대비) + actor/target/action별 인덱스.
- 회원·세션·권한 그룹 모델은 SPEC-AUTH-001에서 정의되며 본 SPEC은 `memberId`/`groupIds` 정수 참조만 사용한다.

---

## API Surface (tRPC)

모든 admin 라우터는 `protectedAdminProcedure` 미들웨어를 통과해야 한다(인증 + isAdmin + 그룹/2FA 체크 + 감사 로그 미들웨어).

```ts
// server/api/root.ts
export const appRouter = router({
  admin: router({
    site:   adminSiteRouter,
    module: adminModuleRouter,
    menu:   adminMenuRouter,
    widget: adminWidgetRouter,
    user:   adminUserRouter,
    system: adminSystemRouter,
    log:    adminLogRouter,
    favorite: adminFavoriteRouter,
  }),
});
```

### admin.site

- `site.get(siteId)` → `Site`
- `site.update(siteId, patch: Partial<SiteSettings>)` → `Site`
- `site.listDomains(siteId)` → `Domain[]`
- `site.createDomain(input: CreateDomainInput)` → `Domain`
- `site.updateDomain(domainId, patch)` → `Domain`
- `site.deleteDomain(domainId)`
- `site.export(siteId)` → `SiteBundle (JSON)`
- `site.importDryRun(bundle)` → `ImportPlan`
- `site.importApply(bundle)` → `ImportResult`

### admin.module

- `module.list({ siteId, moduleCode?, q? })` → `ModuleInstance[]`
- `module.get(instanceId)` → `ModuleInstance & { config }`
- `module.create(input: { siteId, moduleCode, mid, name, ... })` → `ModuleInstance`
  - 서버 측에서 `validateMid` + `ModuleDefinition.onInstall` 트랜잭션 수행.
- `module.update(instanceId, patch)` → `ModuleInstance`
- `module.updateConfig(instanceId, config: unknown)` → `ModuleConfig`
  - `ModuleDefinition.configSchema.parse`로 검증.
- `module.delete(instanceId)`
- `module.setAsDomainIndex(domainId, instanceId)`

### admin.menu

- `menu.list(siteId)` / `menu.get(menuId)` / `menu.create` / `menu.update` / `menu.delete`
- `menu.items.tree(menuId)` → 트리 구조 반환
- `menu.items.upsert(item)`
- `menu.items.reorder({ menuId, ops: ReorderOp[] })`  // 드래그앤드롭 단일 트랜잭션

### admin.widget

- `widget.listRegistry()` → 코드에 등록된 모든 위젯 정의 (DB 미저장 항목 포함)
- `widget.list()` / `widget.toggle(name, enabled)`
- `widget.instance.list/create/update/delete`

### admin.user

- `user.list({ q, group?, status?, page })`
- `user.get(memberId)` / `user.update(memberId, patch)`
- `user.bulk({ ids, action: "block" | "unblock" | "delete" | "addToGroup" | ... })`
- `user.group.list/create/update/delete`
- `user.deniedList.list/add/remove`  // IP/이메일/닉네임

### admin.system

- `system.health()` → `{ node, db, cache, queue, errors24h, disk? }`
- `system.env()` → 마스킹된 환경 변수 키 목록
- `system.cache.purge({ scope: "all" | "module" | "menu" | "widget" | "domain", id? })`
- `system.queue.status()` / `system.queue.retry(jobId)`
- `system.scheduler.list()` / `system.scheduler.runNow(jobName)`

### admin.log

- `log.list({ actorId?, action?, target?, from?, to?, ip?, page })`
- `log.export(filter)` → CSV stream

### admin.favorite

- `favorite.list()` / `favorite.upsert(item)` / `favorite.reorder(ids)` / `favorite.remove(id)`

### 가드 미들웨어

```ts
export const protectedAdminProcedure = publicProcedure
  .use(requireSession)
  .use(requireAdmin)              // member.isAdmin || in admin group
  .use(requireAdmin2FAIfEnabled)  // SiteSetting.requireAdminTwoFactor
  .use(auditLogger);              // mutation 시 AdminLog 기록
```

---

## Module Plugin Architecture

### ModuleDefinition 인터페이스

각 모듈 코드(`board`, `wiki`, `shop`, …)는 한 번씩 정적으로 등록된다. 새 모듈을 추가하려면 이 인터페이스를 구현하고 `registerModule(definition)` 을 호출하면 된다.

```ts
// core/modules/types.ts
import type { z } from "zod";
import type { ReactNode } from "react";

export interface ModuleDefinition<TConfig = unknown> {
  /** "board", "wiki", "shop" — globally unique */
  code: string;

  /** Human-readable name for admin UI */
  displayName: string;

  /** Short description shown when admin picks a module type */
  description?: string;

  /** Zod schema for ModuleConfig.config; used on every config update */
  configSchema: z.ZodType<TConfig>;

  /** Default config used on instance creation */
  defaultConfig: TConfig;

  /** Default permissions for new instances */
  defaultPermissions?: ModulePermissionPreset;

  /** Lifecycle hooks (run inside DB transaction) */
  onInstall?:    (ctx: ModuleLifecycleContext) => Promise<void>;
  onUninstall?:  (ctx: ModuleLifecycleContext) => Promise<void>;
  onConfigure?:  (ctx: ModuleLifecycleContext, prev: TConfig, next: TConfig) => Promise<void>;

  /** Public route handlers mounted under /[mid]/... */
  routes: ModuleRouteMap;

  /** Admin pages contributed under /admin/modules/{code}/{instanceId}/... */
  adminPages?: ModuleAdminPage[];

  /** Cache tags this module reads from / writes to */
  cacheTags?: (instanceId: number) => string[];
}

export interface ModuleLifecycleContext {
  tx: PrismaTransactionClient;
  instance: ModuleInstance;
  actor: { memberId: number; ip?: string; userAgent?: string };
}

export interface ModuleRouteMap {
  /** GET /[mid]            */ index?:   RouteHandler;
  /** GET /[mid]/[...slug]  */ catchAll?: RouteHandler;
  /** Server Actions / api  */ actions?:  Record<string, ServerAction>;
}

export interface ModuleAdminPage {
  /** Sub-path under /admin/modules/{code}/{instanceId}/ */
  path: string;
  label: string;
  /** Required group ids (all-of) */
  requiredGroups?: number[];
  Component: () => ReactNode;
}
```

### 등록과 발견

```ts
// core/modules/registry.ts
const REGISTRY = new Map<string, ModuleDefinition>();

export function registerModule(def: ModuleDefinition) {
  if (REGISTRY.has(def.code)) throw new Error(`module ${def.code} already registered`);
  REGISTRY.set(def.code, def);
}

export function getModule(code: string) {
  const def = REGISTRY.get(code);
  if (!def) throw new Error(`unknown module: ${code}`);
  return def;
}

export function listModules() {
  return [...REGISTRY.values()];
}
```

새 모듈을 추가하려면 다음을 만족하면 된다.

1. 정적 import 시 `registerModule` 호출.
2. `configSchema` Zod 정의.
3. 라우트 핸들러 구현(필요 시).
4. (선택) 관리자 하위 페이지 컴포넌트 제공.

코어는 `module_instances` 와 `module_configs` 만 알면 되며, 모듈별 도메인 테이블(예: 게시판 글)은 해당 SPEC 에서 자체적으로 정의한다.

### 위젯 레지스트리

```ts
export interface WidgetDefinition<TProps = unknown> {
  name: string;            // "latestPosts"
  displayName: string;
  category?: string;
  propsSchema: z.ZodType<TProps>;
  defaultProps: TProps;
  /** React Server Component */
  Component: (props: TProps & WidgetContext) => Promise<JSX.Element> | JSX.Element;
}

export interface WidgetContext {
  domain: Domain;
  site: Site;
  currentInstance?: ModuleInstance;
  locale: string;
}
```

---

## Routing Strategy

### 디렉터리 구조

```
app/
  layout.tsx                       // root <html>/<body>
  page.tsx                         // index module of resolved domain
  middleware.ts (root level)       // domain resolution, https enforcement
  (admin)/
    layout.tsx                     // admin shell (sidebar, topbar, favorites)
    page.tsx                       // dashboard (system health)
    design/...
    system/...
    users/...
    modules/
      page.tsx                     // module instance list
      [code]/
        [instanceId]/
          page.tsx                 // module-defined admin pages
    logs/page.tsx
    favorites/page.tsx
  api/
    trpc/[trpc]/route.ts
  [mid]/
    page.tsx                       // module index (delegates to ModuleDefinition.routes.index)
    [...slug]/page.tsx             // module catch-all
```

### Middleware: Domain Resolution

```ts
// middleware.ts
export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const domain = await resolveDomain(host); // cached lookup by hostname
  if (!domain) {
    if (DEFAULT_DOMAIN_FALLBACK) return NextResponse.rewrite(rewriteToDefault(req));
    return new NextResponse("Unknown host", { status: 404 });
  }
  if (domain.forceHttps && req.nextUrl.protocol === "http:") {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }
  const res = NextResponse.next();
  res.headers.set("x-domain-id", String(domain.id));
  res.headers.set("x-site-id",   String(domain.siteId));
  res.headers.set("x-language",  domain.defaultLanguage ?? domain.site.defaultLanguage);
  return res;
}

export const config = {
  matcher: [
    // exclude static, _next, public assets
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets/).*)",
  ],
};
```

### `[mid]` 동적 세그먼트

```tsx
// app/[mid]/page.tsx
export default async function MidIndex({ params }: { params: Promise<{ mid: string }> }) {
  const { mid } = await params;
  const ctx = await getRouteContext();             // domain, site, locale
  const instance = await findInstanceByMid(ctx.domain.siteId, mid);
  if (!instance) notFound();
  const def = getModule(instance.moduleCode);
  const handler = def.routes.index;
  if (!handler) notFound();
  return handler({ instance, ctx });
}
```

루트(`/`)는 `ctx.domain.indexModuleInstanceId`를 조회해 동일한 핸들러를 호출한다.

### Admin Route Group

`(admin)` 그룹은 별도 레이아웃·로딩·에러 바운더리를 가지며, layout 단계에서 `requireAdminSession` 을 수행한다. 모듈이 기여한 admin 페이지는 `app/(admin)/modules/[code]/[instanceId]/[...path]/page.tsx`에서 `ModuleDefinition.adminPages`를 매칭해 동적 렌더링한다.

---

## Reference: Rhymix v2.1.32 Admin UX (Verified Live 2026-05-10)

A clean install of Rhymix v2.1.32 at `localhost:8080` was inspected to
validate the IA below. Rhymix-TS preserves the high-level structure and
modernizes the implementation.

### Sidebar IA (Authoritative)

```
대시보드            Dashboard            /admin
사이트 제작/편집   Site / Design         /admin/site
  ├─ 사이트 메뉴 편집   Menu Editor       /admin/site/menu
  └─ 사이트 디자인 설정 Theme & Layout   /admin/site/design
회원                Members              /admin/members
  ├─ 회원 목록      User list            /admin/members
  ├─ 회원 설정      Member settings      /admin/members/settings
  ├─ 회원 그룹      Groups               /admin/members/groups
  └─ 포인트         Points (deferred)
콘텐츠              Content              /admin/content
  ├─ 게시판         Board instances      /admin/content/boards
  ├─ 페이지         Pages                /admin/content/pages
  ├─ 문서           Documents            /admin/content/documents
  ├─ 댓글           Comments             /admin/content/comments
  ├─ 파일           Files                /admin/content/files
  ├─ 설문           Polls (deferred)
  ├─ 에디터         Editor settings      /admin/content/editor
  ├─ 스팸필터       Spam filter          /admin/content/spam
  └─ 휴지통         Trash                /admin/content/trash
즐겨찾기            Favorites            /admin/favorites
설정                System settings      /admin/settings
고급                Advanced             /admin/advanced
```

Items marked "(deferred)" are out-of-scope for v0.1 and tracked as future
SPECs.

### Dashboard Widgets

Three core widgets render as React Server Components on `/admin`:

1. **MembersWidget** — total count + recent signups list, links to profile
2. **RecentDocumentsWidget** — recent posts across all boards with author
3. **RecentCommentsWidget** — recent comments with empty-state copy

Each widget MUST render a skeleton during data fetch and degrade to an
empty-state on data source error (mirrors Rhymix's "등록된 데이터가
없습니다." pattern).

### Footer Maintenance Actions

Rhymix exposes quick maintenance actions in the admin footer; Rhymix-TS
mirrors them as tRPC `admin.system.*` procedures:

- Reset admin menu cache (`admin.system.resetMenuCache`)
- Regenerate cache files (`admin.system.regenerateCache`)
- Cleanup sessions (`admin.system.cleanupSessions`)
- Cleanup core files (`admin.system.cleanupCoreFiles`)
- Show server environment (`admin.system.serverEnv`)
- Bug report (external link to GitHub issues)

The footer also renders `Powered by Rhymix-TS {version}`.

### Board Admin Table Columns (Reference)

The board management table at `/admin/content/boards` mirrors Rhymix
columns:

| 번호 | 모듈 분류 | 도메인/URL | 브라우저 제목 | 특이사항 | 등록일 | 편집 |
|---|---|---|---|---|---|---|
| ID | Module type tag | `/{mid}` | browser_title | flags | created | ⚙ Settings + Copy + Delete |

Bulk-select checkboxes plus a "선택한 게시판 관리" action bar are present in
the upper-right.

### Three-Pane Design Editor (`/admin/site/design`)

Rhymix's most distinctive pattern is the three-pane editor:

```
┌────────────────────────┬────────────────────────┬────────────────────────┐
│ Pane 1                 │ Pane 2                 │ Pane 3                 │
│ Site Design Settings   │ Layouts / Skins        │ Settings (Theme Vars)  │
├────────────────────────┼────────────────────────┼────────────────────────┤
│ Tabs: PC | Mobile      │ List of available      │ Selected theme's       │
│ Tree of currently      │ layouts/skins.         │ - meta (path, author)  │
│ assigned components:   │ Each item has actions: │ - title (required)     │
│   • 레이아웃           │   - Detailed settings  │ - header script        │
│   • 문서 페이지         │   - Make a copy        │ - dynamic extra_vars   │
│   • 게시판             │   - Delete             │   form (Zod schema)    │
│   • 회원                │ Selected highlight.    │                        │
│ [PC Settings Save]     │                        │ Inner tabs by section: │
│                        │                        │ Basic | Slide | etc.   │
└────────────────────────┴────────────────────────┴────────────────────────┘
```

Acceptance:

- Pane 1 selection updates Pane 2 (master/detail).
- Pane 2 selection updates Pane 3.
- Pane 3 form auto-renders from the theme manifest's `tokens` Zod schema
  (see SPEC-THEME-001).
- All changes are previewed first; "Save" persists via tRPC mutation with
  optimistic update.

### Module Instance Auto-Provisioning at Install

When `procInstall` (SPEC-INSTALL-001) completes, the system MUST seed:

- 1 `Site` row
- 1 `Domain` row pointing to the request hostname
- 3 `ModuleInstance` rows: `notice`, `qna`, `board` (all of module type
  `board`) with `browser_title` "Notice", "Q&A", "Free Board"
- 4 default theme assignments (layout/page-skin/board-skin/member-skin)
- 4 default menu items (Welcome page + 3 board links)
- 2 default `MemberGroup` rows: `admin` (is_admin=true), `member`
  (is_default=true)

This produces the same first-run experience as Rhymix: an admin can log in
and immediately see populated dashboard widgets and a working public site.

---

## Out of Scope

본 SPEC은 **기반 골격**만을 정의한다. 다음 항목은 별도 SPEC 또는 차기 버전에서 다룬다.

- 외부 마켓플레이스에서 모듈 패키지를 다운로드/업로드해 자동 설치하는 **플러그인 마켓플레이스**.
- 운영 중인 인스턴스를 무중단으로 자동 업데이트하는 **자동 업데이트/마이그레이션 시스템**.
- 인증/세션/권한 그룹 구체 구현 → SPEC-AUTH-001.
- 게시판/댓글/첨부/태그 → SPEC-CONTENT-001.
- 레이아웃 엔진, 스킨 컴파일, 위젯 디자인 에디터 → SPEC-THEME-001.
- 결제/쇼핑몰, 위키, 메신저 등 도메인 모듈 → 각 모듈 SPEC.
- 다국어 콘텐츠 번역 워크플로(번역자 협업) → SPEC-I18N-XXX (미정).
- A/B 테스트 / 피처 플래그 시스템.

---

## Open Questions

1. **캐시 백엔드 선택**
   - Next.js `unstable_cache`만으로 충분한가, 아니면 멀티 인스턴스 배포를 전제로 Redis(또는 Upstash) 어댑터를 1차부터 표준으로 채택할 것인가?
   - 무효화 채널: Redis Pub/Sub vs PostgreSQL `LISTEN/NOTIFY` (이미 PG가 있다는 점은 후자에 유리).

2. **감사 로그 보존 정책**
   - `AdminLog` 의 보존 기간(예: 1년) 및 아카이빙(콜드 스토리지/CSV 덤프) 정책을 어떻게 가져갈지.
   - 다이어트 실패/대용량 시 파티셔닝 또는 BigInt PK 외 별도 시계열 테이블이 필요한지.

3. **관리자 UI 다국어**
   - 관리자 대시보드 자체를 i18n으로 제공할지(영/한 동시 지원), 아니면 1차 릴리스는 영어만 지원할지.
   - i18n 라이브러리 선택(Next.js 내장 vs `next-intl`).

4. **모듈 정의 발견 시점**
   - 모든 모듈을 정적 import로 부트스트랩에서 등록할지, 또는 `app/modules/*/register.ts` 자동 발견 패턴을 둘지.
   - HMR 환경에서 중복 등록 방지 메커니즘.

5. **위젯 보안 모델**
   - `<rx-widget>` 토큰 파싱 시 props JSON 크기/깊이 제한.
   - 사용자가 작성한 콘텐츠에 위젯 임베드를 어디까지 허용할지(관리자만 vs 신뢰 그룹).

6. **도메인-사이트 다대일 정책**
   - 한 사이트가 여러 도메인을 가질 수 있다는 점은 명확하나, 도메인이 사이트를 옮겨갈 수 있게 할지 여부 및 그때의 콘텐츠 이전 시나리오.

7. **2FA 강제 정책**
   - 시스템 전체 강제 vs 그룹 단위 강제 vs 사용자 옵트인의 디폴트.

---

## Dependencies & Risks

### 의존성

본 SPEC은 다른 SPEC의 의존이 가장 적은 최하위 기반이다. 외부 의존은 다음과 같다.

- **인프라**: PostgreSQL 15+ (citext 확장 필수), 선택적 Redis.
- **런타임**: Node.js 20+ (Next.js 16 요구사항), Edge 호환성을 위해 Prisma는 RSC + Node 런타임에서만 사용.
- **라이브러리**: Next.js 16, React 19, TypeScript 5.9+, Prisma 6+, Zod 3, tRPC 11, NextAuth/Auth.js v5(인증은 SPEC-AUTH-001에서 사용).

### 다운스트림(본 SPEC을 기반으로 하는 SPEC)

- SPEC-AUTH-001: `Member`, `Group`, `Session`을 도입하고 본 SPEC의 `groupIds`/`memberId` 참조를 의미 있게 만든다.
- SPEC-CONTENT-001: `board` 모듈을 `ModuleDefinition`으로 등록하고 `mid` 라우팅을 통해 다중 인스턴스 게시판을 제공한다.
- SPEC-THEME-001: `Layout`, `Skin`, 위젯 디자인 에디터를 도입하고 본 SPEC의 `layoutId`, `skin`, 위젯 레지스트리를 채운다.

### 리스크 및 완화

| 리스크 | 영향 | 완화 |
| --- | --- | --- |
| `mid`와 정적 라우트(`/admin`, `/api`, `/_next`) 충돌 | 사용자 페이지가 관리자 라우트를 가림 | 예약어 화이트리스트 + 라우트 최우선 등록 + 정적 분석 테스트 |
| 멀티 도메인 미들웨어 캐시 미스 | 모든 요청이 DB 조회 → 지연 | 도메인 메타를 메모리/Redis 1차 캐시 + LISTEN/NOTIFY 무효화 |
| 모듈 라이프사이클 훅 실패 시 부분 적용 | 데이터 무결성 손상 | 훅을 단일 Prisma 트랜잭션 내에서 실행, 실패 시 롤백 의무화 |
| 관리자 UI 권한 누수 | 비관리자에게 민감 데이터 노출 | 라우터/UI 양쪽에서 가드, e2e 테스트로 역할 매트릭스 검증 |
| 위젯 임베드를 통한 XSS/SSRF | 보안 사고 | 위젯 props Zod 검증, 콘텐츠 sanitization, fetch 화이트리스트 |
| 감사 로그 폭증 | 스토리지/조회 성능 저하 | 인덱스 설계 + 보존 정책 + 월별 파티셔닝 검토 |
| 캐시 무효화 누락 | 갱신이 반영되지 않음 | 캐시 태그 표준화, 모든 mutation 경로에서 명시적 `revalidateTag` |
| Edge runtime에서 Prisma 미지원 | 미들웨어에서 직접 DB 조회 불가 | 도메인 해석은 Edge KV(또는 메모리 LRU + 주기적 동기화) + Node 런타임 라우트에서 정확한 데이터 |

### 마일스톤(우선순위 기반)

본 SPEC은 시간 추정 없이 우선순위 기반 마일스톤으로 진행한다. (자세한 일정/의존 그래프는 `plan.md` 참조)

- **Primary Goal**: Site/Domain/ModuleInstance/ModuleConfig + 미들웨어 도메인 해석 + `[mid]` 라우팅 + 관리자 가드.
- **Secondary Goal**: Menu/MenuItem + Admin Shell + AdminLog + 캐시 무효화 표준.
- **Final Goal**: Widget Registry + 즐겨찾기 + 시스템 헬스 대시보드 + 가져오기/내보내기.
- **Optional Goal**: Redis 캐시 어댑터, 관리자 UI 다국어, 감사 로그 파티셔닝.
