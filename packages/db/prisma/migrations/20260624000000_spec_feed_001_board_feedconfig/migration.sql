-- SPEC-FEED-001 Slice A (T-001): 게시판별 RSS/Atom 피드 설정 컬럼 (REQ-FEED-050)
--
-- feedConfig 컬럼을 boards 테이블에 추가합니다 (additive only, 기존 컬럼 변경 없음).
-- Zod 스키마(boardFeedConfigSchema)가 검증하는 JSON 형태로 저장됩니다.
-- 예: {"enabled": true, "itemCount": 20, "fullContent": false, "excerptLength": 400}

ALTER TABLE "boards" ADD COLUMN "feedConfig" JSONB NOT NULL DEFAULT '{}';
