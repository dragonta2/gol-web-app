-- ========================================
-- GOL Web版｜タグ・難易度機能｜データベース構築SQL
-- ========================================
-- このファイルをSupabase SQL Editorで実行してください
-- ========================================

-- ========================================
-- 1. 新規テーブル作成
-- ========================================

-- ----------------------------------------
-- 1-1. tags（タグマスタ）
-- ----------------------------------------

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_color TEXT DEFAULT '#3b82f6', -- タグの色（HEX形式、デフォルトは青）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, tag_name) -- 1ユーザー内でタグ名は一意
);

CREATE INDEX idx_tags_user ON tags(user_id);
CREATE INDEX idx_tags_name ON tags(tag_name);

CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------
-- 1-2. habit_tags（習慣-タグ関連）
-- ----------------------------------------

CREATE TABLE habit_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(habit_id, tag_id) -- 1習慣に同じタグは1つまで
);

CREATE INDEX idx_habit_tags_habit ON habit_tags(habit_id);
CREATE INDEX idx_habit_tags_tag ON habit_tags(tag_id);

-- ----------------------------------------
-- 1-3. todo_tags（ToDo-タグ関連）
-- ----------------------------------------

CREATE TABLE todo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(todo_id, tag_id) -- 1ToDoに同じタグは1つまで
);

CREATE INDEX idx_todo_tags_todo ON todo_tags(todo_id);
CREATE INDEX idx_todo_tags_tag ON todo_tags(tag_id);

-- ========================================
-- 2. 既存テーブルの拡張
-- ========================================

-- ----------------------------------------
-- 2-1. habitsテーブルに難易度フィールドを追加
-- ----------------------------------------

ALTER TABLE habits
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium' 
  CHECK (difficulty IN ('trivial', 'easy', 'medium', 'hard'));

CREATE INDEX IF NOT EXISTS idx_habits_difficulty ON habits(difficulty);

-- 既存データにデフォルト値を設定
UPDATE habits
SET difficulty = 'medium'
WHERE difficulty IS NULL;

-- ----------------------------------------
-- 2-2. todosテーブルに難易度フィールドを追加
-- ----------------------------------------

ALTER TABLE todos
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium' 
  CHECK (difficulty IN ('trivial', 'easy', 'medium', 'hard'));

CREATE INDEX IF NOT EXISTS idx_todos_difficulty ON todos(difficulty);

-- 既存データにデフォルト値を設定
UPDATE todos
SET difficulty = 'medium'
WHERE difficulty IS NULL;

-- ========================================
-- 3. RLS（Row Level Security）設定
-- ========================================

-- ----------------------------------------
-- 3-1. tagsテーブルのRLS
-- ----------------------------------------

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

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
-- 3-2. habit_tagsテーブルのRLS
-- ----------------------------------------

ALTER TABLE habit_tags ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分の習慣のタグのみ閲覧可能
CREATE POLICY "Users can view own habit tags"
ON habit_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM habits
    WHERE habits.id = habit_tags.habit_id
    AND habits.user_id = auth.uid()
  )
);

-- INSERT: 自分の習慣のタグのみ作成可能
CREATE POLICY "Users can insert own habit tags"
ON habit_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM habits
    WHERE habits.id = habit_tags.habit_id
    AND habits.user_id = auth.uid()
  )
);

-- DELETE: 自分の習慣のタグのみ削除可能
CREATE POLICY "Users can delete own habit tags"
ON habit_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM habits
    WHERE habits.id = habit_tags.habit_id
    AND habits.user_id = auth.uid()
  )
);

-- ----------------------------------------
-- 3-3. todo_tagsテーブルのRLS
-- ----------------------------------------

ALTER TABLE todo_tags ENABLE ROW LEVEL SECURITY;

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
-- 4. 動作確認用クエリ
-- ========================================

-- テーブル一覧確認
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public'
-- AND table_name IN ('tags', 'habit_tags', 'todo_tags');

-- tagsテーブルの構造確認
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'tags';

-- habitsテーブルにdifficultyカラムが追加されたか確認
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'habits'
-- AND column_name = 'difficulty';

-- todosテーブルにdifficultyカラムが追加されたか確認
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'todos'
-- AND column_name = 'difficulty';
