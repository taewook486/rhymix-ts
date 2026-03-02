-- =====================================================
-- INSTALLATION STATUS TABLE
-- Run this to add the missing installation_status table
-- =====================================================

-- Create installation_status table
CREATE TABLE IF NOT EXISTS public.installation_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_installed BOOLEAN DEFAULT false,
  installed_at TIMESTAMPTZ,
  version TEXT DEFAULT '1.0.0',
  config JSONB DEFAULT '{}'
);

-- Insert default installation status
INSERT INTO public.installation_status (is_installed, installed_at, version, config)
VALUES (true, NOW(), '1.0.0', '{}'::jsonb)
ON CONFLICT DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_installation_status_is_installed
ON public.installation_status(is_installed);

-- Enable RLS
ALTER TABLE public.installation_status ENABLE ROW LEVEL SECURITY;

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
