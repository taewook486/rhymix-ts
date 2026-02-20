-- =====================================================
-- FIX INSTALLATION STATUS RLS POLICY
-- Fixes infinite recursion in installation_status RLS policy
-- =====================================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Installation status readable during setup" ON public.installation_status;
DROP POLICY IF EXISTS "Installation status insertable during setup" ON public.installation_status;
DROP POLICY IF EXISTS "Installation status updatable" ON public.installation_status;

-- Create simplified policies without recursion
CREATE POLICY "Allow all during installation"
  ON public.installation_status FOR ALL USING (true);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
