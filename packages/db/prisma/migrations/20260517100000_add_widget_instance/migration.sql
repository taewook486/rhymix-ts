-- SPEC-ADMIN-001 Slice I: WidgetInstance DB 프리셋 (REQ-ADMIN-043)
-- WidgetInstance 테이블 생성

CREATE TABLE "widget_instances" (
    "id"         SERIAL          NOT NULL,
    "widgetName" TEXT            NOT NULL,
    "label"      TEXT            NOT NULL,
    "props"      JSONB           NOT NULL DEFAULT '{}',
    "createdAt"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "widget_instances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "widget_instances_widgetName_idx" ON "widget_instances"("widgetName");
