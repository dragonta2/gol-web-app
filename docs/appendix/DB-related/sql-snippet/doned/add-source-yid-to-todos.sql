-- todos にやりたいことリスト連携用の YID（例: YID-11）を保存する
-- MD インポート時の重複判定（同一 YID）に使用。タスク名をリネームしても同一 YID は再登録しない。

ALTER TABLE todos ADD COLUMN IF NOT EXISTS source_yid text;

COMMENT ON COLUMN todos.source_yid IS 'やりたいことリストの YID-N。未連携の ToDo は NULL';

-- 同一ユーザーで同じ YID は1件のみ（NULL は複数可）
CREATE UNIQUE INDEX IF NOT EXISTS idx_todos_user_source_yid_unique
  ON todos (user_id, source_yid)
  WHERE source_yid IS NOT NULL;
