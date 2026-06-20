-- SPEC-ADMIN-002 Slice 3E: 대시보드 위젯 표시 여부 (REQ-ADMIN2-008)
--
-- dashboardWidgetPrefs 컬럼을 users 테이블에 추가합니다.
-- 관리자 계정별로 위젯 표시 여부를 JSON 형식으로 저장합니다.
-- 예: {"visitStats": true, "recentDocuments": false, "recentComments": true}

ALTER TABLE "users" ADD COLUMN "dashboardWidgetPrefs" JSONB DEFAULT '{}';
