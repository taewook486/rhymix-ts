-- SPEC-ADMIN-002 Slice 3A: 설문(Poll) 시스템 (REQ-ADMIN2-083~086)

-- 설문 (REQ-ADMIN2-083, REQ-ADMIN2-084, REQ-ADMIN2-086)
CREATE TABLE "polls" (
    "id" SERIAL PRIMARY KEY,
    "siteId" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "allowGuestVote" BOOLEAN NOT NULL DEFAULT false,
    "allowMultipleChoice" BOOLEAN NOT NULL DEFAULT false,
    "duplicateVotePolicy" VARCHAR(20) NOT NULL DEFAULT 'by-member',
    "startAt" TIMESTAMPTZ NOT NULL,
    "endAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "polls_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "polls_siteId_idx" ON "polls"("siteId");

-- 설문 선택 항목 (REQ-ADMIN2-084)
CREATE TABLE "poll_options" (
    "id" SERIAL PRIMARY KEY,
    "pollId" INTEGER NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_options_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "poll_options_pollId_idx" ON "poll_options"("pollId");

-- 설문 투표 기록 (REQ-ADMIN2-085, REQ-ADMIN2-086)
-- memberId 는 비회원 투표를 위해 nullable. Postgres 유니크 제약은 NULL 을
-- 서로 다른 값으로 취급하므로 (pollId, memberId) 유니크가 비회원 투표(NULL)를 막지 않는다.
-- by-ip/by-cookie 중복 방지는 애플리케이션 레벨에서 voterIp 조회로 처리한다.
CREATE TABLE "poll_votes" (
    "id" SERIAL PRIMARY KEY,
    "pollId" INTEGER NOT NULL,
    "pollOptionId" INTEGER NOT NULL,
    "memberId" INTEGER,
    "voterIp" VARCHAR(45),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_votes_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "poll_votes_pollOptionId_fkey" FOREIGN KEY ("pollOptionId") REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "poll_votes_pollId_memberId_key" ON "poll_votes"("pollId", "memberId");
CREATE INDEX "poll_votes_pollId_idx" ON "poll_votes"("pollId");
CREATE INDEX "poll_votes_pollOptionId_idx" ON "poll_votes"("pollOptionId");
CREATE INDEX "poll_votes_pollId_voterIp_idx" ON "poll_votes"("pollId", "voterIp");
