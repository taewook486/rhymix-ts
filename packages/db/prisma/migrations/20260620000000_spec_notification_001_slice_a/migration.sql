-- SPEC-NOTIFICATION-001: Notification Center (Slice A)
-- CreateEnum for NotificationCategory
CREATE TYPE "NotificationCategory" AS ENUM ('COMMENT', 'COMMENT_REPLY', 'MENTION', 'MESSAGE');

-- CreateEnum for NotificationSourceType
CREATE TYPE "NotificationSourceType" AS ENUM ('COMMENT', 'MENTION', 'MESSAGE');

-- Create Notification table
CREATE TABLE "notifications" (
    "id" INTEGER NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "sourceType" "NotificationSourceType" NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "actorNickname" VARCHAR(100) NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3) WITH TIME ZONE,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Create NotificationPreference table
CREATE TABLE "notification_preferences" (
    "id" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes and constraints
CREATE UNIQUE INDEX "notifications_sourceType_sourceId_recipientId_key" ON "notifications"("sourceType", "sourceId", "recipientId");
CREATE UNIQUE INDEX "notification_preferences_memberId_category_key" ON "notification_preferences"("memberId", "category");

-- Create performance indexes
CREATE INDEX "notifications_recipientId_createdAt_idx" ON "notifications"("recipientId", "createdAt" DESC);
CREATE INDEX "notifications_recipientId_idx" ON "notifications"("recipientId");
CREATE INDEX "notifications_sourceType_sourceId_idx" ON "notifications"("sourceType", "sourceId");
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");
CREATE INDEX "notification_preferences_memberId_idx" ON "notification_preferences"("memberId");

-- Add foreign key constraints
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add relation fields to User table (this will be handled by Prisma)
-- ALTER TABLE "users" ADD COLUMN ... (Prisma handles this automatically)
