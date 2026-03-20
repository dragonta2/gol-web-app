-- habits テーブルに note カラムを追加
-- 用途: 習慣の「説明」フィールド（モーダル内のみ表示。習慣カード表示には使わない）
-- description カラム（副見出し）とは別のカラム

ALTER TABLE habits ADD COLUMN IF NOT EXISTS note text;
