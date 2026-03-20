-- ========================================
-- レベル閾値の確認（画面表示とDBの一致確認用）
-- ========================================
-- app_config に保存されている level_thresholds を読みやすく表示します。
-- 管理者画面「レベルアップ必要EXPの設定」に表示されている値と
-- この結果を目視で照合してください。値を変更してもそのまま使えます。
-- Supabase Dashboard → SQL Editor で実行してください。
-- ========================================

-- 1. DBに登録されている level_thresholds をそのまま表示
SELECT key, value, updated_at
FROM app_config
WHERE key = 'level_thresholds';

-- 2. 各レベルごとの閾値を展開して表示（期待値は使わずDBの内容のみ。画面と目視で照合する）
WITH levels (lv) AS (
  SELECT generate_series(1, 10)::int
),
config AS (
  SELECT value
  FROM app_config
  WHERE key = 'level_thresholds'
  LIMIT 1
)
SELECT
  l.lv AS "レベル",
  (c.value->>l.lv::text)::int AS "DBの値"
FROM levels l
LEFT JOIN config c ON true
ORDER BY l.lv;
