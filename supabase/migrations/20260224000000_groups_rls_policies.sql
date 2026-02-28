-- Enable RLS on groups table
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "groups_select_authenticated" ON public.groups;
DROP POLICY IF EXISTS "groups_select_admin" ON public.groups;

-- Policy: Authenticated users can view all groups
CREATE POLICY "groups_select_authenticated" ON public.groups
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins can insert groups
CREATE POLICY "groups_insert_admin" ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can update groups
CREATE POLICY "groups_update_admin" ON public.groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can delete non-system groups
CREATE POLICY "groups_delete_admin" ON public.groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND is_system = false
  );
