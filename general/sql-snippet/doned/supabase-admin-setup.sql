-- ============================================
-- 管理者権限システムのセットアップ
-- ============================================
-- 
-- このスクリプトは、管理者権限システムを実装します。
-- AI使用量の確認は管理者アカウントのみが可能になります。
--
-- 実行手順:
-- 1. Supabase Dashboard → SQL Editor を開く
-- 2. "New query" をクリック
-- 3. このスクリプト全体をコピー＆ペースト
-- 4. "Run" をクリックして実行
-- ============================================

-- 1. profilesテーブルにis_adminカラムを追加
-- ============================================
-- 既存のprofilesテーブルに管理者フラグを追加
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- インデックスを追加（管理者チェックのパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- コメントを追加
COMMENT ON COLUMN profiles.is_admin IS '管理者権限フラグ（true: 管理者, false: 一般ユーザー）';

-- ============================================
-- 2. 管理者アカウントの設定
-- ============================================
-- 注意: 以下のSQLは、実際のユーザーID（UUID）に置き換えて実行してください
-- 
-- 重要: ユーザーIDはメールアドレスではありません。UUID（一意の識別子）です。
-- 形式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
-- 例: a1b2c3d4-e5f6-7890-abcd-ef1234567890
--
-- 自分のアカウントを管理者に設定する場合:
-- UPDATE profiles SET is_admin = true WHERE id = 'あなたのユーザーID（UUID）';
--
-- テストアカウントを管理者に設定する場合:
-- UPDATE profiles SET is_admin = true WHERE id = 'テストアカウントのユーザーID（UUID）';
--
-- ユーザーID（UUID）の確認方法:
-- 1. Supabase Dashboard → Authentication → Users を開く
-- 2. ユーザー一覧の「ID」列（または「UUID」列）を確認
--    - メールアドレス列とは別の列です
--    - 形式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
-- 3. 対象ユーザーのUUIDをコピー
-- 4. 上記のUPDATE文で使用（シングルクォートで囲む）

-- ============================================
-- 3. RLSポリシーの確認
-- ============================================
-- profilesテーブルのRLSが有効になっていることを確認
-- （既存のRLSポリシーでis_adminカラムも保護されます）

-- ============================================
-- 4. 管理者チェック用の関数（オプション）
-- ============================================
-- 管理者かどうかをチェックする関数を作成
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = p_user_id
      AND is_admin = true
  );
END;
$$;

-- 関数のコメント
COMMENT ON FUNCTION is_admin(UUID) IS '指定されたユーザーが管理者かどうかをチェック';

-- ============================================
-- 5. 確認用クエリ
-- ============================================
-- 管理者アカウントの一覧を確認
-- SELECT id, username, email, is_admin
-- FROM profiles
-- WHERE is_admin = true;

-- 全ユーザーの管理者フラグを確認
-- SELECT id, username, is_admin
-- FROM profiles
-- ORDER BY is_admin DESC, username;
