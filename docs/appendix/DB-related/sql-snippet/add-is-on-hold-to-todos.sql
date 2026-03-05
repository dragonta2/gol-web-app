-- ========================================
-- todosテーブルに is_on_hold カラムを追加（保留状態）
-- ========================================
-- このファイルをSupabase SQL Editorで実行してください
-- ========================================

-- 保留中はToDoサマリーの「保留中」に表示。日誌カンバンには表示しない。
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS is_on_hold BOOLEAN DEFAULT false;

-- 既存データは保留でない
UPDATE todos
SET is_on_hold = false
WHERE is_on_hold IS NULL;
