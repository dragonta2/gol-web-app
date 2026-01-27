-- ============================================
-- ユーザーデータ削除スクリプト
-- ============================================
-- 
-- このスクリプトは、特定のユーザーの全データを削除します。
-- 注意: 実行前に必ずバックアップを取ってください。
--
-- 使用方法:
-- 1. 削除したいユーザーのUUIDを確認
-- 2. 以下のSQLの'ユーザーID（UUID）'を実際のUUIDに置き換える
-- 3. Supabase SQL Editorで実行
-- ============================================

-- ============================================
-- 1. 特定ユーザーの全データを削除
-- ============================================
-- 注意: このSQLを実行すると、指定したユーザーの全データが削除されます
-- 削除されるテーブル（外部キー制約により自動削除）:
-- - daily_logs
-- - habits
-- - habit_logs
-- - todos
-- - todo_logs
-- - todo_subtasks
-- - ai_usage_logs
-- - profiles

-- 削除したいユーザーのUUIDを設定
DO $$
DECLARE
  target_user_id UUID := 'ユーザーID（UUID）'; -- ← ここを実際のUUIDに置き換える
BEGIN
  -- 削除前にデータ件数を確認（ログ出力）
  RAISE NOTICE '削除対象ユーザーID: %', target_user_id;
  RAISE NOTICE 'daily_logs: %件', (SELECT COUNT(*) FROM daily_logs WHERE user_id = target_user_id);
  RAISE NOTICE 'habits: %件', (SELECT COUNT(*) FROM habits WHERE user_id = target_user_id);
  RAISE NOTICE 'habit_logs: %件', (SELECT COUNT(*) FROM habit_logs WHERE user_id = target_user_id);
  RAISE NOTICE 'todos: %件', (SELECT COUNT(*) FROM todos WHERE user_id = target_user_id);
  RAISE NOTICE 'todo_logs: %件', (SELECT COUNT(*) FROM todo_logs WHERE user_id = target_user_id);
  RAISE NOTICE 'ai_usage_logs: %件', (SELECT COUNT(*) FROM ai_usage_logs WHERE user_id = target_user_id);
  
  -- データを削除（外部キー制約により、profilesを削除すると関連データも自動削除）
  DELETE FROM profiles WHERE id = target_user_id;
  
  RAISE NOTICE '削除完了';
END $$;

-- ============================================
-- 2. 特定テーブルのデータのみ削除（オプション）
-- ============================================
-- 全データではなく、特定のテーブルのデータだけを削除したい場合

-- 例: daily_logsのみ削除
-- DELETE FROM daily_logs WHERE user_id = 'ユーザーID（UUID）';

-- 例: habitsとhabit_logsのみ削除
-- DELETE FROM habit_logs WHERE user_id = 'ユーザーID（UUID）';
-- DELETE FROM habits WHERE user_id = 'ユーザーID（UUID）';

-- 例: todosとtodo_logsのみ削除
-- DELETE FROM todo_logs WHERE user_id = 'ユーザーID（UUID）';
-- DELETE FROM todos WHERE user_id = 'ユーザーID（UUID）';

-- 例: AI使用量ログのみ削除
-- DELETE FROM ai_usage_logs WHERE user_id = 'ユーザーID（UUID）';

-- ============================================
-- 3. 削除前の確認クエリ（実行前に確認推奨）
-- ============================================
-- 以下のクエリで、削除対象のデータ件数を確認できます

-- ユーザーの全データ件数を確認
-- SELECT 
--   'daily_logs' as table_name, COUNT(*) as count
-- FROM daily_logs WHERE user_id = 'ユーザーID（UUID）'
-- UNION ALL
-- SELECT 'habits', COUNT(*) FROM habits WHERE user_id = 'ユーザーID（UUID）'
-- UNION ALL
-- SELECT 'habit_logs', COUNT(*) FROM habit_logs WHERE user_id = 'ユーザーID（UUID）'
-- UNION ALL
-- SELECT 'todos', COUNT(*) FROM todos WHERE user_id = 'ユーザーID（UUID）'
-- UNION ALL
-- SELECT 'todo_logs', COUNT(*) FROM todo_logs WHERE user_id = 'ユーザーID（UUID）'
-- UNION ALL
-- SELECT 'ai_usage_logs', COUNT(*) FROM ai_usage_logs WHERE user_id = 'ユーザーID（UUID）';
