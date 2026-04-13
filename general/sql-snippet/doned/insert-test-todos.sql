-- ========================================
-- テスト用ToDoデータ挿入SQL
-- ========================================
-- 
-- このSQLは、開発・テスト用にサンプルのToDoタスクを挿入します。
-- 実際のユーザーIDに置き換えて実行してください。
--
-- 使用方法:
-- 1. SupabaseダッシュボードのSQL Editorを開く
-- 2. 現在ログインしているユーザーのIDを取得（auth.usersテーブルから）
-- 3. 以下のSQLの :user_id を実際のユーザーIDに置き換える
-- 4. SQLを実行

-- 現在のユーザーIDを取得する方法:
-- SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- ========================================
-- テストデータ挿入
-- ========================================

-- 注意: 以下の :user_id を実際のユーザーID（UUID）に置き換えてください
-- 例: '123e4567-e89b-12d3-a456-426614174000'

INSERT INTO todos (user_id, task_name, sp_points, sp_exp_body, sp_exp_mind, sp_exp_spirit, status, due_date, display_order) VALUES
-- アクティブなタスク（期限超過あり）
(:user_id, '沖縄旅行', 6, 2, 2, 0, 'active', '2024-11-01', 1),
-- アクティブなタスク（期限あり）
(:user_id, '確定申告', 4, 1, 2, 0, 'active', '2024-11-15', 2),
(:user_id, '健康診断', 0, 1, 0, 0, 'active', '2024-11-20', 3),
-- 進行中のタスク
(:user_id, 'パスポート受領', 4, 0, 0, 0, 'in_progress', '2024-11-05', 4),
-- 完了済みタスク
(:user_id, 'スキルシート', 0, 0, 2, 0, 'completed', NULL, 5),
(:user_id, 'ブログ記事', 0, 0, 3, 0, 'completed', NULL, 6);

-- 完了済みタスクのcompleted_atを更新（過去の日付を設定）
UPDATE todos 
SET completed_at = NOW() - INTERVAL '3 days'
WHERE task_name = 'スキルシート' AND user_id = :user_id;

UPDATE todos 
SET completed_at = NOW() - INTERVAL '4 days'
WHERE task_name = 'ブログ記事' AND user_id = :user_id;

-- ========================================
-- 確認用クエリ
-- ========================================

-- 挿入されたデータを確認
-- SELECT id, task_name, status, due_date, completed_at, sp_points
-- FROM todos
-- WHERE user_id = :user_id
-- ORDER BY status, display_order;

