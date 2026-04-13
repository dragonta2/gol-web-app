-- profiles に use_username_as_display_name カラムを追加（GOL世界の表示名にニックネームを使うか）
-- チェックON = ニックネームをあらすじ・アドバイスの表示名に使用
-- チェックOFF = 各世界観のデフォルト名（例: 辰彦・勇者）を使用
-- Supabase Dashboard → SQL Editor で実行してください。

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS use_username_as_display_name BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.use_username_as_display_name IS 'true: ニックネームをGOL世界の表示名に使用, false: 世界観のデフォルト名を使用';
