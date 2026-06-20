-- SPEC-ADMIN-002 Slice 3B: 태그 설정 + 문서 별칭 + 닉네임 변경 이력
-- (REQ-ADMIN2-087, REQ-ADMIN2-156, REQ-ADMIN2-073, REQ-ADMIN2-056, REQ-ADMIN2-057)
--
-- NOTE: 태그 설정(REQ-ADMIN2-087/156)은 순수 SiteSetting JSON 값이므로 스키마 변경이 없다.
-- 이 마이그레이션은 (1) documents.alias 컬럼, (2) nickname_change_logs 테이블만 추가한다.

-- 문서 별칭 (REQ-ADMIN2-073)
-- 문서당 1개의 별칭만 허용하며, 전역적으로 유니크하다 (URL 충돌 방지).
ALTER TABLE "documents" ADD COLUMN "alias" VARCHAR(200);

CREATE UNIQUE INDEX "documents_alias_key" ON "documents"("alias");

-- 닉네임 변경 이력 (REQ-ADMIN2-056, REQ-ADMIN2-057)
-- changedByAdminId 는 관리자가 대신 변경한 경우의 actorId. NULL 이면 회원 자가 변경(미구현, 확장 대비).
CREATE TABLE "nickname_change_logs" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "oldNickName" VARCHAR(40) NOT NULL,
    "newNickName" VARCHAR(40) NOT NULL,
    "changedByAdminId" INTEGER,
    "changedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nickname_change_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "nickname_change_logs_userId_idx" ON "nickname_change_logs"("userId");
CREATE INDEX "nickname_change_logs_changedAt_idx" ON "nickname_change_logs"("changedAt");
