-- ============================================
-- AI生成テキストの文字数制限（管理者用・世界観共通）
-- ============================================
--
-- 総評・これまでの冒険・これからの冒険・辛口コーチングアドバイスの
-- 最低文字数・最大文字数を1セットで保持。dq/ghost どちらの世界観でも同じ値を参照。
--
-- 実行手順:
-- 1. Supabase Dashboard → SQL Editor を開く
-- 2. このスクリプトを実行
-- ============================================

CREATE TABLE IF NOT EXISTS ai_output_limits (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  reasoning_min INTEGER NOT NULL DEFAULT 50,
  reasoning_max INTEGER NOT NULL DEFAULT 500,
  story_past_min INTEGER NOT NULL DEFAULT 200,
  story_past_max INTEGER NOT NULL DEFAULT 600,
  story_future_min INTEGER NOT NULL DEFAULT 200,
  story_future_max INTEGER NOT NULL DEFAULT 600,
  advice_min INTEGER NOT NULL DEFAULT 150,
  advice_max INTEGER NOT NULL DEFAULT 500,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE ai_output_limits IS 'AI生成テキストの文字数制限（総評・あらすじ・アドバイス）。世界観共通・1行のみ。';

-- 初期行を投入（存在しない場合のみ）
INSERT INTO ai_output_limits (id, reasoning_min, reasoning_max, story_past_min, story_past_max, story_future_min, story_future_max, advice_min, advice_max)
VALUES (1, 50, 500, 200, 600, 200, 600, 150, 500)
ON CONFLICT (id) DO NOTHING;

-- 更新日時トリガー（再実行可能にするため、既存があれば作り直す）
DROP TRIGGER IF EXISTS update_ai_output_limits_updated_at ON ai_output_limits;

CREATE TRIGGER update_ai_output_limits_updated_at
BEFORE UPDATE ON ai_output_limits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE ai_output_limits ENABLE ROW LEVEL SECURITY;

-- 全認証ユーザーが読み取り可能（再実行可能にするため、既存があれば作り直す）
DROP POLICY IF EXISTS "Authenticated users can read ai_output_limits" ON ai_output_limits;

CREATE POLICY "Authenticated users can read ai_output_limits"
ON ai_output_limits FOR SELECT
TO authenticated
USING (true);

-- 管理者のみ挿入・更新可能（再実行可能にするため、既存があれば作り直す）
DROP POLICY IF EXISTS "Admins can insert ai_output_limits" ON ai_output_limits;

CREATE POLICY "Admins can insert ai_output_limits"
ON ai_output_limits FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

DROP POLICY IF EXISTS "Admins can update ai_output_limits" ON ai_output_limits;

CREATE POLICY "Admins can update ai_output_limits"
ON ai_output_limits FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
