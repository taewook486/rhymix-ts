-- SPEC-ADDON-001 REQ-ADDON-020: Create addon_configs table
-- Table: addon_configs
CREATE TABLE "addon_configs" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "lastDisabledAt" TIMESTAMP(3),
    "lastDisabledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
