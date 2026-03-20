-- ========================================
-- 難易度を3段階に変更（trivial削除）
-- ========================================
-- このファイルをSupabase SQL Editorで実行してください
-- ========================================

-- ----------------------------------------
-- 1. 既存データの更新（trivial → easy）
-- ----------------------------------------

-- habitsテーブルのtrivialをeasyに変更
UPDATE habits
SET difficulty = 'easy'
WHERE difficulty = 'trivial';

-- todosテーブルのtrivialをeasyに変更
UPDATE todos
SET difficulty = 'easy'
WHERE difficulty = 'trivial';

-- ----------------------------------------
-- 2. habitsテーブルのCHECK制約を更新
-- ----------------------------------------

-- 既存のCHECK制約を削除
ALTER TABLE habits
DROP CONSTRAINT IF EXISTS habits_difficulty_check;

-- 新しいCHECK制約を追加（3段階のみ）
ALTER TABLE habits
ADD CONSTRAINT habits_difficulty_check
CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- ----------------------------------------
-- 3. todosテーブルのCHECK制約を更新
-- ----------------------------------------

-- 既存のCHECK制約を削除
ALTER TABLE todos
DROP CONSTRAINT IF EXISTS todos_difficulty_check;

-- 新しいCHECK制約を追加（3段階のみ）
ALTER TABLE todos
ADD CONSTRAINT todos_difficulty_check
CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- ========================================
-- 確認用クエリ
-- ========================================

-- habitsテーブルの難易度分布確認
-- SELECT difficulty, COUNT(*) as count
-- FROM habits
-- GROUP BY difficulty
-- ORDER BY difficulty;

-- todosテーブルの難易度分布確認
-- SELECT difficulty, COUNT(*) as count
-- FROM todos
-- GROUP BY difficulty
-- ORDER BY difficulty;

-- habitsテーブルのCHECK制約確認
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'habits_difficulty_check';

-- todosテーブルのCHECK制約確認
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'todos_difficulty_check';
