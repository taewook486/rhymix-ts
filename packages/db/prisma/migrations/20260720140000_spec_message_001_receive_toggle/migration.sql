-- SPEC-MESSAGE-001 REQ-MSG-004: 쪽지 수신 허용 여부 (opt-out)
--
-- allowMessages 컬럼을 users 테이블에 추가합니다.
-- 기본값 true(허용) — 행 값이 false인 회원에게는 쪽지를 보낼 수 없습니다.

ALTER TABLE "users" ADD COLUMN "allowMessages" BOOLEAN NOT NULL DEFAULT true;
