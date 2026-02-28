-- =====================================================
-- INSTALLATION STATUS TABLE
-- Run this to add the missing installation_status table
-- =====================================================

-- Create installation_status table with correct schema
CREATE TABLE IF NOT EXISTS public.installation_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  current_step INTEGER DEFAULT 1,
  site_name TEXT,
  admin_email TEXT,
  error_message TEXT,
  step_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default installation status
INSERT INTO public.installation_status (status, current_step, site_name, admin_email)
VALUES ('pending', 1, null, null)
ON CONFLICT DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_installation_status_is_installed
ON public.installation_status(current_step);

-- Enable RLS
ALTER TABLE public.installation_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view installation status" ON public.installation_status;
DROP POLICY IF EXISTS "Admins can update installation status" ON public.installation_status;

-- Allow anyone to read installation status
CREATE POLICY "Anyone can view installation status"
  ON public.installation_status FOR SELECT
  USING (true);

-- Only admins can update installation status
CREATE POLICY "Admins can update installation status"
  ON public.installation_status FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Verify
SELECT 'INSTALLATION STATUS TABLE CREATED' AS status,
       EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'installation_status') AS table_exists,
       (SELECT COUNT(*) FROM public.installation_status) AS row_count;
