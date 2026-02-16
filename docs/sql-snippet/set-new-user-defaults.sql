-- ========================================
-- 新規ユーザー初期状態の設定（ゲームスタート時デフォルト）
-- ========================================
--
-- 【本番で必ず実行すること】
-- このファイルを本番 Supabase で実行していないと、新規サインアップユーザーに
-- 初期値（50G・権利Aのみ・デフォルト習慣2件・デフォルトToDo1件）が反映されません。
-- 本番環境の Supabase Dashboard → SQL Editor で、このファイルの内容を
-- 貼り付けて 1回だけ 実行してください。
--
-- 前提: fix-trigger-handle-new-user.sql および supabase-add-rights-config.sql
--       を適用済みの環境で実行してください。rights_config カラムが profiles に
--       存在しない場合は先に add-rights-config を実行してください。
--
-- 内容:
-- 1. create_default_habits_for_user … 良習慣1件・悪習慣1件のみ挿入
-- 2. create_default_todos_for_user … デフォルトToDo 1件＋サブタスク1件
-- 3. handle_new_user … 初期ゴルド50、権利Aのみの rights_config、上記2関数を呼び出し
-- ========================================

-- ----------------------------------------
-- 1. デフォルト習慣（2件のみ）
-- ----------------------------------------
CREATE OR REPLACE FUNCTION create_default_habits_for_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO habits (user_id, habit_name, habit_type, points, exp_body, exp_mind, exp_spirit, display_order, input_type, exclude_from_complete) VALUES
  (user_id, '早起きする｜8時まで', 'good', 1, 0, 0, 0, 1, 'checkbox', false),
  (user_id, '無目的なYouTube視聴', 'bad', 1, 0, 0, 0, 2, 'checkbox', false);
END;
$$ LANGUAGE plpgsql;


-- ----------------------------------------
-- 2. デフォルトToDo（1件＋サブタスク1件）
-- ----------------------------------------
CREATE OR REPLACE FUNCTION create_default_todos_for_user(user_id UUID)
RETURNS VOID AS $$
DECLARE
  tid UUID;
BEGIN
  INSERT INTO todos (user_id, task_name, status, due_date, display_order)
  VALUES (user_id, 'テストタスク', 'active', '2026-12-31'::date, 0)
  RETURNING id INTO tid;

  INSERT INTO todo_subtasks (todo_id, subtask_name, display_order)
  VALUES (tid, 'サブタスク サンプル', 0);
END;
$$ LANGUAGE plpgsql;


-- ----------------------------------------
-- 3. 新規ユーザー作成トリガー関数
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_username TEXT;
BEGIN
  default_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );
  IF default_username = '' OR default_username IS NULL THEN
    default_username := 'ユーザー';
  END IF;

  -- profiles: 初期ゴルド50、権利Aのみ（TVゲームをやる 2時間 -5G）
  INSERT INTO public.profiles (id, username, class_name, level, points, exp_body, exp_mind, exp_spirit, rights_config)
  VALUES (
    NEW.id,
    default_username,
    '無名の凡人',
    1,
    50,
    0,
    0,
    0,
    '{"A": {"points": 5, "name": "TVゲームをやる (2時間)"}}'::jsonb
  );

  BEGIN
    PERFORM create_default_habits_for_user(NEW.id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'create_default_habits_for_user failed for user %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    PERFORM create_default_todos_for_user(NEW.id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'create_default_todos_for_user failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
