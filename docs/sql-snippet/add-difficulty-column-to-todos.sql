-- ========================================
-- todosテーブルにdifficultyカラムを追加
-- ========================================
-- このファイルをSupabase SQL Editorで実行してください
-- ========================================

-- todosテーブルに難易度フィールドを追加
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium' 
  CHECK (difficulty IN ('trivial', 'easy', 'medium', 'hard'));

-- インデックスを作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_todos_difficulty ON todos(difficulty);

-- 既存データにデフォルト値を設定
UPDATE todos
SET difficulty = 'medium'
WHERE difficulty IS NULL;

-- 確認用クエリ（実行後、このクエリで確認できます）
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'todos'
-- AND column_name = 'difficulty';
