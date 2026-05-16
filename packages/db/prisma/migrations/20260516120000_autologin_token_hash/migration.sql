-- SPEC-AUTH-001 Slice G: AutoLogin 보안키 해시 전환
-- 이 migration 은 DB 에 이미 applied 로 기록되어 있으므로
-- shadow DB 재생성을 위한 no-op placeholder 입니다.
-- 실제 Slice G 의 변경사항은 init migration 에 이미 포함되어 있습니다.
-- (autologin securityKey / previousKey 컬럼은 init 에서 생성됨)
SELECT 1; -- no-op
