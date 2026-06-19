-- SPEC-ADMIN-002 Slice 2E: 스팸 필터 시스템 (REQ-ADMIN2-120~123)

-- 금지어 목록 (REQ-ADMIN2-121)
CREATE TABLE "spam_denied_words" (
    "id" SERIAL PRIMARY KEY,
    "siteId" INTEGER NOT NULL,
    "word" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "spam_denied_words_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "spam_denied_words_siteId_word_key" ON "spam_denied_words"("siteId", "word");
CREATE INDEX "spam_denied_words_siteId_idx" ON "spam_denied_words"("siteId");

-- 차단 IP 목록 (REQ-ADMIN2-120)
CREATE TABLE "spam_denied_ips" (
    "id" SERIAL PRIMARY KEY,
    "siteId" INTEGER NOT NULL,
    "ipPattern" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "spam_denied_ips_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "spam_denied_ips_siteId_ipPattern_key" ON "spam_denied_ips"("siteId", "ipPattern");
CREATE INDEX "spam_denied_ips_siteId_idx" ON "spam_denied_ips"("siteId");

-- 스팸 필터 규칙 / 속도 제한 (REQ-ADMIN2-123)
CREATE TABLE "spam_rules" (
    "id" SERIAL PRIMARY KEY,
    "siteId" INTEGER NOT NULL,
    "actionType" VARCHAR(50) NOT NULL,
    "maxSubmissions" INTEGER NOT NULL DEFAULT 5,
    "windowSeconds" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "spam_rules_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "spam_rules_siteId_actionType_key" ON "spam_rules"("siteId", "actionType");
CREATE INDEX "spam_rules_siteId_idx" ON "spam_rules"("siteId");
