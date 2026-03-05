-- habitsテーブルに parent_habit_id カラムを追加（子習慣ネスト用）
--
-- 説明:
-- - 習慣に「親」「子」の関係を1階層のみ持たせる（親 → 子）。
-- - parent_habit_id が NULL の習慣は「親」または単体の習慣。
-- - parent_habit_id に親習慣の id を設定した習慣は「子」として表示・スコア計算で扱う。
-- - 親習慣を削除した場合、子の parent_habit_id は SET NULL となり、子は通常の習慣として残る。
--
-- 使用方法: Supabase SQL Editor でこのスクリプトを実行

ALTER TABLE habits
ADD COLUMN IF NOT EXISTS parent_habit_id UUID REFERENCES habits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_habits_parent_habit_id ON habits(parent_habit_id);

-- 確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'habits'
  AND column_name = 'parent_habit_id';
