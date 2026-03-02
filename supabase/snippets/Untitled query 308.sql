-- =====================================================
-- FIX INSTALLATION STATUS TABLE
-- Add missing columns to match the code expectations
-- =====================================================

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'));
  END IF;

  -- Add current_step column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'current_step'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN current_step INTEGER DEFAULT 1;
  END IF;

  -- Add site_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'site_name'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN site_name TEXT;
  END IF;

  -- Add admin_email column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'admin_email'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN admin_email TEXT;
  END IF;

  -- Add error_message column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN error_message TEXT;
  END IF;

  -- Add step_data column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'step_data'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN step_data JSONB DEFAULT '{}';
  END IF;

  -- Add created_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Add updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Update existing row to have correct default values
UPDATE public.installation_status
SET
  status = COALESCE(status, 'pending'),
  current_step = COALESCE(current_step, 1),
  step_data = COALESCE(step_data, '{}'::jsonb),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE id IS NOT NULL;

-- Verify columns added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'installation_status'
ORDER BY ordinal_position;
