-- todos から is_special を削除（通常/スペシャル廃止・難易度に統一したため）
-- 実行前にバックアップ推奨。既存環境では先にアプリを is_special 非参照に更新してから実行すること。
ALTER TABLE todos DROP COLUMN IF EXISTS is_special;
