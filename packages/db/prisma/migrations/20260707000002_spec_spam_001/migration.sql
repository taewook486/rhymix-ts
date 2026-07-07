-- Migration: SPEC-SPAM-001 Add SpamUrlBlacklist and SpamReviewQueue models
-- URL blacklist filtering and admin review queue for suspected spam content

-- Create SpamUrlBlacklist table
CREATE TABLE "spam_url_blacklists" (
    "id"        SERIAL NOT NULL,
    "siteId"    INTEGER NOT NULL,
    "domain"    VARCHAR(200) NOT NULL,
    "isRegex"   BOOLEAN NOT NULL DEFAULT false,
    "reason"    TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "spam_url_blacklists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spam_url_blacklists_siteId_domain_key" ON "spam_url_blacklists"("siteId", "domain");
CREATE INDEX "spam_url_blacklists_siteId_idx" ON "spam_url_blacklists"("siteId");

ALTER TABLE "spam_url_blacklists" ADD CONSTRAINT "spam_url_blacklists_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create SpamReviewQueue table
CREATE TABLE "spam_review_queues" (
    "id"         SERIAL NOT NULL,
    "siteId"     INTEGER NOT NULL,
    "type"       VARCHAR(20) NOT NULL,
    "contentId"  INTEGER NOT NULL,
    "reason"     VARCHAR(100) NOT NULL,
    "status"     VARCHAR(20) NOT NULL DEFAULT 'pending',
    "metadata"   JSONB DEFAULT '{}',
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ,
    "reviewerId" INTEGER,

    CONSTRAINT "spam_review_queues_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "spam_review_queues_siteId_status_idx" ON "spam_review_queues"("siteId", "status");
CREATE INDEX "spam_review_queues_type_contentId_idx" ON "spam_review_queues"("type", "contentId");
CREATE INDEX "spam_review_queues_createdAt_idx" ON "spam_review_queues"("createdAt");
