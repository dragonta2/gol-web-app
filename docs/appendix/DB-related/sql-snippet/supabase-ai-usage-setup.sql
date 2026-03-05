/**
 * AI使用量記録テーブル・レート制限設定
 *
 * OpenAI APIの使用量を記録し、レート制限を管理するためのテーブル
 */

-- ============================================================================
-- 1. AI使用量記録テーブル（ai_usage_logs）
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- API種別（judgment, advice, story）
  api_type TEXT NOT NULL CHECK (api_type IN ('judgment', 'advice', 'story')),

  -- トークン使用量
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  -- コスト計算（USD）
  input_cost DECIMAL(10, 8) DEFAULT 0,
  output_cost DECIMAL(10, 8) DEFAULT 0,
  total_cost DECIMAL(10, 8) DEFAULT 0,

  -- モデル名
  model TEXT DEFAULT 'gpt-4o-mini',

  -- リクエスト情報
  request_payload TEXT,
  response_payload TEXT,

  -- ステータス
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'rate_limited')),
  error_message TEXT,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成（ユーザー別・日付別・API種別での検索を高速化）
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_date ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_api ON ai_usage_logs(user_id, api_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_date ON ai_usage_logs(created_at DESC);

-- 更新日時トリガー（このテーブルは挿入のみなので不要だが、一貫性のため）
-- CREATE TRIGGER update_ai_usage_logs_updated_at
-- BEFORE UPDATE ON ai_usage_logs
-- FOR EACH ROW
-- EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. RLS設定
-- ============================================================================

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分の使用量のみ閲覧可能
CREATE POLICY "Users can view own ai usage logs"
ON ai_usage_logs FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: 自分の使用量のみ記録可能（システム側で自動挿入）
CREATE POLICY "Users can insert own ai usage logs"
ON ai_usage_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. 使用量集計関数
-- ============================================================================

/**
 * ユーザーの今日の使用回数を取得
 */
CREATE OR REPLACE FUNCTION get_today_usage_count(
  p_user_id UUID,
  p_api_type TEXT
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM ai_usage_logs
    WHERE user_id = p_user_id
      AND api_type = p_api_type
      AND created_at >= CURRENT_DATE
      AND status = 'success'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * ユーザーの今月の使用回数を取得
 */
CREATE OR REPLACE FUNCTION get_monthly_usage_count(
  p_user_id UUID,
  p_api_type TEXT
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM ai_usage_logs
    WHERE user_id = p_user_id
      AND api_type = p_api_type
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
      AND status = 'success'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * ユーザーの今月の合計コストを取得
 */
CREATE OR REPLACE FUNCTION get_monthly_total_cost(
  p_user_id UUID
)
RETURNS DECIMAL(10, 8) AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(total_cost)
    FROM ai_usage_logs
    WHERE user_id = p_user_id
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
      AND status = 'success'
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * ユーザーの今日の合計コストを取得
 */
CREATE OR REPLACE FUNCTION get_today_total_cost(
  p_user_id UUID
)
RETURNS DECIMAL(10, 8) AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(total_cost)
    FROM ai_usage_logs
    WHERE user_id = p_user_id
      AND created_at >= CURRENT_DATE
      AND status = 'success'
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * ユーザーの使用量統計を取得（日別・API種別）
 */
CREATE OR REPLACE FUNCTION get_usage_statistics(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  api_type TEXT,
  request_count INTEGER,
  total_tokens BIGINT,
  total_cost DECIMAL(10, 8)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    api_type,
    COUNT(*)::INTEGER as request_count,
    SUM(total_tokens)::BIGINT as total_tokens,
    SUM(total_cost) as total_cost
  FROM ai_usage_logs
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    AND status = 'success'
  GROUP BY DATE(created_at), api_type
  ORDER BY date DESC, api_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
