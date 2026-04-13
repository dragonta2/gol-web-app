-- ========================================
-- todo_subtasks に「チェックを入れた日付」カラムを追加
-- ========================================
-- サブタスクにチェックが入った日時を記録する。
-- 実行方法: Supabase SQL Editor でこのファイルの内容を実行
-- ========================================

ALTER TABLE todo_subtasks
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 既存で is_completed = true の行には updated_at を completed_at の参考値としてコピー（任意）
-- UPDATE todo_subtasks SET completed_at = updated_at WHERE is_completed = true AND completed_at IS NULL;
