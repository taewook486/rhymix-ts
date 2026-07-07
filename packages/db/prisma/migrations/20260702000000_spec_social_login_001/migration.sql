-- SPEC-SOCIAL-LOGIN-001: 소셜 계정 연결 모델 추가 (REQ-SOCIAL-006)
--
-- SocialAccount 테이블 생성:
-- - provider: VARCHAR (카카오/구글 등 OAuth 제공자)
-- - providerAccountId: VARCHAR (제공자별 고유 사용자 ID)
-- - userId: INTEGER → users(id) 외래 키
-- - createdAt: TIMESTAMPTZ (기본값 now())
-- - 복합 유니크 제약: (provider, providerAccountId)

CREATE TABLE "social_accounts" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "provider" VARCHAR NOT NULL,
    "providerAccountId" VARCHAR NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "social_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 복합 유니크 제약: 동일 제공자에서는 providerAccountId가 유니크해야 함
CREATE UNIQUE INDEX "social_accounts_provider_providerAccountId_key" ON "social_accounts"("provider", "providerAccountId");

-- userId 인덱스: 특정 사용자의 모든 소셜 계정을 빠르게 조회
CREATE INDEX "social_accounts_userId_idx" ON "social_accounts"("userId");
