-- SPEC-AUTH-001 Slice D1: Session Revocation Foundation.
--
-- Adds:
--   1. users.sessionsRevokedAt — denormalized fast-path column for jwt callback
--      to compare against token.iat without joining session_revocations.
--   2. session_revocations — append-only audit history of every revocation event.
--   3. Index on (userId, revokedAt) — supports both per-user lookup and
--      monotonic latest-revocation queries.
--   4. Foreign key to users (ON DELETE CASCADE) — when a user is hard-deleted,
--      their revocation history is removed too.
--
-- The reason column is a String following the convention:
--   STATUS_CHANGED | ADMIN_FORCE_LOGOUT | PASSWORD_CHANGED | USER_LOGOUT_ALL
-- Promotion to enum is deferred until Slice D2/E once usage is stable.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "sessionsRevokedAt" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "session_revocations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "revokedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,

    CONSTRAINT "session_revocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_revocations_userId_revokedAt_idx" ON "session_revocations"("userId", "revokedAt");

-- AddForeignKey
ALTER TABLE "session_revocations" ADD CONSTRAINT "session_revocations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
