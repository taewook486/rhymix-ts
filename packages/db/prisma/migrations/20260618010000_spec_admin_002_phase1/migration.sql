-- SPEC-ADMIN-002 Phase 1 (Slice 1A, 1C): daily_visits table + member_groups.description column

-- Slice 1A (REQ-ADMIN2-001, 009): aggregated daily visit counters for the dashboard widget
CREATE TABLE "daily_visits" (
    "id" SERIAL PRIMARY KEY,
    "siteId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "daily_visits_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "daily_visits_siteId_date_key" ON "daily_visits"("siteId", "date");
CREATE INDEX "daily_visits_date_idx" ON "daily_visits"("date");

-- Slice 1C (REQ-ADMIN2-041): member group description field
ALTER TABLE "member_groups" ADD COLUMN "description" TEXT;
