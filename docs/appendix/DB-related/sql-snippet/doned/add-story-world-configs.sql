-- ============================================
-- 世界観設定テーブル（管理者用オーバーライド保存）
-- ============================================
--
-- テストアカウント・管理者アカウントが設定画面で詳細設定を編集した値を保存。
-- 一般ユーザーは読み取りのみ（AI生成時に使用）。
--
-- 実行手順:
-- 1. Supabase Dashboard → SQL Editor を開く
-- 2. このスクリプトを実行
-- ============================================

-- 1. テーブル作成
CREATE TABLE IF NOT EXISTS story_world_configs (
  world_id TEXT PRIMARY KEY CHECK (world_id IN ('dq', 'ghost')),
  config_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE story_world_configs IS '世界観の管理者用オーバーライド設定（dq: ドラゴンクエスト風, ghost: ゴースト・オブ・ヨウテイ風）';
COMMENT ON COLUMN story_world_configs.config_json IS 'デフォルト設定のオーバーライド（部分的に上書き可能）';

-- 2. 更新日時トリガー
CREATE TRIGGER update_story_world_configs_updated_at
BEFORE UPDATE ON story_world_configs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 3. RLS有効化
ALTER TABLE story_world_configs ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシー
-- SELECT: 全認証ユーザーが読み取り可能（AI生成時に使用）
CREATE POLICY "Authenticated users can read story world configs"
ON story_world_configs FOR SELECT
TO authenticated
USING (true);

-- INSERT/UPDATE: 管理者のみ
CREATE POLICY "Admins can insert story world configs"
ON story_world_configs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can update story world configs"
ON story_world_configs FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
