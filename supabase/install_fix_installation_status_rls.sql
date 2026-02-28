-- =====================================================
-- FIX: Allow installation status updates during installation
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can update installation status" ON public.installation_status;

-- Create new policy that allows updates during installation
-- (when there's no admin user yet)
CREATE POLICY "Allow installation status updates"
  ON public.installation_status FOR ALL
  USING (
    -- Allow if user is admin
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Allow if no admin exists yet (during installation)
    NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE role = 'admin'
      LIMIT 1
    )
  );

-- Verify
SELECT 'INSTALLATION STATUS RLS FIXED' AS status;
