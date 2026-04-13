-- ========================================
-- 新規ユーザー作成トリガー修正
-- ========================================
-- 「Database error saving new user」が出る場合の対策。
-- 1. username を Google の full_name や email からもフォールバック取得
-- 2. デフォルト習慣の挿入に失敗しても、プロファイル作成は成功させる（ユーザーはログイン可能に）
--
-- 初期ゴルド50・権利Aのみ・デフォルトToDo1件 を入れたい場合は、
-- 代わりに set-new-user-defaults.sql を実行してください。
--
-- Supabase Dashboard → SQL Editor で実行してください。
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_username TEXT;
BEGIN
  -- username: OAuth の meta や email から取得（空の場合は「ユーザー」）
  default_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );
  IF default_username = '' OR default_username IS NULL THEN
    default_username := 'ユーザー';
  END IF;

  -- 1. profiles にレコード作成（元のトリガーと同じカラムのみ。追加カラムは DEFAULT に任せる）
  INSERT INTO public.profiles (id, username, class_name, level, points, exp_body, exp_mind, exp_spirit)
  VALUES (
    NEW.id,
    default_username,
    '無名の凡人',
    1,
    10,
    0,
    0,
    0
  );

  -- 2. デフォルト習慣を挿入（失敗してもユーザー作成は成功させる）
  BEGIN
    PERFORM create_default_habits_for_user(NEW.id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'create_default_habits_for_user failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーは既に存在する場合はそのまま（再作成不要）
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();
