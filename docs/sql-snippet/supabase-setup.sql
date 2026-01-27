-- ========================================
-- GOL Web版｜Supabaseデータベース構築SQL
-- ========================================
-- このファイルをSupabase SQL Editorで実行してください
-- ========================================

-- ========================================
-- 1. 更新日時自動更新トリガー関数
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ========================================
-- 2. テーブル作成
-- ========================================

-- ----------------------------------------
-- 2-1. profiles（ユーザープロファイル）
-- ----------------------------------------

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  class_name TEXT DEFAULT '無名の凡人',
  level INTEGER DEFAULT 1,
  points INTEGER DEFAULT 10,
  exp_body INTEGER DEFAULT 0,
  exp_mind INTEGER DEFAULT 0,
  exp_spirit INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------
-- 2-2. daily_logs（日誌）
-- ----------------------------------------

CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  journal_text TEXT,
  one_line_comment TEXT,
  
  -- ポイント利用（権利）
  base_consumption INTEGER DEFAULT -5,
  right_a_count INTEGER DEFAULT 0,
  right_b_count INTEGER DEFAULT 0,
  right_c_count INTEGER DEFAULT 0,
  right_d_count INTEGER DEFAULT 0,
  right_e_count INTEGER DEFAULT 0,
  right_f_count INTEGER DEFAULT 0,
  right_o_count INTEGER DEFAULT 0,
  right_u_count INTEGER DEFAULT 0,
  right_x_count INTEGER DEFAULT 0,
  
  -- AI判定結果
  ai_condition_body INTEGER,
  ai_condition_mood INTEGER,
  ai_points_earned INTEGER,
  ai_points_consumed INTEGER,
  ai_points_total INTEGER,
  ai_exp_body INTEGER,
  ai_exp_mind INTEGER,
  ai_exp_spirit INTEGER,
  ai_advice TEXT,
  ai_story_past TEXT,
  ai_story_future TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, log_date)
);

CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, log_date DESC);

CREATE TRIGGER update_daily_logs_updated_at
BEFORE UPDATE ON daily_logs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------
-- 2-3. habits（習慣マスタ）
-- ----------------------------------------

CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_name TEXT NOT NULL,
  habit_type TEXT NOT NULL CHECK (habit_type IN ('good', 'bad', 'bonus')),
  points INTEGER DEFAULT 1,
  
  -- EXP配分（良習慣のみ、悪習慣は0）
  exp_body INTEGER DEFAULT 0,
  exp_mind INTEGER DEFAULT 0,
  exp_spirit INTEGER DEFAULT 0,
  
  -- 表示順序
  display_order INTEGER DEFAULT 0,
  
  -- カスタマイズ可能
  is_custom BOOLEAN DEFAULT false,
  
  -- カウント型（回数入力か、チェックボックスか）
  input_type TEXT DEFAULT 'checkbox' CHECK (input_type IN ('checkbox', 'number')),
  
  -- 除外条件（土日祝対象外など）
  exclude_weekends BOOLEAN DEFAULT false,
  exclude_from_complete BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_habits_user_order ON habits(user_id, display_order);

CREATE TRIGGER update_habits_updated_at
BEFORE UPDATE ON habits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------
-- 2-4. habit_logs（習慣記録）
-- ----------------------------------------

CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  
  -- チェックボックス型はis_checkedを使用、number型はcountを使用
  is_checked BOOLEAN DEFAULT false,
  count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(daily_log_id, habit_id)
);

CREATE INDEX idx_habit_logs_daily_log ON habit_logs(daily_log_id);

CREATE TRIGGER update_habit_logs_updated_at
BEFORE UPDATE ON habit_logs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------
-- 2-5. todos（ToDoマスタ）
-- ----------------------------------------

CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  
  -- SP（スペシャルタスク）
  is_special BOOLEAN DEFAULT false,
  sp_points INTEGER DEFAULT 0,
  sp_exp_body INTEGER DEFAULT 0,
  sp_exp_mind INTEGER DEFAULT 0,
  sp_exp_spirit INTEGER DEFAULT 0,
  
  -- ステータス（アクティブ/進行中/完了済み）
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed')),
  
  -- 期限
  due_date DATE,
  
  -- 完了日
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- 表示順序
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_todos_user_status ON todos(user_id, status, display_order);
CREATE INDEX idx_todos_due_date ON todos(due_date);

CREATE TRIGGER update_todos_updated_at
BEFORE UPDATE ON todos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------
-- 2-6. todo_logs（ToDo記録）
-- ----------------------------------------

CREATE TABLE todo_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  
  -- 完了時の報酬
  points_earned INTEGER DEFAULT 0,
  exp_body_earned INTEGER DEFAULT 0,
  exp_mind_earned INTEGER DEFAULT 0,
  exp_spirit_earned INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(daily_log_id, todo_id)
);

CREATE INDEX idx_todo_logs_daily_log ON todo_logs(daily_log_id);
CREATE INDEX idx_todo_logs_todo ON todo_logs(todo_id);


-- ----------------------------------------
-- 2-7. todo_subtasks（ToDoサブタスク）
-- ----------------------------------------

CREATE TABLE todo_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  subtask_name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_todo_subtasks_todo ON todo_subtasks(todo_id, display_order);

CREATE TRIGGER update_todo_subtasks_updated_at
BEFORE UPDATE ON todo_subtasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ========================================
-- 3. Row Level Security（RLS）設定
-- ========================================

-- ----------------------------------------
-- 3-1. RLS有効化
-- ----------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_subtasks ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------
-- 3-2. profiles RLSポリシー
-- ----------------------------------------

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);


-- ----------------------------------------
-- 3-3. daily_logs RLSポリシー
-- ----------------------------------------

CREATE POLICY "Users can view own daily logs"
ON daily_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily logs"
ON daily_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily logs"
ON daily_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily logs"
ON daily_logs FOR DELETE
USING (auth.uid() = user_id);


-- ----------------------------------------
-- 3-4. habits RLSポリシー
-- ----------------------------------------

CREATE POLICY "Users can view own habits"
ON habits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits"
ON habits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
ON habits FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits"
ON habits FOR DELETE
USING (auth.uid() = user_id);


-- ----------------------------------------
-- 3-5. habit_logs RLSポリシー
-- ----------------------------------------

CREATE POLICY "Users can view own habit logs"
ON habit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = habit_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own habit logs"
ON habit_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = habit_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own habit logs"
ON habit_logs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = habit_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own habit logs"
ON habit_logs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = habit_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);


-- ----------------------------------------
-- 3-6. todos RLSポリシー
-- ----------------------------------------

CREATE POLICY "Users can view own todos"
ON todos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own todos"
ON todos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own todos"
ON todos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own todos"
ON todos FOR DELETE
USING (auth.uid() = user_id);


-- ----------------------------------------
-- 3-7. todo_logs RLSポリシー
-- ----------------------------------------

CREATE POLICY "Users can view own todo logs"
ON todo_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = todo_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own todo logs"
ON todo_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = todo_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own todo logs"
ON todo_logs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = todo_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);


-- ----------------------------------------
-- 3-8. todo_subtasks RLSポリシー
-- ----------------------------------------

CREATE POLICY "Users can view own todo subtasks"
ON todo_subtasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_subtasks.todo_id
    AND todos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own todo subtasks"
ON todo_subtasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_subtasks.todo_id
    AND todos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own todo subtasks"
ON todo_subtasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_subtasks.todo_id
    AND todos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own todo subtasks"
ON todo_subtasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_subtasks.todo_id
    AND todos.user_id = auth.uid()
  )
);


-- ========================================
-- 4. 初期データ挿入関数
-- ========================================

-- 新規ユーザー作成時にデフォルト習慣を挿入する関数
CREATE OR REPLACE FUNCTION create_default_habits_for_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO habits (user_id, habit_name, habit_type, points, exp_body, exp_mind, exp_spirit, display_order, input_type, exclude_from_complete) VALUES
  -- 良習慣
  (user_id, 'GOLリストを記述｜ログインボーナス', 'good', 1, 0, 1, 1, 1, 'checkbox', false),
  (user_id, '起床｜7時までに', 'good', 1, 1, 0, 1, 2, 'checkbox', false),
  (user_id, 'ベッドメイキング', 'good', 1, 0, 0, 1, 3, 'checkbox', false),
  (user_id, '習慣実践に投稿', 'good', 1, 0, 1, 0, 4, 'checkbox', true),
  (user_id, '早朝メモ書き部に参加', 'good', 1, 0, 1, 0, 5, 'checkbox', true),
  (user_id, '懸垂｜10回 or ディップス｜10回', 'good', 1, 2, 0, 0, 6, 'checkbox', false),
  (user_id, 'ももあげクランチ｜25回 or L字腹筋｜30秒', 'good', 1, 2, 0, 0, 7, 'checkbox', false),
  (user_id, '逆立ち｜30秒', 'good', 1, 1, 0, 0, 8, 'checkbox', true),
  (user_id, '起床後すぐの冷水シャワー', 'good', 1, 1, 0, 1, 9, 'checkbox', true),
  (user_id, '冷水シャワー｜2分', 'good', 1, 1, 0, 1, 10, 'checkbox', false),
  (user_id, 'ウンパニ｜顔体操｜3回', 'good', 1, 0, 0, 1, 11, 'checkbox', false),
  (user_id, '体重測定', 'good', 1, 0, 0, 0, 12, 'checkbox', false),
  (user_id, 'ダンス練習｜5分以上', 'good', 1, 1, 0, 0, 13, 'checkbox', true),
  (user_id, '瞑想｜3分以上', 'good', 1, 0, 0, 2, 14, 'checkbox', false),
  (user_id, 'アファメーション｜3分間', 'good', 1, 0, 0, 2, 15, 'checkbox', true),
  (user_id, 'ラン｜実施ポイント', 'good', 1, 2, 0, 1, 16, 'checkbox', false),
  (user_id, 'ラン｜距離', 'good', 1, 1, 0, 0, 17, 'number', true),
  (user_id, '散歩｜実施ポイント', 'good', 1, 1, 0, 1, 18, 'checkbox', false),
  (user_id, '散歩｜距離', 'good', 1, 1, 0, 0, 19, 'number', true),
  (user_id, 'ジムに行った', 'good', 1, 3, 0, 0, 20, 'checkbox', false),
  (user_id, '清掃', 'good', 1, 0, 0, 1, 21, 'checkbox', true),
  (user_id, '洗濯', 'good', 1, 0, 0, 0, 22, 'checkbox', true),
  (user_id, '夕食｜1時間30分以内', 'good', 1, 1, 0, 1, 23, 'checkbox', true),
  (user_id, '湯船につかる', 'good', 1, 1, 0, 1, 24, 'checkbox', false),
  (user_id, 'ベッドで眠った', 'good', 1, 0, 0, 1, 25, 'checkbox', false),
  (user_id, '就寝｜0時までに', 'good', 1, 0, 0, 2, 26, 'checkbox', false),
  
  -- 悪習慣
  (user_id, '無目的なYouTube視聴（30分以上）しない', 'bad', 1, 0, 0, 1, 101, 'checkbox', false),
  (user_id, 'お酒を飲まなかった', 'bad', 1, 1, 0, 1, 102, 'checkbox', false),
  (user_id, '昼食を食べなかった', 'bad', 1, 1, 0, 0, 103, 'checkbox', false),
  (user_id, '夕食後にお菓子類を食べなかった', 'bad', 1, 1, 0, 1, 104, 'checkbox', false),
  (user_id, 'ソファで寝転がってしまわなかった', 'bad', 1, 0, 0, 1, 105, 'checkbox', false),
  (user_id, 'ソファで眠ってしまわなかった', 'bad', 1, 0, 0, 1, 106, 'checkbox', false),
  
  -- ボーナス
  (user_id, 'Completeボーナス', 'bonus', 3, 1, 1, 1, 201, 'checkbox', false);
END;
$$ LANGUAGE plpgsql;


-- ========================================
-- 5. 動作確認SQL
-- ========================================

-- テーブル一覧確認
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- profilesテーブルの構造確認
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles';

-- RLSポリシー確認
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public';

-- ========================================
-- セットアップ完了！
-- ========================================

