-- habitsテーブルに difficulty カラムを追加
--
-- 使用方法:
-- 1. Supabase SQL Editorでこのスクリプトを実行
-- 2. 習慣の作成・更新で「difficulty カラムが見つからない」エラーが出る場合に実行
-- 3. 既存レコードは difficulty = 'medium' で初期化される

ALTER TABLE habits
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium'
  CHECK (difficulty IN ('easy', 'medium', 'hard'));

CREATE INDEX IF NOT EXISTS idx_habits_difficulty ON habits(difficulty);

UPDATE habits
SET difficulty = 'medium'
WHERE difficulty IS NULL;

-- 確認
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'habits'
  AND column_name = 'difficulty';
