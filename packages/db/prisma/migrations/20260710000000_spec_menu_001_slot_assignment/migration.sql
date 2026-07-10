-- Migration: SPEC-MENU-001 Slice C — Add MenuSlotAssignment model for multi-slot menu rendering
-- @MX:SPEC: SPEC-MENU-001 REQ-MENU-020~025
-- @MX:WARN: [AUTO] Data migration risk — backfill from defaultMenuId must be idempotent
-- @MX:REASON: Migration creates MenuSlotAssignment rows for existing Domains; must be safe to re-run

-- Create MenuSlot enum
CREATE TYPE "MenuSlot" AS ENUM ('HEADER_PRIMARY', 'FOOTER', 'UTILITY');

-- Create MenuSlotAssignment table
CREATE TABLE "menu_slot_assignments" (
    "id"        SERIAL PRIMARY KEY,
    "domainId"  INTEGER NOT NULL,
    "slot"      "MenuSlot" NOT NULL,
    "menuId"    INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint on (domainId, slot) — 한 도메인의 한 슬롯은 하나의 메뉴만 가리킴
ALTER TABLE "menu_slot_assignments" ADD CONSTRAINT "menu_slot_assignments_domainId_slot_key" UNIQUE ("domainId", "slot");

-- Add indexes
CREATE INDEX "menu_slot_assignments_domainId_idx" ON "menu_slot_assignments"("domainId");
CREATE INDEX "menu_slot_assignments_menuId_idx" ON "menu_slot_assignments"("menuId");

-- Add foreign key constraints
ALTER TABLE "menu_slot_assignments" ADD CONSTRAINT "menu_slot_assignments_domainId_fkey"
    FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_slot_assignments" ADD CONSTRAINT "menu_slot_assignments_menuId_fkey"
    FOREIGN KEY ("menuId") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: Create MenuSlotAssignment for each Domain with non-null defaultMenuId
-- Only create if one doesn't already exist for that (domainId, HEADER_PRIMARY) pair (idempotent)
-- @MX:WARN: [AUTO] Data migration risk — backfill uses INSERT ON CONFLICT for idempotency
-- @MX:REASON: Ensures migration is safe to re-run without creating duplicate rows
INSERT INTO "menu_slot_assignments" ("domainId", "slot", "menuId", "createdAt", "updatedAt")
SELECT
    "id" AS "domainId",
    'HEADER_PRIMARY'::"MenuSlot" AS "slot",
    "defaultMenuId" AS "menuId",
    CURRENT_TIMESTAMP AS "createdAt",
    CURRENT_TIMESTAMP AS "updatedAt"
FROM "domains"
WHERE "defaultMenuId" IS NOT NULL
ON CONFLICT ("domainId", "slot") DO NOTHING;
