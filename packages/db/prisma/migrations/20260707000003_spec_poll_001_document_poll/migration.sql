-- Migration: SPEC-POLL-001 Add DocumentPoll model for post-poll attachment

-- Create DocumentPoll table
CREATE TABLE "document_polls" (
    "documentId" INTEGER NOT NULL DEFAULT 0,
    "pollId"     INTEGER NOT NULL,
    "sortKey"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_polls_pkey" PRIMARY KEY ("documentId", "pollId")
);

CREATE INDEX "document_polls_pollId_idx" ON "document_polls"("pollId");

ALTER TABLE "document_polls" ADD CONSTRAINT "document_polls_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_polls" ADD CONSTRAINT "document_polls_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
