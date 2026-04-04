-- ========================================
-- todos: タスク名ユニークをやめ、YID 付き行は (user_id, source_yid) で一意にする
-- ========================================
-- Supabase SQL Editor で実行してください。
--
-- 背景:
-- - アプリ側の重複判定は source_yid（YID）のみとする
-- - 異なる YID でタスク名が同じ行を複数登録できるようにする
-- ========================================

-- ----------------------------------------
-- 1. 既存データ: 同一ユーザー・同一 source_yid（非NULL）の重複がないか
-- ----------------------------------------

SELECT
  user_id,
  source_yid,
  COUNT(*) AS duplicate_count
FROM todos
WHERE source_yid IS NOT NULL
GROUP BY user_id, source_yid
HAVING COUNT(*) > 1;

-- 1 件でも出たら、先に重複行を整理してから次へ進んでください

-- ----------------------------------------
-- 2. (user_id, task_name) の UNIQUE 制約を削除
-- ----------------------------------------

ALTER TABLE todos
DROP CONSTRAINT IF EXISTS todos_user_id_task_name_unique;

-- ----------------------------------------
-- 3. YID 付き行は (user_id, source_yid) で一意（部分ユニークインデックス）
-- ----------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS todos_user_id_source_yid_unique
ON todos (user_id, source_yid)
WHERE source_yid IS NOT NULL;
