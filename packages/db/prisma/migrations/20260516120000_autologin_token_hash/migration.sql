-- SPEC-AUTH-001 Slice E: AutoLogin securityKey/previousKey → tokenHash/previousTokenHash
--
-- Path A (Slice E plan OQ-2): dev 환경 — 평문 시대의 모든 row 를 폐기하고 컬럼 교체.
-- prod data 부재로 마이그레이션 데이터 보존 불필요.

-- 1) 평문 시대 row 전체 폐기
DELETE FROM "auto_logins";

-- 2) 기존 unique constraint + 컬럼 제거
ALTER TABLE "auto_logins" DROP CONSTRAINT IF EXISTS "auto_logins_securityKey_key";
ALTER TABLE "auto_logins" DROP CONSTRAINT IF EXISTS "auto_logins_previousKey_key";
ALTER TABLE "auto_logins" DROP COLUMN "securityKey";
ALTER TABLE "auto_logins" DROP COLUMN "previousKey";

-- 3) HMAC 해시 컬럼 추가
ALTER TABLE "auto_logins" ADD COLUMN "tokenHash" TEXT NOT NULL;
ALTER TABLE "auto_logins" ADD COLUMN "previousTokenHash" TEXT;

-- 4) unique constraint
ALTER TABLE "auto_logins" ADD CONSTRAINT "auto_logins_tokenHash_key" UNIQUE ("tokenHash");
ALTER TABLE "auto_logins" ADD CONSTRAINT "auto_logins_previousTokenHash_key" UNIQUE ("previousTokenHash");
