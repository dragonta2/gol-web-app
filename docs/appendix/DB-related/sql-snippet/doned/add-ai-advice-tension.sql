-- ============================================
-- daily_logs: 緊張コーチング用カラム追加
-- ai_output_limits: 緊張コーチングの文字数制限カラム追加
-- ============================================
--
-- 方針: 既存カラムはそのまま（ai_story_past=統合あらすじ、ai_advice=弛緩、ai_story_future=将来用）
-- 実行: Supabase Dashboard → SQL Editor
-- ============================================

-- 緊張コーチング本文
ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS ai_advice_tension TEXT;

COMMENT ON COLUMN daily_logs.ai_advice_tension IS 'AI生成: 緊張（ムチ）コーチングアドバイス';

-- 文字数制限（既存行 id=1 に列を足す）
ALTER TABLE ai_output_limits
  ADD COLUMN IF NOT EXISTS advice_tension_min INTEGER NOT NULL DEFAULT 150;

ALTER TABLE ai_output_limits
  ADD COLUMN IF NOT EXISTS advice_tension_max INTEGER NOT NULL DEFAULT 500;

COMMENT ON COLUMN ai_output_limits.advice_tension_min IS '緊張コーチングの最小文字数';
COMMENT ON COLUMN ai_output_limits.advice_tension_max IS '緊張コーチングの最大文字数';

UPDATE ai_output_limits
SET
  advice_tension_min = 150,
  advice_tension_max = 500
WHERE id = 1
  AND (advice_tension_min IS NULL OR advice_tension_max IS NULL);
