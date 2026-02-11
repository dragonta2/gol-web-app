-- daily_logsテーブルに「確定時に適用したデルタ」を記録するカラムを追加
--
-- 使用方法:
-- 1. Supabase SQL Editorでこのスクリプトを実行
-- 2. 確定取り消し時に profiles から正確に巻き戻すために使用する

ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS confirmed_points_delta INTEGER DEFAULT 0;

ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS confirmed_exp_body_delta INTEGER DEFAULT 0;

ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS confirmed_exp_mind_delta INTEGER DEFAULT 0;

ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS confirmed_exp_spirit_delta INTEGER DEFAULT 0;

-- 確認クエリ
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'daily_logs'
  AND column_name LIKE 'confirmed_%_delta';
