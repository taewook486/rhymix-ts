-- CreateEnum
CREATE TYPE "MailLogStatus" AS ENUM ('SENT', 'FAILED');

-- DropForeignKey
ALTER TABLE "theme_assignments" DROP CONSTRAINT "theme_assignments_themeId_fkey";

-- DropIndex
DROP INDEX "documents_search_vector_idx";

-- AlterTable
ALTER TABLE "admin_favorites" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "searchVector" DROP DEFAULT;

-- AlterTable
ALTER TABLE "domains" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "managed_email_hosts" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "menu_items" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "menu_slot_assignments" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "menus" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "messages" ALTER COLUMN "readAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "module_configs" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "actorNickname" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "site_point_config" ALTER COLUMN "id" SET DEFAULT 1,
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "site_point_config_id_seq";

-- AlterTable
ALTER TABLE "social_accounts" ALTER COLUMN "provider" SET DATA TYPE TEXT,
ALTER COLUMN "providerAccountId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "tags" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "terms" ALTER COLUMN "type" SET DATA TYPE TEXT,
ALTER COLUMN "title" SET DATA TYPE TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "theme_assignments" ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "themes" ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "widget_instances" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "mail_logs" (
    "id" SERIAL NOT NULL,
    "siteId" INTEGER,
    "recipient" CITEXT NOT NULL,
    "subject" VARCHAR(300) NOT NULL,
    "status" "MailLogStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mail_logs_status_createdAt_idx" ON "mail_logs"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "theme_assignments" ADD CONSTRAINT "theme_assignments_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
