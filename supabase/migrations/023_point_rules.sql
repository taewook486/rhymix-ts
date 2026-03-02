-- Migration: point_rules table (WHW-042)
-- Sprint 3: Point System Rules
-- Creates point_rules table with 20 default point award/deduct rules

-- Create point_rules table
CREATE TABLE IF NOT EXISTS public.point_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Rule identification
  action TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Point configuration
  point INTEGER DEFAULT 0,
  revert_on_delete BOOLEAN DEFAULT FALSE,

  -- Limits
  daily_limit INTEGER DEFAULT NULL,
  per_content_limit INTEGER DEFAULT NULL,

  -- Exceptions
  except_notice BOOLEAN DEFAULT FALSE,
  except_admin BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, admin-only write
CREATE POLICY "Point rules are readable by all authenticated users"
  ON public.point_rules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage point rules"
  ON public.point_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_point_rules_action ON public.point_rules(action);
CREATE INDEX IF NOT EXISTS idx_point_rules_is_active ON public.point_rules(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_point_rules_updated_at
  BEFORE UPDATE ON public.point_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default point rules (WHW-042: 20+ rules)
INSERT INTO public.point_rules (action, name, point, revert_on_delete, description) VALUES
  -- 회원가입 (Member signup)
  ('signup', '회원가입', 100, FALSE, '회원가입 시 포인트 부여'),
  ('signup_referred', '추천인 회원가입', 100, FALSE, '추천인이 회원가입한 경우'),

  -- 로그인 (Login)
  ('login', '로그인', 10, FALSE, '일일 로그인 포인트'),

  -- 글 작성/삭제 (Document insert/delete)
  ('insert_document', '글 작성', 50, TRUE, '게시글 작성'),
  ('delete_document', '글 삭제', -50, FALSE, '게시글 삭제 (회수)'),

  -- 댓글 작성/삭제 (Comment insert/delete)
  ('insert_comment', '댓글 작성', 10, TRUE, '댓글 작성'),
  ('delete_comment', '댓글 삭제', -10, FALSE, '댓글 삭제 (회수)'),

  -- 파일 업로드/다운로드/삭제 (File upload/download/delete)
  ('upload_file', '파일 업로드', 5, TRUE, '파일 업로드'),
  ('download_file', '파일 다운로드', -5, FALSE, '파일 다운로드'),
  ('delete_file', '파일 삭제', -5, FALSE, '파일 삭제 (회수)'),

  -- 열람 (Read document)
  ('read_document', '글 열람', 0, FALSE, '게시글 열람'),

  -- 추천/비추천 (작성자) (Voted/Blamed - author)
  ('voted', '추천받음', 10, FALSE, '작성한 글이 추천받음'),
  ('blamed', '비추천받음', -5, FALSE, '작성한 글이 비추천받음'),

  -- 추천/비추천 (추천자) (Voter/Blamer - voter)
  ('voter', '추천함', 0, FALSE, '다른 글을 추천함'),
  ('blamer', '비추천함', 0, FALSE, '다른 글을 비추천함'),

  -- 댓글 추천/비추천 (Comment vote/blame)
  ('comment_voted', '댓글 추천받음', 5, FALSE, '작성한 댓글이 추천받음'),
  ('comment_blamed', '댓글 비추천받음', -3, FALSE, '작성한 댓글이 비추천받음'),

  -- 스크랩 (Scrap)
  ('scrap', '스크랩', 0, FALSE, '게시글 스크랩'),

  -- 신고 (Report)
  ('report', '신고함', 0, FALSE, '콘텐츠 신고'),
  ('reported', '신고당함', -20, FALSE, '콘텐츠가 신고당함')
ON CONFLICT (action) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.point_rules IS 'Point award/deduct rules for various actions (WHW-042)';
COMMENT ON COLUMN public.point_rules.action IS 'Unique action identifier (e.g., signup, login, insert_document)';
COMMENT ON COLUMN public.point_rules.point IS 'Points to award (positive) or deduct (negative)';
COMMENT ON COLUMN public.point_rules.revert_on_delete IS 'Whether to revert points when content is deleted';
COMMENT ON COLUMN public.point_rules.daily_limit IS 'Maximum times per day this rule can apply';
COMMENT ON COLUMN public.point_rules.per_content_limit IS 'Maximum times per content this rule can apply';
COMMENT ON COLUMN public.point_rules.except_notice IS 'Exclude notice posts from this rule';
COMMENT ON COLUMN public.point_rules.except_admin IS 'Exclude admin users from this rule';
