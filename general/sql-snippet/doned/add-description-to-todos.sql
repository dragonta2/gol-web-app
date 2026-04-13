-- todos テーブルに description カラムを追加
ALTER TABLE todos ADD COLUMN IF NOT EXISTS description text;
