-- SPEC-LAYOUT-001 REQ-LAYOUT-003: layout ID 컬럼을 Int?에서 String?로 변경
-- 기존 row의 값은 모두 null로 초기화 (Int ID는 cuid string과 호환 불가)

-- domains 테이블: defaultLayoutId, defaultMobileLayoutId
ALTER TABLE "domains" ALTER COLUMN "defaultLayoutId" TYPE TEXT USING NULL;
ALTER TABLE "domains" ALTER COLUMN "defaultMobileLayoutId" TYPE TEXT USING NULL;

-- module_instances 테이블: layoutId, mobileLayoutId
ALTER TABLE "module_instances" ALTER COLUMN "layoutId" TYPE TEXT USING NULL;
ALTER TABLE "module_instances" ALTER COLUMN "mobileLayoutId" TYPE TEXT USING NULL;
