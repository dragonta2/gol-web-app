-- daily_logsテーブルに「確定」フラグを追加
-- 
-- 使用方法:
-- 1. Supabase SQL Editorでこのスクリプトを実行
-- 2. 既存のレコードはすべて未確定（false）として初期化される

-- is_confirmedカラムを追加（デフォルトはfalse = 未確定）
ALTER TABLE daily_logs 
ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT false;

-- 確認クエリ
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'daily_logs' 
  AND column_name = 'is_confirmed';
