-- =====================================================
-- RHYMIX-TS Notification Logs Database Schema
-- Supabase PostgreSQL 16 Migration
-- Migration: 029_notification_logs
-- Created: 2026-03-02
-- Purpose: 발송 내역 로그 (Notification Delivery Logs) - UC-008
-- WHW-072: 발송 로그 (Delivery Logs)
-- =====================================================

-- =====================================================
-- NOTIFICATION_LOGS TABLE (Notification delivery history)
-- Tracks all notification delivery attempts and results
-- =====================================================

CREATE TABLE public.notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Recipient information
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_address TEXT, -- Email, phone number, or device token

  -- Notification content
  notification_type TEXT CHECK (notification_type IN (
    'signup', 'login', 'document', 'comment',
    'vote', 'scrap', 'mention', 'message', 'system'
  )),
  channel TEXT CHECK (channel IN ('email', 'sms', 'push', 'web')),
  subject TEXT,
  content TEXT,

  -- Delivery status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'sending', 'sent', 'failed', 'bounced', 'rejected'
  )),
  error_message TEXT,
  error_code TEXT,

  -- Delivery metadata
  external_id TEXT, -- External provider message ID
  template_id TEXT, -- Template used for this notification
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1=highest, 10=lowest

  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- Reference to related content
  reference_type TEXT CHECK (reference_type IN (
    'document', 'comment', 'message', 'board', 'member', 'system'
  )),
  reference_id UUID,

  -- Client information
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

-- Indexes for notification_logs
CREATE INDEX idx_notification_logs_user_id ON public.notification_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_notification_logs_channel ON public.notification_logs(channel);
CREATE INDEX idx_notification_logs_notification_type ON public.notification_logs(notification_type);
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
CREATE INDEX idx_notification_logs_reference ON public.notification_logs(reference_type, reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX idx_notification_logs_next_retry ON public.notification_logs(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX idx_notification_logs_status_created ON public.notification_logs(status, created_at DESC);

-- Composite index for dashboard queries
CREATE INDEX idx_notification_logs_user_status_time ON public.notification_logs(user_id, status, created_at DESC) WHERE user_id IS NOT NULL;

-- RLS Policies for notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
  ON public.notification_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification logs"
  ON public.notification_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert notification logs"
  ON public.notification_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update notification logs"
  ON public.notification_logs FOR UPDATE USING (true);

-- =====================================================
-- NOTIFICATION_LOG_RETENTION POLICY
-- Automatically delete logs older than retention period
-- =====================================================

-- Function to delete old notification logs
CREATE OR REPLACE FUNCTION delete_old_notification_logs()
RETURNS void AS $$
BEGIN
  -- Get retention period from notification_settings
  DELETE FROM public.notification_logs
  WHERE created_at < (
    SELECT NOW() - (notification_retention_days || ' days')::interval
    FROM public.notification_settings
    LIMIT 1
  );

  -- If notification_settings is empty, default to 90 days
  DELETE FROM public.notification_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AGGREGATION VIEWS (Dashboard statistics)
-- =====================================================

-- Daily notification statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS notification_daily_stats AS
SELECT
  DATE(created_at) AS date,
  notification_type,
  channel,
  status,
  COUNT(*) AS count,
  COUNT(DISTINCT user_id) AS unique_recipients
FROM public.notification_logs
GROUP BY DATE(created_at), notification_type, channel, status
ORDER BY date DESC, notification_type, channel;

-- Create index for efficient refresh
CREATE UNIQUE INDEX idx_notification_daily_stats_date ON notification_daily_stats(date, notification_type, channel, status);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_notification_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY notification_daily_stats;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get notification statistics for a user
CREATE OR REPLACE FUNCTION get_user_notification_stats(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT,
  delivery_rate NUMERIC,
  by_channel JSONB,
  by_type JSONB
) AS $$
DECLARE
  v_total_sent BIGINT;
  v_total_delivered BIGINT;
  v_total_failed BIGINT;
BEGIN
  -- Get counts
  SELECT
    COUNT(*) FILTER (WHERE status IN ('sent', 'delivered')),
    COUNT(*) FILTER (WHERE status = 'delivered'),
    COUNT(*) FILTER (WHERE status IN ('failed', 'bounced', 'rejected'))
  INTO v_total_sent, v_total_delivered, v_total_failed
  FROM public.notification_logs
  WHERE user_id = p_user_id
    AND created_at > NOW() - (p_days || ' days')::interval;

  -- Return results
  RETURN QUERY
  SELECT
    v_total_sent,
    v_total_delivered,
    v_total_failed,
    CASE
      WHEN v_total_sent > 0 THEN
        ROUND((v_total_delivered::NUMERIC / v_total_sent::NUMERIC) * 100, 2)
      ELSE 0
    END,
    (
      SELECT jsonb_object_agg(channel, count)
      FROM (
        SELECT channel, COUNT(*) AS count
        FROM public.notification_logs
        WHERE user_id = p_user_id
          AND created_at > NOW() - (p_days || ' days')::interval
          AND status IN ('sent', 'delivered')
        GROUP BY channel
      ) sub
    ),
    (
      SELECT jsonb_object_agg(notification_type, count)
      FROM (
        SELECT notification_type, COUNT(*) AS count
        FROM public.notification_logs
        WHERE user_id = p_user_id
          AND created_at > NOW() - (p_days || ' days')::interval
          AND status IN ('sent', 'delivered')
        GROUP BY notification_type
      ) sub
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Update read_at timestamp when notification is read
-- =====================================================

CREATE OR REPLACE FUNCTION mark_notification_as_read()
RETURNS TRIGGER AS $$
BEGIN
  -- This function would be called by application logic
  -- when a user marks a notification as read
  NEW.read_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION delete_old_notification_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_notification_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_stats(UUID, INTEGER) TO authenticated;

-- Grant select on materialized view
GRANT SELECT ON notification_daily_stats TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
