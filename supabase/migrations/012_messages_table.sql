-- =====================================================
-- Messages Table Migration
-- =====================================================
-- 개인 메시지 시스템을 위한 테이블 생성
-- Phase 12: Personal Message System
-- =====================================================

-- Messages 테이블 생성
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_sender_deleted BOOLEAN DEFAULT FALSE,
  is_receiver_deleted BOOLEAN DEFAULT FALSE,
  sender_deleted_at TIMESTAMPTZ,
  receiver_deleted_at TIMESTAMPTZ,
  parent_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON public.messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);

-- Messages Full-Text Search 인덱스
CREATE INDEX IF NOT EXISTS idx_messages_title_search ON public.messages USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON public.messages USING GIN(to_tsvector('english', content));

-- Message blocks 테이블 생성 (차단 기능)
CREATE TABLE IF NOT EXISTS public.message_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Message blocks 인덱스
CREATE INDEX IF NOT EXISTS idx_message_blocks_blocker_id ON public.message_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_message_blocks_blocked_id ON public.message_blocks(blocked_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_blocks ENABLE ROW LEVEL SECURITY;

-- Messages RLS 정책
-- 사용자는 자신이 보내거나 받은 메시지만 볼 수 있음
DROP POLICY IF EXISTS messages_select_policy ON public.messages;
CREATE POLICY messages_select_policy ON public.messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR
    auth.uid() = receiver_id
  );

-- 사용자는 메시지를 보낼 수 있음
DROP POLICY IF EXISTS messages_insert_policy ON public.messages;
CREATE POLICY messages_insert_policy ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- 사용자는 받은 메시지를 읽음 표시할 수 있음
DROP POLICY IF EXISTS messages_update_read_policy ON public.messages;
CREATE POLICY messages_update_read_policy ON public.messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (
    -- 읽음 상태만 변경 가능
    CASE
      WHEN is_read IS DISTINCT FROM FALSE THEN auth.uid() = receiver_id
      ELSE TRUE
    END
  );

-- 보낸 사람은 메시지를 삭제 표시할 수 있음
DROP POLICY IF EXISTS messages_update_sender_delete_policy ON public.messages;
CREATE POLICY messages_update_sender_delete_policy ON public.messages
  FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (
    -- 보낸 사람 삭제 상태만 변경 가능
    CASE
      WHEN is_sender_deleted IS DISTINCT FROM FALSE THEN auth.uid() = sender_id
      ELSE TRUE
    END
  );

-- 받은 사람은 메시지를 삭제 표시할 수 있음
DROP POLICY IF EXISTS messages_update_receiver_delete_policy ON public.messages;
CREATE POLICY messages_update_receiver_delete_policy ON public.messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (
    -- 받은 사람 삭제 상태만 변경 가능
    CASE
      WHEN is_receiver_deleted IS DISTINCT FROM FALSE THEN auth.uid() = receiver_id
      ELSE TRUE
    END
  );

-- Message blocks RLS 정책
-- 사용자는 자신이 차단한 목록만 볼 수 있음
DROP POLICY IF EXISTS message_blocks_select_policy ON public.message_blocks;
CREATE POLICY message_blocks_select_policy ON public.message_blocks
  FOR SELECT
  USING (auth.uid() = blocker_id);

-- 사용자는 다른 사용자를 차단할 수 있음
DROP POLICY IF EXISTS message_blocks_insert_policy ON public.message_blocks;
CREATE POLICY message_blocks_insert_policy ON public.message_blocks
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- 사용자는 차단을 해제할 수 있음
DROP POLICY IF EXISTS message_blocks_delete_policy ON public.message_blocks;
CREATE POLICY message_blocks_delete_policy ON public.message_blocks
  FOR DELETE
  USING (auth.uid() = blocker_id);

-- 함수: 차단된 사용자인지 확인
CREATE OR REPLACE FUNCTION public.is_blocked(p_user_id UUID, p_target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.message_blocks
    WHERE blocker_id = p_target_id
      AND blocked_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수: 받은편지함 메시지 수 (삭제되지 않은 메시지만)
CREATE OR REPLACE FUNCTION public.count_inbox_messages(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.messages
    WHERE receiver_id = p_user_id
      AND is_receiver_deleted = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수: 보낸편지함 메시지 수 (삭제되지 않은 메시지만)
CREATE OR REPLACE FUNCTION public.count_sent_messages(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.messages
    WHERE sender_id = p_user_id
      AND is_sender_deleted = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수: 읽지 않은 메시지 수
CREATE OR REPLACE FUNCTION public.count_unread_messages(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.messages
    WHERE receiver_id = p_user_id
      AND is_read = FALSE
      AND is_receiver_deleted = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거: updated_at 자동 업데이트
DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 주석
COMMENT ON TABLE public.messages IS 'Personal messages between users';
COMMENT ON COLUMN public.messages.sender_id IS 'Message sender user ID';
COMMENT ON COLUMN public.messages.receiver_id IS 'Message receiver user ID';
COMMENT ON COLUMN public.messages.title IS 'Message title';
COMMENT ON COLUMN public.messages.content IS 'Message content';
COMMENT ON COLUMN public.messages.is_read IS 'Whether the message has been read';
COMMENT ON COLUMN public.messages.read_at IS 'Timestamp when message was read';
COMMENT ON COLUMN public.messages.is_sender_deleted IS 'Whether sender deleted this message';
COMMENT ON COLUMN public.messages.is_receiver_deleted IS 'Whether receiver deleted this message';
COMMENT ON COLUMN public.messages.parent_id IS 'Parent message ID for threaded messages';

COMMENT ON TABLE public.message_blocks IS 'User block list for messages';
COMMENT ON COLUMN public.message_blocks.blocker_id IS 'User who blocked someone';
COMMENT ON COLUMN public.message_blocks.blocked_id IS 'User who was blocked';

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
