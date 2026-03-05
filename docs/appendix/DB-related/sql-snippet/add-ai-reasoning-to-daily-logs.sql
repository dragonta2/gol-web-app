-- AI判定の総評（reasoning）を保存するカラムを daily_logs に追加
-- 総評はページ遷移・確定後も永続表示するために必要
ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;

COMMENT ON COLUMN daily_logs.ai_reasoning IS 'AI判定の総評（判定理由）。一括生成時に設定され、常に表示するために永続化する。';
