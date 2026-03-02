-- =====================================================
-- FIX: Allow installation status updates during installation
-- And mark current installation as completed
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can update installation status" ON public.installation_status;

-- Create new policy that allows updates during installation
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

-- Mark installation as completed
UPDATE installation_status
SET status = 'completed',
    current_step = 5,
    completed_at = NOW();

-- Verify
SELECT status, current_step, site_name, admin_email,
       'INSTALLATION COMPLETED' AS result
FROM installation_status;
