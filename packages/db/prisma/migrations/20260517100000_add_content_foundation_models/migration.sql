-- SPEC-CONTENT-001 Slice A: Foundation 스키마
-- 10개 모델 + 4개 enum + FTS GENERATED tsvector 컬럼 + GIN index

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PUBLIC', 'SECRET', 'TEMP');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('ALLOW', 'DISABLE');

-- CreateEnum
CREATE TYPE "UploadTargetType" AS ENUM ('DOCUMENT', 'COMMENT');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('UP', 'DOWN', 'BLAME');

-- CreateTable: boards (Board 설정 테이블, ModuleInstance 1:1)
CREATE TABLE "boards" (
    "id" SERIAL NOT NULL,
    "moduleInstanceId" INTEGER NOT NULL,
    "moduleSrl" BIGINT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "skin" TEXT,
    "layoutId" INTEGER,
    "mobileSkin" TEXT,
    "mobileLayoutId" INTEGER,
    "listCount" INTEGER NOT NULL DEFAULT 20,
    "pageCount" INTEGER NOT NULL DEFAULT 10,
    "orderTarget" TEXT NOT NULL DEFAULT 'list_order',
    "exceptNotice" BOOLEAN NOT NULL DEFAULT false,
    "consultation" BOOLEAN NOT NULL DEFAULT false,
    "useAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "updateLog" BOOLEAN NOT NULL DEFAULT false,
    "trashUse" BOOLEAN NOT NULL DEFAULT true,
    "useStatus" "DocumentStatus"[] DEFAULT ARRAY['PUBLIC', 'SECRET', 'TEMP']::"DocumentStatus"[],
    "useCategory" BOOLEAN NOT NULL DEFAULT false,
    "documentLengthLimit" INTEGER NOT NULL DEFAULT 1048576,
    "commentLengthLimit" INTEGER NOT NULL DEFAULT 131072,
    "protectDeleteContent" INTEGER NOT NULL DEFAULT 0,
    "protectUpdateContent" INTEGER NOT NULL DEFAULT 0,
    "protectDeleteComment" INTEGER NOT NULL DEFAULT 0,
    "protectUpdateComment" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable: documents (게시물)
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "documentSrl" BIGINT,
    "boardId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "title" TEXT NOT NULL,
    "titleBold" BOOLEAN NOT NULL DEFAULT false,
    "titleColor" TEXT,
    "content" TEXT NOT NULL,
    "contentText" TEXT,
    "authorId" INTEGER,
    "userIdSnapshot" CITEXT,
    "nickName" TEXT,
    "memberId" TEXT,
    "email" CITEXT,
    "ipAddress" TEXT,
    "password" TEXT,
    "readedCount" INTEGER NOT NULL DEFAULT 0,
    "votedCount" INTEGER NOT NULL DEFAULT 0,
    "blamedCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "trackbackCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PUBLIC',
    "commentStatus" "CommentStatus" NOT NULL DEFAULT 'ALLOW',
    "isNotice" BOOLEAN NOT NULL DEFAULT false,
    "langCode" TEXT NOT NULL DEFAULT 'ko',
    "allowTrackback" BOOLEAN NOT NULL DEFAULT false,
    "notifyMessage" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extraVars" JSONB NOT NULL DEFAULT '{}',
    "listOrder" BIGINT NOT NULL DEFAULT 0,
    "updateOrder" BIGINT NOT NULL DEFAULT 0,
    "regdate" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdate" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: comments (댓글)
CREATE TABLE "comments" (
    "id" SERIAL NOT NULL,
    "commentSrl" BIGINT,
    "documentId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "boardId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "votedCount" INTEGER NOT NULL DEFAULT 0,
    "blamedCount" INTEGER NOT NULL DEFAULT 0,
    "authorId" INTEGER,
    "userIdSnapshot" CITEXT,
    "nickName" TEXT,
    "memberId" TEXT,
    "email" CITEXT,
    "ipAddress" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "listOrder" BIGINT NOT NULL DEFAULT 0,
    "regdate" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdate" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: document_categories (카테고리 계층 구조)
CREATE TABLE "document_categories" (
    "id" SERIAL NOT NULL,
    "categorySrl" BIGINT,
    "boardId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "expand" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "groupIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "listOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: document_extra_keys (부가 키 정의)
CREATE TABLE "document_extra_keys" (
    "id" SERIAL NOT NULL,
    "boardId" INTEGER NOT NULL,
    "varIdx" INTEGER NOT NULL,
    "varName" TEXT NOT NULL,
    "varType" TEXT NOT NULL DEFAULT 'text',
    "varIsRequired" BOOLEAN NOT NULL DEFAULT false,
    "varSearch" BOOLEAN NOT NULL DEFAULT false,
    "varSort" BOOLEAN NOT NULL DEFAULT false,
    "varOptions" JSONB,
    "langCode" TEXT NOT NULL DEFAULT 'ko',

    CONSTRAINT "document_extra_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable: file_attachments (파일 첨부)
CREATE TABLE "file_attachments" (
    "id" SERIAL NOT NULL,
    "fileSrl" BIGINT,
    "uploadTargetType" "UploadTargetType" NOT NULL,
    "documentId" INTEGER,
    "commentId" INTEGER,
    "sourceFilename" TEXT NOT NULL,
    "uploadedFilename" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "directDownload" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "coverImage" BOOLEAN NOT NULL DEFAULT false,
    "isvalid" BOOLEAN NOT NULL DEFAULT true,
    "memberId" TEXT,
    "storageKey" TEXT NOT NULL,
    "regdate" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: document_update_logs (수정 이력)
CREATE TABLE "document_update_logs" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "prevTitle" TEXT NOT NULL,
    "prevContent" TEXT NOT NULL,
    "prevExtraVars" JSONB,
    "editorId" INTEGER,
    "editorIp" TEXT,
    "regdate" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_update_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: document_votes (투표)
CREATE TABLE "document_votes" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "commentId" INTEGER,
    "voterId" TEXT NOT NULL,
    "voteType" "VoteType" NOT NULL,
    "point" INTEGER NOT NULL DEFAULT 1,
    "regdate" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: document_reports (신고)
CREATE TABLE "document_reports" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER,
    "commentId" INTEGER,
    "reporterId" TEXT NOT NULL,
    "reporterIp" TEXT,
    "reason" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "regdate" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable: document_trash (휴지통)
CREATE TABLE "document_trash" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "deletedById" INTEGER,
    "deletedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "document_trash_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX "boards_moduleInstanceId_key" ON "boards"("moduleInstanceId");
CREATE UNIQUE INDEX "boards_moduleSrl_key" ON "boards"("moduleSrl");
CREATE UNIQUE INDEX "documents_documentSrl_key" ON "documents"("documentSrl");
CREATE UNIQUE INDEX "comments_commentSrl_key" ON "comments"("commentSrl");
CREATE UNIQUE INDEX "document_categories_categorySrl_key" ON "document_categories"("categorySrl");
CREATE UNIQUE INDEX "document_extra_keys_boardId_varIdx_langCode_key" ON "document_extra_keys"("boardId", "varIdx", "langCode");
CREATE UNIQUE INDEX "file_attachments_fileSrl_key" ON "file_attachments"("fileSrl");
CREATE UNIQUE INDEX "document_votes_documentId_voterId_voteType_key" ON "document_votes"("documentId", "voterId", "voteType");
CREATE UNIQUE INDEX "document_trash_documentId_key" ON "document_trash"("documentId");

-- Indexes
CREATE INDEX "boards_moduleSrl_idx" ON "boards"("moduleSrl");
CREATE INDEX "documents_boardId_status_regdate_idx" ON "documents"("boardId", "status", "regdate" DESC);
CREATE INDEX "documents_boardId_isNotice_listOrder_idx" ON "documents"("boardId", "isNotice", "listOrder" DESC);
CREATE INDEX "documents_boardId_categoryId_listOrder_idx" ON "documents"("boardId", "categoryId", "listOrder" DESC);
CREATE INDEX "documents_authorId_idx" ON "documents"("authorId");
CREATE INDEX "documents_tags_idx" ON "documents" USING GIN ("tags");
CREATE INDEX "documents_extraVars_idx" ON "documents" USING GIN ("extraVars");
CREATE INDEX "comments_documentId_listOrder_idx" ON "comments"("documentId", "listOrder");
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");
CREATE INDEX "document_categories_boardId_parentId_listOrder_idx" ON "document_categories"("boardId", "parentId", "listOrder");
CREATE INDEX "document_extra_keys_boardId_idx" ON "document_extra_keys"("boardId");
CREATE INDEX "file_attachments_documentId_idx" ON "file_attachments"("documentId");
CREATE INDEX "file_attachments_commentId_idx" ON "file_attachments"("commentId");
CREATE INDEX "document_update_logs_documentId_regdate_idx" ON "document_update_logs"("documentId", "regdate" DESC);
CREATE INDEX "document_votes_documentId_idx" ON "document_votes"("documentId");
CREATE INDEX "document_votes_commentId_idx" ON "document_votes"("commentId");
CREATE INDEX "document_reports_documentId_idx" ON "document_reports"("documentId");
CREATE INDEX "document_reports_commentId_idx" ON "document_reports"("commentId");
CREATE INDEX "document_reports_resolved_idx" ON "document_reports"("resolved");
CREATE INDEX "document_trash_expiresAt_idx" ON "document_trash"("expiresAt");

-- Foreign Keys
ALTER TABLE "boards" ADD CONSTRAINT "boards_moduleInstanceId_fkey" FOREIGN KEY ("moduleInstanceId") REFERENCES "module_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "document_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "comments" ADD CONSTRAINT "comments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "document_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "document_extra_keys" ADD CONSTRAINT "document_extra_keys_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document_update_logs" ADD CONSTRAINT "document_update_logs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_update_logs" ADD CONSTRAINT "document_update_logs_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document_votes" ADD CONSTRAINT "document_votes_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_reports" ADD CONSTRAINT "document_reports_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document_trash" ADD CONSTRAINT "document_trash_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_trash" ADD CONSTRAINT "document_trash_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FTS: GENERATED tsvector 컬럼 + GIN index (Prisma Unsupported("tsvector") 는 빈 컬럼으로 생성되므로 DROP 후 재생성)
-- @MX:NOTE [AUTO]: searchVector 는 Prisma 가 plain tsvector? 로 생성하므로 GENERATED ALWAYS AS 로 교체.
ALTER TABLE "documents" DROP COLUMN IF EXISTS "searchVector";
ALTER TABLE "documents"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("contentText", '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS "documents_search_vector_idx"
  ON "documents" USING GIN ("searchVector");
