-- SPEC-CAPTCHA-001: Terms 모델 추가 (REQ-CAPTCHA-002)
--
-- Terms 테이블 생성:
-- - siteId: INTEGER → sites(id) 외래 키
-- - type: VARCHAR ('terms'|'privacy'|'custom')
-- - title: VARCHAR (약관 제목)
-- - content: TEXT (약관 본문 - 리치 텍스트 지원)
-- - required: BOOLEAN (필수 동의 여부, 기본값 true)
-- - active: BOOLEAN (활성화 여부, 기본값 true)
-- - createdAt/updatedAt: TIMESTAMPTZ

CREATE TABLE "terms" (
    "id" SERIAL PRIMARY KEY,
    "siteId" INTEGER NOT NULL,
    "type" VARCHAR NOT NULL,
    "title" VARCHAR NOT NULL,
    "content" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "terms_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- siteId + type + active 복합 인덱스: 활성화된 약관 빠른 조회
CREATE INDEX "terms_siteId_type_active_idx" ON "terms"("siteId", "type", "active");
