-- 権利設定を保存するためのカラムをprofilesテーブルに追加
-- 
-- 使用方法:
-- 1. Supabase SQL Editorでこのスクリプトを実行
-- 2. 既存のprofilesテーブルにrights_configカラムを追加

-- rights_configカラムを追加（JSONB型で権利設定を保存）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rights_config JSONB DEFAULT '{
  "A": { "points": 5, "name": "TVゲーム2時間" },
  "B": { "points": 4, "name": "お酒4杯まで" },
  "C": { "points": 1, "name": "食事時動画1時間毎", "maxCount": 10 },
  "D": { "points": 0, "name": "睡眠導入剤" },
  "E": { "points": 3, "name": "朝食 or 昼食を食べる", "maxCount": 3 },
  "F": { "points": 10, "name": "EMKF" },
  "O": { "points": 5, "name": "ON (PLN以外)" },
  "U": { "points": 1, "name": "宇都宮ダンス" },
  "X": { "points": 10, "name": "PLN動画 & ON 1時間" }
}'::jsonb;

-- 既存のユーザーにデフォルト設定を適用（rights_configがnullの場合）
UPDATE profiles 
SET rights_config = '{
  "A": { "points": 5, "name": "TVゲーム2時間" },
  "B": { "points": 4, "name": "お酒4杯まで" },
  "C": { "points": 1, "name": "食事時動画1時間毎", "maxCount": 10 },
  "D": { "points": 0, "name": "睡眠導入剤" },
  "E": { "points": 3, "name": "朝食 or 昼食を食べる", "maxCount": 3 },
  "F": { "points": 10, "name": "EMKF" },
  "O": { "points": 5, "name": "ON (PLN以外)" },
  "U": { "points": 1, "name": "宇都宮ダンス" },
  "X": { "points": 10, "name": "PLN動画 & ON 1時間" }
}'::jsonb
WHERE rights_config IS NULL;

-- 確認クエリ（実行結果を確認）
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'rights_config';
