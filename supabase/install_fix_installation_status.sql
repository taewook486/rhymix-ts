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
    ALTER TABLE public.installation_status ADD COLUMN current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 6);
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

  -- Add error_details column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'error_details'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN error_details JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add admin_user_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'admin_user_id'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN admin_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add timezone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN timezone TEXT DEFAULT 'Asia/Seoul';
  END IF;

  -- Add language column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'language'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN language TEXT DEFAULT 'ko';
  END IF;

  -- Add supabase_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'supabase_url'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN supabase_url TEXT;
  END IF;

  -- Add supabase_anon_key column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'supabase_anon_key'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN supabase_anon_key TEXT;
  END IF;

  -- Add started_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN started_at TIMESTAMPTZ;
  END IF;

  -- Add completed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;

  -- Add step_data column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_status' AND column_name = 'step_data'
  ) THEN
    ALTER TABLE public.installation_status ADD COLUMN step_data JSONB DEFAULT '{}'::jsonb;
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
  timezone = COALESCE(timezone, 'Asia/Seoul'),
  language = COALESCE(language, 'ko'),
  step_data = COALESCE(step_data, '{}'::jsonb),
  error_details = COALESCE(error_details, '{}'::jsonb),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE id IS NOT NULL;

-- Verify columns added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'installation_status'
ORDER BY ordinal_position;
