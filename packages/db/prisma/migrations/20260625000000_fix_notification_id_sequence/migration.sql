-- Fix: SPEC-NOTIFICATION-001 Slice A's original migration created
-- notifications.id and notification_preferences.id as plain "INTEGER NOT NULL"
-- instead of the house convention "SERIAL NOT NULL" (see other tables in
-- 20260517100000_add_content_foundation_models/migration.sql for the pattern).
-- schema.prisma always declared `id Int @id @default(autoincrement())`, but the
-- migration SQL never created the backing sequence, so every INSERT without an
-- explicit id has been failing with a NOT NULL violation since this migration
-- was first applied. Retrofit equivalent-to-SERIAL behavior via sequence + default.

CREATE SEQUENCE IF NOT EXISTS "notifications_id_seq";
ALTER SEQUENCE "notifications_id_seq" OWNED BY "notifications"."id";
ALTER TABLE "notifications" ALTER COLUMN "id" SET DEFAULT nextval('notifications_id_seq');
SELECT setval('notifications_id_seq', COALESCE((SELECT MAX("id") FROM "notifications"), 0) + 1, false);

CREATE SEQUENCE IF NOT EXISTS "notification_preferences_id_seq";
ALTER SEQUENCE "notification_preferences_id_seq" OWNED BY "notification_preferences"."id";
ALTER TABLE "notification_preferences" ALTER COLUMN "id" SET DEFAULT nextval('notification_preferences_id_seq');
SELECT setval('notification_preferences_id_seq', COALESCE((SELECT MAX("id") FROM "notification_preferences"), 0) + 1, false);
