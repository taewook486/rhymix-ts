# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

#### SPEC-POINT-001 — 포인트 시스템 독립 패키지 + 크로스 모듈 통합

- **`@rhymix-ts/point` 신규 패키지** (`packages/point/`)
  - `PointService` 클래스: `add`, `subtract`, `getBalance`, `getHistory`, `recompute`, `getLevel` API
  - `pointHooks` 헬퍼: `onDocumentCreated`, `onCommentCreated`, `onVoteCast`, `onMemberSignedUp`
  - `getSitePointConfig` / `setSitePointConfig`: 사이트 포인트 설정 CRUD (singleton `SitePointConfig` 테이블)
  - 커스텀 에러 클래스: `PointAmountInvalidError`, `PointMemberNotFoundError`, `PointInsufficientError`, `PointDuplicateSourceError`
  - Zod 스키마: `PointSiteConfigSchema`, `PointAddInputSchema`, `PointHistoryQuerySchema`
  - 테스트: 24/24 passing (`service.test.ts`, `hooks.test.ts`, `config.test.ts`, `recompute.test.ts`)

- **DB 마이그레이션**
  - `20260613000001_add_point_system`: `Point` 모델, `SitePointConfig` 모델, `PointSourceType` enum, `User.pointBalance` 캐시 컬럼 추가
  - `20260613000002_add_board_point_columns`: `Board` 모델에 포인트 정책 컬럼 6개 추가 (`pointPerDocument`, `pointPerComment`, `pointPerVoteUp`, `pointPerVoteDown`, `pointPerDownload`, `pointPerFileUpload`)

- **크로스 모듈 통합** (트랜잭션 원자성 보장)
  - `packages/document`: `createDocument` 트랜잭션 안에 `pointHooks.onDocumentCreated` 통합
  - `packages/comment`: `createComment` 트랜잭션 안에 `pointHooks.onCommentCreated` 통합
  - `packages/auth`: 회원가입 완료 후 `pointHooks.onMemberSignedUp` fire-and-forget 통합

- **관리자 UI** (`apps/web`)
  - `admin/members/[id]/points/`: 회원별 포인트 이력 조회 + 수동 조정 (`PointSourceType.MANUAL`)
  - `admin/site/points/`: 사이트 포인트 정책 설정 (가입 보너스, clamp 정책)
  - `admin/api/points/adjust/route.ts`: 관리자 수동 조정 API (RBAC: `isAdmin` 검증)
  - `admin/api/site/points/config/route.ts`: 사이트 포인트 설정 API

### Implementation Notes

- `SitePointConfig`는 SPEC에서 계획된 `ModuleConfig` 재사용 대신 독립 테이블로 구현됨.
  실제 스키마에서 `moduleInstanceId`가 NOT NULL 제약으로 인해 사이트 전역 저장이 불가능했기 때문.
  기능 요구사항(REQ-POINT-006)은 완전히 충족됨.
- 포인트 이벤트 이중화 (`point.changed` 이벤트 버스)는 Phase 4 SPEC-ADDON-001에서 구독자 측 구현 예정.
  현재는 직접 주입(Direct Injection) 패턴으로 트랜잭션 원자성 보장.
