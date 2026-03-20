-- ========================================
-- todo_tagsテーブルの存在確認
-- ========================================
-- このファイルをSupabase SQL Editorで実行してください
-- ========================================

-- todo_tagsテーブルが存在するか確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name = 'todo_tags';

-- todo_tagsテーブルの構造を確認（テーブルが存在する場合）
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'todo_tags'
ORDER BY ordinal_position;

-- todo_tagsテーブルのRLSポリシーを確認（テーブルが存在する場合）
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'todo_tags';
