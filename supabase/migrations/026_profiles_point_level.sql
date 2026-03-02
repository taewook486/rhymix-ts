-- Migration: Extend profiles table with point and level columns
-- Sprint 3: Point System User Data
-- Adds point and level columns to profiles table for point system

-- Add point and level columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS point INTEGER DEFAULT 0 CHECK (point >= 0),
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 CHECK (level >= 1);

-- Create indexes for point and level queries
CREATE INDEX IF NOT EXISTS idx_profiles_point ON public.profiles(point DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level);

-- Add comments
COMMENT ON COLUMN public.profiles.point IS 'Current user point total (awarded - deducted)';
COMMENT ON COLUMN public.profiles.level IS 'Current user level (calculated from point: sqrt(point/100))';

-- Create point_logs table for audit trail (optional but recommended)
CREATE TABLE IF NOT EXISTS public.point_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  point INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for point_logs
ALTER TABLE public.point_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own point logs"
  ON public.point_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all point logs"
  ON public.point_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert point logs"
  ON public.point_logs FOR INSERT
  WITH CHECK (true);

-- Create indexes for point_logs
CREATE INDEX IF NOT EXISTS idx_point_logs_user_id ON public.point_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_point_logs_created_at ON public.point_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_logs_action ON public.point_logs(action);

-- Add comments for point_logs
COMMENT ON TABLE public.point_logs IS 'Audit trail of all point changes';
COMMENT ON COLUMN public.point_logs.user_id IS 'User who received/deducted points';
COMMENT ON COLUMN public.point_logs.action IS 'Action that triggered point change (e.g., signup, login)';
COMMENT ON COLUMN public.point_logs.point IS 'Points awarded (positive) or deducted (negative)';
COMMENT ON COLUMN public.point_logs.balance_after IS 'User point balance after this change';
COMMENT ON COLUMN public.point_logs.reference_type IS 'Type of reference (e.g., document, comment)';
COMMENT ON COLUMN public.point_logs.reference_id IS 'ID of referenced content';
COMMENT ON COLUMN public.point_logs.ip_address IS 'IP address of user (for fraud detection)';
