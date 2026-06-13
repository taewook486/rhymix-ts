-- SPEC-POINT-001 REQ-POINT-001: PointSourceType enum
CREATE TYPE "PointSourceType" AS ENUM (
  'DOCUMENT',
  'COMMENT',
  'VOTE',
  'DOWNLOAD',
  'FILE_UPLOAD',
  'SIGNUP',
  'MANUAL',
  'SYSTEM',
  'PURCHASE',
  'REFERRAL'
);

-- SPEC-POINT-001 REQ-POINT-001: Point table
CREATE TABLE "points" (
  "id" SERIAL PRIMARY KEY,
  "memberId" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" VARCHAR(200) NOT NULL,
  "sourceType" "PointSourceType" NOT NULL,
  "sourceId" INTEGER,
  "boardId" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "points_sourceType_sourceId_key" UNIQUE ("sourceType", "sourceId"),
  CONSTRAINT "points_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes for Point table
CREATE INDEX "points_memberId_createdAt_idx" ON "points"("memberId", "createdAt" DESC);
CREATE INDEX "points_memberId_idx" ON "points"("memberId");
CREATE INDEX "points_sourceType_sourceId_idx" ON "points"("sourceType", "sourceId");
CREATE INDEX "points_createdAt_idx" ON "points"("createdAt");

-- SPEC-POINT-001 REQ-POINT-006: SitePointConfig table (single row, id=1)
CREATE TABLE "site_point_config" (
  "id" SERIAL PRIMARY KEY,
  "signupBonus" INTEGER NOT NULL DEFAULT 0,
  "clampToZero" BOOLEAN NOT NULL DEFAULT true,
  "allowNegativeBalance" BOOLEAN NOT NULL DEFAULT false,
  "defaultLevel" INTEGER NOT NULL DEFAULT 1
);

-- Insert default configuration row
INSERT INTO "site_point_config" ("id", "signupBonus", "clampToZero", "allowNegativeBalance", "defaultLevel")
VALUES (1, 0, true, false, 1);

-- SPEC-POINT-001 REQ-POINT-001: Add pointBalance to users table
ALTER TABLE "users" ADD COLUMN "pointBalance" INTEGER NOT NULL DEFAULT 0;

-- Update point comment on the table (already done above via ALTER TABLE)
-- COMMENT ON COLUMN "users"."pointBalance" IS 'SPEC-POINT-001 REQ-POINT-001: 포인트 잔액 (비정규화된 합계)';
