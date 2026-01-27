-- ========================================
-- todo_subtasksテーブル作成（Phase 3）
-- ========================================
-- 
-- 実行方法:
-- 1. Supabaseダッシュボードを開く
-- 2. SQL Editor → New query
-- 3. このファイルの内容をコピー&ペースト
-- 4. Run をクリック
--
-- ========================================

-- ----------------------------------------
-- todo_subtasksテーブル作成
-- ----------------------------------------

CREATE TABLE IF NOT EXISTS todo_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  subtask_name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_todo_subtasks_todo ON todo_subtasks(todo_id, display_order);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_todo_subtasks_updated_at
BEFORE UPDATE ON todo_subtasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------
-- RLS有効化
-- ----------------------------------------

ALTER TABLE todo_subtasks ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------
-- RLSポリシー設定
-- ----------------------------------------

-- SELECT: 自分のToDoサブタスクのみ閲覧可能
CREATE POLICY "Users can view own todo subtasks"
ON todo_subtasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_subtasks.todo_id
    AND todos.user_id = auth.uid()
  )
);

-- INSERT: 自分のToDoサブタスクのみ作成可能
CREATE POLICY "Users can insert own todo subtasks"
ON todo_subtasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_subtasks.todo_id
    AND todos.user_id = auth.uid()
  )
);

-- UPDATE: 自分のToDoサブタスクのみ更新可能
CREATE POLICY "Users can update own todo subtasks"
ON todo_subtasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_subtasks.todo_id
    AND todos.user_id = auth.uid()
  )
);

-- DELETE: 自分のToDoサブタスクのみ削除可能
CREATE POLICY "Users can delete own todo subtasks"
ON todo_subtasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_subtasks.todo_id
    AND todos.user_id = auth.uid()
  )
);

