-- Theme 시스템 테이블 추가 (SPEC-THEME-POLISH-001)
-- themes, layouts, skins, color_sets, widget_styles, theme_assignments
-- comment_vote_logs, comment_reports, content_rate_limits

CREATE TABLE IF NOT EXISTS "themes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "author" TEXT,
    "parent" TEXT,
    "manifest" JSONB NOT NULL,
    "tokensSchema" JSONB NOT NULL,
    "status" "ThemeStatus" NOT NULL DEFAULT 'INSTALLED',
    "installedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "themes_name_key" ON "themes"("name");
CREATE INDEX IF NOT EXISTS "themes_status_idx" ON "themes"("status");

CREATE TABLE IF NOT EXISTS "layouts" (
    "id" TEXT NOT NULL,
    "legacySrl" INTEGER,
    "themeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "layoutPath" TEXT NOT NULL,
    "layoutType" "LayoutType" NOT NULL DEFAULT 'DESKTOP',
    "siteSrl" INTEGER,
    "extraVars" JSONB,
    CONSTRAINT "layouts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "layouts_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "layouts_legacySrl_key" ON "layouts"("legacySrl");
CREATE UNIQUE INDEX IF NOT EXISTS "layouts_themeId_name_layoutType_key" ON "layouts"("themeId", "name", "layoutType");
CREATE INDEX IF NOT EXISTS "layouts_siteSrl_idx" ON "layouts"("siteSrl");

CREATE TABLE IF NOT EXISTS "skins" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "moduleType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "componentPath" TEXT NOT NULL,
    CONSTRAINT "skins_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "skins_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "skins_themeId_moduleType_name_key" ON "skins"("themeId", "moduleType", "name");
CREATE INDEX IF NOT EXISTS "skins_moduleType_idx" ON "skins"("moduleType");

CREATE TABLE IF NOT EXISTS "color_sets" (
    "id" TEXT NOT NULL,
    "skinId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokens" JSONB NOT NULL,
    CONSTRAINT "color_sets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "color_sets_skinId_fkey" FOREIGN KEY ("skinId") REFERENCES "skins"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "color_sets_skinId_name_key" ON "color_sets"("skinId", "name");

CREATE TABLE IF NOT EXISTS "widget_styles" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "componentPath" TEXT NOT NULL,
    CONSTRAINT "widget_styles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "widget_styles_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "widget_styles_themeId_name_key" ON "widget_styles"("themeId", "name");

CREATE TABLE IF NOT EXISTS "theme_assignments" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "scope" "AssignmentScope" NOT NULL,
    "refType" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "layoutName" TEXT,
    "mobileLayoutName" TEXT,
    "mlayoutMode" "MobileLayoutMode" NOT NULL DEFAULT 'RESPONSIVE',
    "skinName" TEXT,
    "tokensOverride" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "theme_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "theme_assignments_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "theme_assignments_scope_refType_refId_key" ON "theme_assignments"("scope", "refType", "refId");
CREATE INDEX IF NOT EXISTS "theme_assignments_refId_idx" ON "theme_assignments"("refId");

CREATE TABLE IF NOT EXISTS "comment_vote_logs" (
    "id" SERIAL NOT NULL,
    "commentId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "voteType" INTEGER NOT NULL,
    "regdate" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comment_vote_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "comment_vote_logs_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "comment_vote_logs_commentId_memberId_key" ON "comment_vote_logs"("commentId", "memberId");
CREATE INDEX IF NOT EXISTS "comment_vote_logs_commentId_idx" ON "comment_vote_logs"("commentId");

CREATE TABLE IF NOT EXISTS "comment_reports" (
    "id" SERIAL NOT NULL,
    "commentId" INTEGER NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "reporterIp" CITEXT,
    "reason" TEXT,
    "regdate" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comment_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "comment_reports_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "comment_reports_commentId_reporterId_key" ON "comment_reports"("commentId", "reporterId");
CREATE INDEX IF NOT EXISTS "comment_reports_commentId_idx" ON "comment_reports"("commentId");

CREATE TABLE IF NOT EXISTS "content_rate_limits" (
    "id" BIGSERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "identifier" TEXT,
    "endpoint" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_rate_limits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "content_rate_limits_ip_endpoint_createdAt_idx" ON "content_rate_limits"("ip", "endpoint", "createdAt");
CREATE INDEX IF NOT EXISTS "content_rate_limits_identifier_endpoint_createdAt_idx" ON "content_rate_limits"("identifier", "endpoint", "createdAt");
