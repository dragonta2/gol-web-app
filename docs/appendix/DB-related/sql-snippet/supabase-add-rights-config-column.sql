-- profiles に rights_config カラムを追加（権利設定保存用）
-- Supabase Dashboard → SQL Editor で実行してください。
-- 実行後、スキーマキャッシュは自動で更新されます。

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rights_config JSONB DEFAULT '{}'::jsonb;
