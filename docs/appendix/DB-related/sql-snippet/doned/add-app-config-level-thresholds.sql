-- レベル閾値を全アカウント共通で保持するための app_config テーブル
-- 管理者が設定画面で変更すると全ユーザーに反映される
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app_config IS 'アプリ全体の設定（key-value）。例: level_thresholds';
COMMENT ON COLUMN app_config.key IS '設定キー。例: level_thresholds';
COMMENT ON COLUMN app_config.value IS 'JSON値。level_thresholds のときは {"1":50,"2":100,...,"10":2500}';

-- 認証ユーザーが読み取り可能（レベル計算・設定画面表示で使用）。書き込みはAPI側で管理者チェック済み。
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read app_config" ON app_config;
DROP POLICY IF EXISTS "Authenticated can upsert app_config" ON app_config;
CREATE POLICY "Authenticated can read app_config" ON app_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can upsert app_config" ON app_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
