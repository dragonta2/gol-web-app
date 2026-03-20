-- ========================================
-- todosテーブルに重複防止制約を追加
-- ========================================
-- このファイルをSupabase SQL Editorで実行してください
-- ========================================
-- 
-- 目的: 同じユーザーで同じtask_nameのToDoが重複作成されることを防ぐ
-- ========================================

-- ----------------------------------------
-- 1. 現在の重複確認（制約追加前に確認）
-- ----------------------------------------

-- 重複がある場合は制約追加が失敗するため、事前に確認
SELECT 
  user_id,
  task_name,
  COUNT(*) as duplicate_count
FROM todos
GROUP BY user_id, task_name
HAVING COUNT(*) > 1;

-- 結果が0件であることを確認してから次に進んでください
-- 重複がある場合は、先にremove-duplicate-todos.sqlを実行してください

-- ----------------------------------------
-- 2. 既存の制約確認
-- ----------------------------------------

-- 既存のUNIQUE制約を確認
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'todos'
AND constraint_type = 'UNIQUE';

-- ----------------------------------------
-- 3. UNIQUE制約の追加
-- ----------------------------------------

-- 既存の制約を削除（存在する場合）
ALTER TABLE todos
DROP CONSTRAINT IF EXISTS todos_user_id_task_name_unique;

-- UNIQUE制約を追加
-- 同じuser_idとtask_nameの組み合わせは1つだけ許可
ALTER TABLE todos
ADD CONSTRAINT todos_user_id_task_name_unique
UNIQUE (user_id, task_name);

-- ----------------------------------------
-- 4. 制約追加の確認
-- ----------------------------------------

-- 制約が正しく追加されたか確認
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'todos'
AND constraint_name = 'todos_user_id_task_name_unique';

-- 制約の詳細を確認
SELECT 
  tc.constraint_name,
  kcu.column_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'todos'
AND tc.constraint_name = 'todos_user_id_task_name_unique'
ORDER BY kcu.ordinal_position;

-- ----------------------------------------
-- 5. 動作確認（オプション）
-- ----------------------------------------

-- テスト: 同じuser_idとtask_nameでToDoを作成しようとするとエラーになる
-- 以下のクエリはエラーになるはずです（実際には実行しないでください）
-- 
-- INSERT INTO todos (user_id, task_name, status)
-- VALUES (
--   (SELECT user_id FROM todos LIMIT 1),
--   (SELECT task_name FROM todos LIMIT 1),
--   'active'
-- );
-- 
-- エラーメッセージ例:
-- ERROR: duplicate key value violates unique constraint "todos_user_id_task_name_unique"
