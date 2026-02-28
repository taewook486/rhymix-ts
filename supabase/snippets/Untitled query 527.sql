-- 모든 관련 테이블 컬럼 확인
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('boards', 'menus', 'menu_items', 'pages', 'site_config', 'layouts', 'widgets')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
