-- SPEC-AUTH-001 Slice D1 (Q2 finding): baseline migration squashing the cumulative
-- schema state through Slice A/B/C. Slice A~C used `prisma db push` for dev
-- synchronization without producing migrations; this `init` SQL captures the
-- full schema as of cb39449 (Slice C merged + Slice D plan v2.0.0). The
-- subsequent `20260510170600_session_revocation` migration adds the new
-- SessionRevocation model and User.sessionsRevokedAt column on top of this baseline.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('APPROVED', 'UNAUTHED', 'DENIED', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "EmailAuthTokenType" AS ENUM ('SIGNUP', 'PASSWORD_RESET', 'EMAIL_CHANGE');

-- CreateEnum
CREATE TYPE "DeniedIdentifierKind" AS ENUM ('USER_ID', 'NICK_NAME');

-- CreateEnum
CREATE TYPE "LoginAttemptResult" AS ENUM ('SUCCESS', 'INVALID_CREDENTIALS', 'STATUS_BLOCKED', 'RATE_LIMITED');

-- CreateEnum
CREATE TYPE "PasswordPolicyLevel" AS ENUM ('NORMAL', 'STRONG', 'VERY_STRONG');

-- CreateTable
CREATE TABLE "sites" (
    "id" SERIAL NOT NULL,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "scheme" TEXT NOT NULL DEFAULT 'https',
    "installedAt" TIMESTAMP(3),
    "installedBy" INTEGER,
    "installerIp" TEXT,
    "installerUserAgent" TEXT,
    "rhymixTsVersion" TEXT NOT NULL DEFAULT '0.0.0',
    "databaseSchemaVersion" TEXT NOT NULL DEFAULT 'init',

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" SERIAL NOT NULL,
    "siteId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" SERIAL NOT NULL,
    "siteId" INTEGER NOT NULL,
    "hostname" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "defaultLayoutId" INTEGER,
    "defaultMenuId" INTEGER,
    "scheme" TEXT NOT NULL DEFAULT 'https',

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_instances" (
    "id" SERIAL NOT NULL,
    "mid" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "siteId" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "userId" CITEXT NOT NULL,
    "emailAddress" CITEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordVersion" TEXT NOT NULL DEFAULT 'argon2id-v1',
    "passwordAlgo" TEXT NOT NULL DEFAULT 'argon2id',
    "passwordChangedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userName" TEXT,
    "nickName" CITEXT NOT NULL,
    "phoneNumber" TEXT,
    "phoneCountry" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'UNAUTHED',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "denied" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMPTZ,
    "lastLoginIp" TEXT,
    "extraVars" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_groups" (
    "id" SERIAL NOT NULL,
    "siteId" INTEGER,
    "title" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "imageMark" TEXT,
    "listOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_group_members" (
    "groupId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_group_members_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "auto_logins" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "securityKey" TEXT NOT NULL,
    "previousKey" TEXT,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "deviceId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "auto_logins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_auth_tokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "authKey" TEXT NOT NULL,
    "authType" "EmailAuthTokenType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "consumedAt" TIMESTAMPTZ,

    CONSTRAINT "email_auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_devices" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trusted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "member_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "join_form_fields" (
    "id" SERIAL NOT NULL,
    "siteSrl" INTEGER NOT NULL DEFAULT 0,
    "fieldName" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "fieldOrder" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,

    CONSTRAINT "join_form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_agreements" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "agreementKey" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "agreedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,

    CONSTRAINT "member_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" SERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "identifier" TEXT,
    "result" "LoginAttemptResult" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "denied_identifiers" (
    "id" SERIAL NOT NULL,
    "kind" "DeniedIdentifierKind" NOT NULL,
    "pattern" CITEXT NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "denied_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "targetId" INTEGER,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_settings_key_idx" ON "site_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_siteId_key_key" ON "site_settings"("siteId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "domains_hostname_key" ON "domains"("hostname");

-- CreateIndex
CREATE INDEX "domains_siteId_idx" ON "domains"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "module_instances_mid_key" ON "module_instances"("mid");

-- CreateIndex
CREATE INDEX "module_instances_module_idx" ON "module_instances"("module");

-- CreateIndex
CREATE UNIQUE INDEX "users_userId_key" ON "users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_emailAddress_key" ON "users"("emailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickName_key" ON "users"("nickName");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_emailAddress_idx" ON "users"("emailAddress");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "member_group_members_userId_idx" ON "member_group_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auto_logins_securityKey_key" ON "auto_logins"("securityKey");

-- CreateIndex
CREATE UNIQUE INDEX "auto_logins_previousKey_key" ON "auto_logins"("previousKey");

-- CreateIndex
CREATE INDEX "auto_logins_userId_idx" ON "auto_logins"("userId");

-- CreateIndex
CREATE INDEX "auto_logins_expiresAt_idx" ON "auto_logins"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_auth_tokens_authKey_key" ON "email_auth_tokens"("authKey");

-- CreateIndex
CREATE INDEX "email_auth_tokens_userId_authType_idx" ON "email_auth_tokens"("userId", "authType");

-- CreateIndex
CREATE INDEX "email_auth_tokens_expiresAt_idx" ON "email_auth_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "member_devices_userId_idx" ON "member_devices"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "member_devices_userId_deviceId_key" ON "member_devices"("userId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "join_form_fields_siteSrl_fieldName_key" ON "join_form_fields"("siteSrl", "fieldName");

-- CreateIndex
CREATE INDEX "member_agreements_userId_agreementKey_idx" ON "member_agreements"("userId", "agreementKey");

-- CreateIndex
CREATE INDEX "login_attempts_ip_createdAt_idx" ON "login_attempts"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempts_createdAt_idx" ON "login_attempts"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "denied_identifiers_kind_pattern_key" ON "denied_identifiers"("kind", "pattern");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_targetId_createdAt_idx" ON "audit_logs"("targetId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_group_members" ADD CONSTRAINT "member_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "member_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_group_members" ADD CONSTRAINT "member_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_logins" ADD CONSTRAINT "auto_logins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_auth_tokens" ADD CONSTRAINT "email_auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_devices" ADD CONSTRAINT "member_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_agreements" ADD CONSTRAINT "member_agreements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
