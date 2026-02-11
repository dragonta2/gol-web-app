-- ========================================
-- habitsテーブルに補足説明（description）カラムを追加
-- ========================================
-- Supabase Dashboard → SQL Editor で実行してください。
-- ========================================

ALTER TABLE habits
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN habits.description IS '習慣の補足説明（任意）。モーダルで入力可能。';
