-- レベルアップ必要EXPのカスタム閾値（管理者・テストアカウントがマイページから設定可能）
-- 未設定の場合はアプリのデフォルト（LEVEL_THRESHOLDS）を使用
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS level_thresholds JSONB DEFAULT NULL;

COMMENT ON COLUMN profiles.level_thresholds IS 'レベル1〜10の必要EXP。例: {"1":50,"2":100,...,"10":2500}。NULLのときはアプリデフォルトを使用。';
