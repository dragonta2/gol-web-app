-- ========================================
-- GOL Web版｜ユーザー登録時の自動処理
-- ========================================
-- 新規ユーザーがサインアップした時に自動実行される処理
-- ========================================

-- ========================================
-- 1. トリガー関数: 新規ユーザー作成時の処理
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. profilesテーブルにレコード作成
  INSERT INTO public.profiles (id, username, class_name, level, points, exp_body, exp_mind, exp_spirit)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), -- usernameがなければemailの@前を使用
    '無名の凡人',
    1,
    10,
    0,
    0,
    0
  );

  -- 2. デフォルト習慣を自動挿入
  PERFORM create_default_habits_for_user(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 2. トリガー設定: auth.usersテーブルにINSERTされたら実行
-- ========================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 動作確認用SQL（実行は不要、確認したい時に使用）
-- ========================================

-- トリガー一覧確認
-- SELECT * FROM information_schema.triggers WHERE trigger_schema = 'auth';

-- 関数一覧確認
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- ========================================
-- セットアップ完了！
-- ========================================

