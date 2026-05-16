-- SPEC-ADMIN-001 Slice A: Foundation Schema
-- 추가 모델: Domain 확장, ModuleInstance 재정의, ModuleConfig, Menu, MenuItem, AdminLog, AdminFavorite
-- Site: menus, moduleInstances 역관계 추가
-- User: adminFavorites 역관계 추가

-- =====================================
-- Domain 테이블 확장
-- =====================================

-- citext 로 hostname 타입 변경 (REQ-ADMIN-001 정신 — hostname 대소문자 무관 유니크)
ALTER TABLE "domains"
  ALTER COLUMN "hostname" TYPE CITEXT USING "hostname"::CITEXT;

-- 신규 컬럼 추가
ALTER TABLE "domains"
  ADD COLUMN "forceHttps" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "defaultLanguage" TEXT,
  ADD COLUMN "defaultTimezone" TEXT,
  ADD COLUMN "defaultMobileLayoutId" INTEGER,
  ADD COLUMN "indexModuleInstanceId" INTEGER,
  ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- =====================================
-- ModuleInstance 테이블 재정의 (stub → full)
-- =====================================

-- 기존 전역 unique 인덱스 제거
DROP INDEX IF EXISTS "module_instances_mid_key";

-- 기존 module 컬럼을 moduleCode 로 개명
ALTER TABLE "module_instances"
  RENAME COLUMN "module" TO "moduleCode";

-- siteId NOT NULL 로 업그레이드 (현재 nullable)
-- 기존 row 가 없으므로 바로 NOT NULL 로 변경
ALTER TABLE "module_instances"
  ALTER COLUMN "siteId" SET NOT NULL;

-- mid 를 citext 로 변경
ALTER TABLE "module_instances"
  ALTER COLUMN "mid" TYPE CITEXT USING "mid"::CITEXT;

-- config 컬럼 제거 (ModuleConfig 1:1 로 분리 — REQ-ADMIN-007)
ALTER TABLE "module_instances"
  DROP COLUMN IF EXISTS "config";

-- 신규 컬럼 추가
ALTER TABLE "module_instances"
  ADD COLUMN "name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "browserTitle" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "layoutId" INTEGER,
  ADD COLUMN "mobileLayoutId" INTEGER,
  ADD COLUMN "skin" TEXT,
  ADD COLUMN "mobileSkin" TEXT,
  ADD COLUMN "menuId" INTEGER,
  ADD COLUMN "rssEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "rssTitle" TEXT,
  ADD COLUMN "rssDescription" TEXT;

-- name 컬럼 default 제거 (신규 insert 는 반드시 name 을 지정)
ALTER TABLE "module_instances"
  ALTER COLUMN "name" DROP DEFAULT;

-- 기존 site 외래키 확인 후 추가 (이미 있는 경우 skip)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'module_instances_siteId_fkey'
    AND table_name = 'module_instances'
  ) THEN
    ALTER TABLE "module_instances"
      ADD CONSTRAINT "module_instances_siteId_fkey"
      FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 기존 @@index([module]) 를 @@index([moduleCode]) 로 개명
DROP INDEX IF EXISTS "module_instances_module_idx";
CREATE INDEX "module_instances_moduleCode_idx" ON "module_instances"("moduleCode");

-- 복합 유니크 추가 (전역 unique 대신 사이트 범위 unique — Q2 결정)
CREATE UNIQUE INDEX "module_instances_siteId_mid_key" ON "module_instances"("siteId", "mid");

-- =====================================
-- ModuleConfig 신규 테이블 (REQ-ADMIN-007)
-- =====================================
CREATE TABLE "module_configs" (
    "id" SERIAL NOT NULL,
    "moduleInstanceId" INTEGER NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "module_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "module_configs_moduleInstanceId_key" ON "module_configs"("moduleInstanceId");
ALTER TABLE "module_configs" ADD CONSTRAINT "module_configs_moduleInstanceId_fkey"
  FOREIGN KEY ("moduleInstanceId") REFERENCES "module_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================
-- Domain → ModuleInstance FK (indexModuleInstanceId)
-- =====================================
ALTER TABLE "domains" ADD CONSTRAINT "domains_indexModuleInstanceId_fkey"
  FOREIGN KEY ("indexModuleInstanceId") REFERENCES "module_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================
-- Menu 신규 테이블 (REQ-ADMIN-030)
-- =====================================
CREATE TABLE "menus" (
    "id" SERIAL NOT NULL,
    "siteId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "isAdminMenu" BOOLEAN NOT NULL DEFAULT false,
    "listOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "menus_siteId_idx" ON "menus"("siteId");
ALTER TABLE "menus" ADD CONSTRAINT "menus_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================
-- MenuItem 신규 테이블 (REQ-ADMIN-030~033)
-- =====================================
CREATE TABLE "menu_items" (
    "id" SERIAL NOT NULL,
    "menuId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "icon" TEXT,
    "cssClass" TEXT,
    "description" TEXT,
    "groupIds" INTEGER[] NOT NULL DEFAULT '{}',
    "openInNewWindow" BOOLEAN NOT NULL DEFAULT false,
    "expand" BOOLEAN NOT NULL DEFAULT false,
    "listOrder" INTEGER NOT NULL DEFAULT 0,
    "normalBtn" JSONB,
    "hoverBtn" JSONB,
    "activeBtn" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "menu_items_menuId_parentId_listOrder_idx" ON "menu_items"("menuId", "parentId", "listOrder");
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_menuId_fkey"
  FOREIGN KEY ("menuId") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================
-- AdminLog 신규 테이블 (REQ-ADMIN-070~072)
-- AuditLog (AUTH-001) 와 별도 — BigInt PK, target String, diff Json
-- =====================================
CREATE TABLE "admin_logs" (
    "id" BIGSERIAL NOT NULL,
    "actorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "diff" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "admin_logs_actorId_createdAt_idx" ON "admin_logs"("actorId", "createdAt");
CREATE INDEX "admin_logs_target_createdAt_idx" ON "admin_logs"("target", "createdAt");
CREATE INDEX "admin_logs_action_createdAt_idx" ON "admin_logs"("action", "createdAt");

-- =====================================
-- AdminFavorite 신규 테이블 (REQ-ADMIN-100)
-- =====================================
CREATE TABLE "admin_favorites" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "icon" TEXT,
    "listOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_favorites_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "admin_favorites_memberId_listOrder_idx" ON "admin_favorites"("memberId", "listOrder");
ALTER TABLE "admin_favorites" ADD CONSTRAINT "admin_favorites_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
