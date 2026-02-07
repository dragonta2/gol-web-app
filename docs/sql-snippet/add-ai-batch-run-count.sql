-- 一括生成の実行回数（1日2回まで）を記録するカラム
-- daily_logs に追加。未適用の場合は 0 として扱う想定。
ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS ai_batch_run_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN daily_logs.ai_batch_run_count IS 'AI一括生成（判定+あらすじ+アドバイス）の実行回数。1日2回まで。';
