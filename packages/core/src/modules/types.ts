/**
 * types.ts — SPEC-ADMIN-001 Slice A / SPEC-CONTENT-001 Slice A
 *
 * 모듈 시스템 핵심 타입 정의.
 * ModuleDefinition 은 "board", "wiki", "shop" 같은 모듈 타입을 등록할 때 사용하는 인터페이스.
 */

import type { z } from 'zod';
import type { Prisma, PrismaClient, ModuleInstance, ModuleConfig } from '@prisma/client';
import type { ReactNode } from 'react';

// Prisma.TransactionClient 타입 재사용
export type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * 모듈 라이프사이클 훅에 전달되는 컨텍스트.
 * tx: 현재 트랜잭션 클라이언트 — onInstall/onUninstall 안에서 prisma 조작 시 이 클라이언트 사용.
 *
 * 주의: tx 안에서만 prisma 호출할 것.
 * 외부 I/O (파일 시스템, fetch 등) 는 onInstall 의 책임이 아님 — 별도 hook 후 처리.
 */
export interface ModuleLifecycleContext {
  tx: PrismaTransactionClient;
  instance: ModuleInstance;
  actor: { memberId: number; ip?: string; userAgent?: string };
}

/**
 * 모듈 라우트 핸들러의 props 타입.
 * SPEC-CONTENT-001 Slice A: Next.js 16 App Router Server Component 시그니처와 호환.
 *
 * @MX:NOTE [AUTO]: Slice B 에서 actions 타입 구체화 예정. index/catchAll 시그니처 변경 주의.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-001
 */
export interface ModuleRoutePageProps {
  instance: ModuleInstance & { config: ModuleConfig | null };
  /** Next.js dynamic route params (mid 외 추가 파라미터) */
  params: Record<string, string>;
  /** URL query string parameters */
  searchParams: Record<string, string | string[] | undefined>;
  /** Prisma 클라이언트 — apps/web 레이어에서 주입. packages/board 등 도메인 패키지가 직접 import 하지 않도록 props 경유. */
  prisma: PrismaClient;
}

/**
 * 모듈 라우트 인덱스 핸들러 타입.
 * Next.js 16 App Router Server Component 와 동일한 시그니처.
 */
export type ModuleRouteIndex = (props: ModuleRoutePageProps) => Promise<ReactNode> | ReactNode;

/**
 * 모듈별 라우트 핸들러 맵.
 * Slice A 에서는 index placeholder — Slice B 에서 실제 게시판 목록 렌더러로 교체.
 */
export interface ModuleRouteMap {
  /** GET /[mid] — 모듈 인스턴스의 인덱스 페이지 */
  index?: ModuleRouteIndex;
  /** GET /[mid]/write — 새 문서 작성 페이지 (Slice B) */
  write?: ModuleRouteIndex;
  /** GET /[mid]/[id] — 문서 상세 보기 페이지 */
  view?: ModuleRouteIndex;
  /** GET /[mid]/[id]/edit — 문서 수정 페이지 */
  edit?: ModuleRouteIndex;
  /** GET /[mid]/[...slug] — 모듈 내부 라우트 */
  catchAll?: ModuleRouteIndex;
  /** Server Actions / api endpoints (Slice B+ 에서 별도 타입화) */
  actions?: Record<string, unknown>;
}

/**
 * 관리자 하위 페이지 정의 (Slice A 에서는 타입만, 실제 사용은 Slice B+)
 */
export interface ModuleAdminPage {
  path: string;
  label: string;
  requiredGroups?: number[];
  Component: unknown;
}

/**
 * 모듈 정의 인터페이스.
 * 새 모듈 타입을 추가하려면 이 인터페이스를 구현하고 registerModule(definition) 을 호출.
 *
 * @MX:ANCHOR: ModuleDefinition 인터페이스 계약 — 모든 모듈 플러그인의 진입점
 * @MX:REASON: 코어는 ModuleInstance 와 ModuleConfig 만 알면 되며, 모듈별 도메인 로직은
 *             onInstall/onUninstall/configSchema 를 통해 주입된다. 이 인터페이스가 플러그인 계약의 단일 진입점.
 */
export interface ModuleDefinition<TConfig = unknown> {
  /** "board", "wiki", "shop" — 전역 고유 식별자 */
  code: string;

  /** 관리자 UI 표시용 이름 */
  displayName: string;

  /** 모듈 타입 선택 시 표시되는 짧은 설명 */
  description?: string;

  /** ModuleConfig.config 를 검증하는 Zod 스키마; 설정 업데이트 시마다 실행 */
  configSchema: z.ZodType<TConfig>;

  /** 인스턴스 생성 시 사용되는 기본 설정 */
  defaultConfig: TConfig;

  /**
   * 인스턴스 생성 시 실행되는 훅 (DB 트랜잭션 안에서 실행).
   * 실패 시 트랜잭션 전체 롤백 (REQ-ADMIN-004).
   */
  onInstall?: (ctx: ModuleLifecycleContext) => Promise<void>;

  /**
   * 인스턴스 삭제 시 실행되는 훅 (DB 트랜잭션 안에서 실행).
   * 인스턴스 콘텐츠/설정/캐시 정리 (REQ-ADMIN-005).
   */
  onUninstall?: (ctx: ModuleLifecycleContext) => Promise<void>;

  /**
   * 설정 변경 시 실행되는 훅.
   */
  onConfigure?: (ctx: ModuleLifecycleContext, prev: TConfig, next: TConfig) => Promise<void>;

  /** 퍼블릭 라우트 핸들러 맵 */
  routes: ModuleRouteMap;

  /** 관리자 하위 페이지 기여 목록 (Slice B+ 에서 사용) */
  adminPages?: ModuleAdminPage[];

  /** 이 모듈이 읽고 쓰는 캐시 태그 생성 함수 */
  cacheTags?: (instanceId: number) => string[];
}
