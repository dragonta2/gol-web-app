-- ============================================
-- ランク変更ログテーブル
-- ============================================
--
-- レベルアップ時に「〇〇 → △△」の履歴を記録
--
-- 実行手順:
-- 1. Supabase Dashboard → SQL Editor を開く
-- 2. このスクリプトを実行
-- ============================================

CREATE TABLE IF NOT EXISTS rank_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rank_change_logs_user_id ON rank_change_logs(user_id);
CREATE INDEX idx_rank_change_logs_changed_at ON rank_change_logs(user_id, changed_at DESC);

COMMENT ON TABLE rank_change_logs IS 'ランク（レベル）変更履歴。from_level, to_level からランク名は表示時に計算';

ALTER TABLE rank_change_logs ENABLE ROW LEVEL SECURITY;

-- 自分のログのみ読み取り可能
CREATE POLICY "Users can read own rank change logs"
ON rank_change_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 自分のログのみ挿入可能（レベルアップ検知時にアプリが挿入）
CREATE POLICY "Users can insert own rank change logs"
ON rank_change_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
