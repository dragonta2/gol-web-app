-- ========================================
-- 重複ToDo削除スクリプト
-- ========================================
-- このファイルをSupabase SQL Editorで実行してください
-- ========================================
-- 
-- 重複の定義: 同じuser_idで同じtask_nameのToDoが複数存在する場合
-- 削除方針: 最新のもの（created_atが最新）を残し、古いものを削除
-- ========================================

-- ----------------------------------------
-- 1. 重複確認（実行前に確認してください）
-- ----------------------------------------

-- 重複しているToDoの一覧を表示
SELECT 
  user_id,
  task_name,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at DESC) as todo_ids,
  array_agg(created_at ORDER BY created_at DESC) as created_dates
FROM todos
GROUP BY user_id, task_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, user_id, task_name;

-- ----------------------------------------
-- 2. 削除対象の確認（削除されるToDoの一覧）
-- ----------------------------------------

-- 削除されるToDoのIDと情報を表示
WITH ranked_todos AS (
  SELECT 
    id,
    user_id,
    task_name,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, task_name 
      ORDER BY created_at DESC
    ) as rn
  FROM todos
)
SELECT 
  id,
  user_id,
  task_name,
  status,
  created_at,
  '削除対象' as action
FROM ranked_todos
WHERE rn > 1
ORDER BY user_id, task_name, created_at DESC;

-- ----------------------------------------
-- 3. 関連データの確認（削除前に確認）
-- ----------------------------------------

-- 削除対象のToDoに関連するtodo_logsの数
WITH ranked_todos AS (
  SELECT 
    id,
    user_id,
    task_name,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, task_name 
      ORDER BY created_at DESC
    ) as rn
  FROM todos
),
todos_to_delete AS (
  SELECT id
  FROM ranked_todos
  WHERE rn > 1
)
SELECT 
  'todo_logs' as related_table,
  COUNT(*) as related_count
FROM todo_logs
WHERE todo_id IN (SELECT id FROM todos_to_delete)
UNION ALL
SELECT 
  'todo_subtasks' as related_table,
  COUNT(*) as related_count
FROM todo_subtasks
WHERE todo_id IN (SELECT id FROM todos_to_delete)
UNION ALL
SELECT 
  'todo_tags' as related_table,
  COUNT(*) as related_count
FROM todo_tags
WHERE todo_id IN (SELECT id FROM todos_to_delete);

-- ----------------------------------------
-- 4. 重複ToDoの削除（実行前に上記を確認してください）
-- ----------------------------------------

-- ⚠️ 注意: このクエリは実際にデータを削除します
-- 実行前に必ず上記の確認クエリを実行してください

-- 関連データ（todo_logs, todo_subtasks, todo_tags）も一緒に削除されます
-- （CASCADE制約により自動削除）

WITH ranked_todos AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, task_name 
      ORDER BY created_at DESC
    ) as rn
  FROM todos
),
todos_to_delete AS (
  SELECT id
  FROM ranked_todos
  WHERE rn > 1
)
DELETE FROM todos
WHERE id IN (SELECT id FROM todos_to_delete);

-- ----------------------------------------
-- 5. 削除後の確認
-- ----------------------------------------

-- 重複がなくなったか確認
SELECT 
  user_id,
  task_name,
  COUNT(*) as count
FROM todos
GROUP BY user_id, task_name
HAVING COUNT(*) > 1;

-- 結果が0件なら重複はありません

-- ----------------------------------------
-- 6. 統計情報
-- ----------------------------------------

-- 削除前後の比較用（削除前に実行して記録しておくことを推奨）
SELECT 
  COUNT(*) as total_todos,
  COUNT(DISTINCT (user_id, task_name)) as unique_todos,
  COUNT(*) - COUNT(DISTINCT (user_id, task_name)) as duplicate_count
FROM todos;
