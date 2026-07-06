-- SPEC-STATS-001: Page View Statistics
-- Add PageView and DailyStat models for tracking page views and daily statistics

-- CreateEnum: (no enums needed for this migration)

-- CreateTable
CREATE TABLE "page_views" (
    "id" BIGSERIAL NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "visitorId" VARCHAR(64) NOT NULL,
    "isMobile" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_views_date_path_idx" ON "page_views"("date", "path");
CREATE INDEX "page_views_date_hour_idx" ON "page_views"("date", "hour");
CREATE INDEX "page_views_visitorId_idx" ON "page_views"("visitorId");

-- CreateTable
CREATE TABLE "daily_stats" (
    "date" DATE NOT NULL,
    "uv" INTEGER NOT NULL DEFAULT 0,
    "pv" INTEGER NOT NULL DEFAULT 0,
    "newMembers" INTEGER NOT NULL DEFAULT 0,
    "newDocuments" INTEGER NOT NULL DEFAULT 0,
    "newComments" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("date")
);
