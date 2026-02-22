-- Add system_groups column to permissions table
-- This stores system group assignments (e.g., ['system_admin', 'system_user'])
-- Custom group assignments continue to use the group_permissions junction table

ALTER TABLE public.permissions
ADD COLUMN IF NOT EXISTS system_groups TEXT[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN public.permissions.system_groups IS 'System group IDs assigned to this permission (e.g., system_admin, system_user)';
