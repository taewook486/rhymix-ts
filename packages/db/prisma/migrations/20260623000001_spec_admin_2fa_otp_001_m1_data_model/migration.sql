-- SPEC-ADMIN-2FA-OTP-001 M1: 2FA 데이터 모델 추가 (REQ-2OTP-001)
--
-- Additive changes to User model for TOTP 2FA:
-- - twoFactorSecret: TEXT (nullable) - AES-256-GCM 암호문 (base64 인코딩된 IV+tag+ciphertext)
-- - twoFactorEnabled: BOOLEAN (default false)
-- - twoFactorConfirmedAt: TIMESTAMPTZ (nullable)
-- - twoFactorBackupCodes: JSONB (default '[]') - SHA-256 해시 배열

ALTER TABLE "users" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "users" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "twoFactorConfirmedAt" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN "twoFactorBackupCodes" JSONB NOT NULL DEFAULT '[]';
