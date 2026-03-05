-- ========================================
-- todo_tagsテーブル作成（tagsテーブルも含む）
-- ========================================
-- このファイルをSupabase SQL Editorで実行してください
-- ========================================

-- ----------------------------------------
-- 1. tags（タグマスタ）テーブル作成
-- ----------------------------------------

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_color TEXT DEFAULT '#3b82f6', -- タグの色（HEX形式、デフォルトは青）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, tag_name) -- 1ユーザー内でタグ名は一意
);

CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(tag_name);

-- updated_at自動更新トリガー（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_tags_updated_at'
  ) THEN
    CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ----------------------------------------
-- tagsテーブルのRLS設定
-- ----------------------------------------

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON tags;
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON tags;

-- SELECT: 自分のタグのみ閲覧可能
CREATE POLICY "Users can view own tags"
ON tags FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: 自分のタグのみ作成可能
CREATE POLICY "Users can insert own tags"
ON tags FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: 自分のタグのみ更新可能
CREATE POLICY "Users can update own tags"
ON tags FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: 自分のタグのみ削除可能
CREATE POLICY "Users can delete own tags"
ON tags FOR DELETE
USING (auth.uid() = user_id);

-- ----------------------------------------
-- 2. todo_tags（ToDo-タグ関連）テーブル作成
-- ----------------------------------------

CREATE TABLE IF NOT EXISTS todo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(todo_id, tag_id) -- 1ToDoに同じタグは1つまで
);

CREATE INDEX IF NOT EXISTS idx_todo_tags_todo ON todo_tags(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_tags_tag ON todo_tags(tag_id);

-- ========================================
-- RLS（Row Level Security）設定
-- ========================================

ALTER TABLE todo_tags ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view own todo tags" ON todo_tags;
DROP POLICY IF EXISTS "Users can insert own todo tags" ON todo_tags;
DROP POLICY IF EXISTS "Users can delete own todo tags" ON todo_tags;

-- SELECT: 自分のToDoのタグのみ閲覧可能
CREATE POLICY "Users can view own todo tags"
ON todo_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_tags.todo_id
    AND todos.user_id = auth.uid()
  )
);

-- INSERT: 自分のToDoのタグのみ作成可能
CREATE POLICY "Users can insert own todo tags"
ON todo_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_tags.todo_id
    AND todos.user_id = auth.uid()
  )
);

-- DELETE: 自分のToDoのタグのみ削除可能
CREATE POLICY "Users can delete own todo tags"
ON todo_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_tags.todo_id
    AND todos.user_id = auth.uid()
  )
);

-- ========================================
-- 確認用クエリ
-- ========================================

-- todo_tagsテーブルが作成されたか確認
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public'
-- AND table_name = 'todo_tags';

-- todo_tagsテーブルの構造確認
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'todo_tags'
-- ORDER BY ordinal_position;
