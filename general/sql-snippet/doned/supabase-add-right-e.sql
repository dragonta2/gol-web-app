-- 権利E（朝食 or 昼食を食べる）を追加するマイグレーションスクリプト
-- 
-- 使用方法:
-- 1. Supabase SQL Editorでこのスクリプトを実行
-- 2. 既存のdaily_logsテーブルにright_e_countカラムを追加

-- right_e_countカラムを追加（既に存在する場合はエラーになるが、問題なし）
ALTER TABLE daily_logs 
ADD COLUMN IF NOT EXISTS right_e_count INTEGER DEFAULT 0;

-- 既存のレコードを0で初期化（念のため）
UPDATE daily_logs 
SET right_e_count = 0 
WHERE right_e_count IS NULL;

-- カラムにNOT NULL制約を追加（デフォルト値があるので既存データに影響なし）
ALTER TABLE daily_logs 
ALTER COLUMN right_e_count SET NOT NULL,
ALTER COLUMN right_e_count SET DEFAULT 0;

-- 確認クエリ（実行結果を確認）
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_logs' 
  AND column_name = 'right_e_count';
