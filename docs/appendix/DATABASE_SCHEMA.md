# GOL Web版｜データベース設計書

**このファイルの役割:** Supabaseデータベースのテーブル設計・SQL定義

---

## テーブル一覧

| テーブル名 | 説明 | 主な用途 |
|-----------|------|---------|
| profiles | ユーザープロファイル | 名前、レベル、クラス、ポイント、EXP |
| daily_logs | 日誌 | 毎日の記録（日誌本文、一言感想、AI判定結果） |
| habits | 習慣マスタ | 習慣項目の定義（良習慣/悪習慣） |
| habit_logs | 習慣記録 | 毎日の習慣チェック状況 |
| todos | ToDoマスタ | ToDoタスクの定義 |
| todo_logs | ToDo記録 | ToDo完了履歴 |
| todo_subtasks | ToDoサブタスク | ToDoタスクのサブタスク（子チェックリスト） |


## テーブル定義

### 1. profiles（ユーザープロファイル）

**説明:** ユーザーの基本情報、ポイント、EXP、レベル、クラスを管理

**リレーション:** `auth.users.id` と紐づく

```sql
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

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**カラム説明:**

| カラム名 | 型 | 説明 | デフォルト |
|---------|---|------|---------|
| id | UUID | ユーザーID（auth.users.id） | - |
| username | TEXT | ユーザー名 | - |
| class_name | TEXT | クラス（例: 無名の凡人、見習い剣士） | '無名の凡人' |
| level | INTEGER | レベル | 1 |
| points | INTEGER | 累積ポイント | 10 |
| exp_body | INTEGER | 身体EXP | 0 |
| exp_mind | INTEGER | 頭脳EXP | 0 |
| exp_spirit | INTEGER | 精神EXP | 0 |
| created_at | TIMESTAMP | 作成日時 | NOW() |
| updated_at | TIMESTAMP | 更新日時 | NOW() |

**level_thresholds（JSONB、任意）:** レベル1〜10の必要EXPをカスタムで保持。管理者・テストアカウントがマイページから設定可能。NULLのときはアプリのデフォルトを使用。マイグレーション: `docs/sql-snippet/add-level-thresholds-to-profiles.sql`

### 2. daily_logs（日誌）

**説明:** 毎日の記録（日誌本文、一言感想、AI判定結果、コンディションスコア）

**リレーション:** `profiles.id` と紐づく

```sql
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
```

**カラム説明:**

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | 日誌ID |
| user_id | UUID | ユーザーID |
| log_date | DATE | 日誌の日付 |
| journal_text | TEXT | 今日の日誌（最大3000文字、アプリ側でバリデーション） |
| one_line_comment | TEXT | 一言感想（最大500文字、アプリ側でバリデーション） |
| base_consumption | INTEGER | 基礎消費（-5pt） |
| right_a_count | INTEGER | 権利A利用回数（TVゲーム） |
| right_b_count | INTEGER | 権利B利用回数（お酒） |
| right_c_count | INTEGER | 権利C利用回数（食事時動画） |
| right_d_count | INTEGER | 権利D利用回数（睡眠導入剤） |
| right_f_count | INTEGER | 権利F利用回数 |
| right_o_count | INTEGER | 権利O利用回数 |
| right_u_count | INTEGER | 権利U利用回数（宇都宮ダンス） |
| right_x_count | INTEGER | 権利X利用回数 |
| ai_condition_body | INTEGER | ~~AI判定: 体調スコア（1-5）~~ **⚠️ 廃止機能（MD版で廃止のため、Web版でも廃止。260116）** |
| ai_condition_mood | INTEGER | ~~AI判定: 気分スコア（1-5）~~ **⚠️ 廃止機能（MD版で廃止のため、Web版でも廃止。260116）** |
| ai_points_earned | INTEGER | AI判定: 本日獲得ポイント |
| ai_points_consumed | INTEGER | AI判定: 本日消費ポイント |
| ai_points_total | INTEGER | AI判定: 本日の総合加減算 |
| ai_exp_body | INTEGER | AI判定: 身体EXP獲得 |
| ai_exp_mind | INTEGER | AI判定: 頭脳EXP獲得 |
| ai_exp_spirit | INTEGER | AI判定: 精神EXP獲得 |
| ai_advice | TEXT | AI生成: アドバイス |
| ai_story_past | TEXT | AI生成: これまでの冒険 |
| ai_story_future | TEXT | AI生成: これからの冒険 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**制約:**
- UNIQUE(user_id, log_date): 1ユーザーにつき1日1レコード


### 3. habits（習慣マスタ）

**説明:** 習慣項目の定義（良習慣/悪習慣、ポイント、EXP配分）

**リレーション:** `profiles.id` と紐づく

```sql
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
```

**カラム説明:**

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | 習慣ID |
| user_id | UUID | ユーザーID |
| habit_name | TEXT | 習慣名（例: 起床｜7時までに） |
| habit_type | TEXT | 種類（'good', 'bad', 'bonus'） |
| points | INTEGER | 獲得ポイント |
| exp_body | INTEGER | 身体EXP |
| exp_mind | INTEGER | 頭脳EXP |
| exp_spirit | INTEGER | 精神EXP |
| display_order | INTEGER | 表示順序 |
| is_custom | BOOLEAN | カスタム習慣か（ユーザーが追加したもの） |
| input_type | TEXT | 入力タイプ（'checkbox', 'number'） |
| exclude_weekends | BOOLEAN | 土日祝除外フラグ |
| exclude_from_complete | BOOLEAN | Completeボーナス対象外フラグ |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |


### 4. habit_logs（習慣記録）

**説明:** 毎日の習慣チェック状況（チェック/回数記録）

**リレーション:** `daily_logs.id` と `habits.id` に紐づく

```sql
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
```

**カラム説明:**

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | 習慣記録ID |
| daily_log_id | UUID | 日誌ID |
| habit_id | UUID | 習慣ID |
| is_checked | BOOLEAN | チェック状態（checkbox型） |
| count | INTEGER | 回数（number型、例: ランニング10km） |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**制約:**
- UNIQUE(daily_log_id, habit_id): 1日誌につき1習慣1レコード


### 5. todos（ToDoマスタ）

**説明:** ToDoタスクの定義

**リレーション:** `profiles.id` と紐づく

```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  
  -- 報酬（難易度倍率はアプリ側で適用）
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
```

**カラム説明:**

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | ToDoタスクID |
| user_id | UUID | ユーザーID |
| task_name | TEXT | タスク名 |
| sp_points | INTEGER | ポイント報酬 |
| sp_exp_body | INTEGER | 身体EXP報酬 |
| sp_exp_mind | INTEGER | 頭脳EXP報酬 |
| sp_exp_spirit | INTEGER | 精神EXP報酬 |
| status | TEXT | ステータス（'active', 'in_progress', 'completed'） |
| due_date | DATE | 期限 |
| completed_at | TIMESTAMP | 完了日時 |
| display_order | INTEGER | 表示順序 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |


### 6. todo_logs（ToDo記録）

**説明:** ToDo完了履歴（どの日誌で完了したか）

**リレーション:** `daily_logs.id` と `todos.id` に紐づく

```sql
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
```

**カラム説明:**

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | ToDo記録ID |
| daily_log_id | UUID | 日誌ID |
| todo_id | UUID | ToDoタスクID |
| points_earned | INTEGER | 獲得ポイント |
| exp_body_earned | INTEGER | 獲得身体EXP |
| exp_mind_earned | INTEGER | 獲得頭脳EXP |
| exp_spirit_earned | INTEGER | 獲得精神EXP |
| created_at | TIMESTAMP | 作成日時 |

**制約:**
- UNIQUE(daily_log_id, todo_id): 1日誌につき1タスク1レコード


### 7. todo_subtasks（ToDoサブタスク）

**説明:** ToDoタスクのサブタスク（子チェックリスト）

**リレーション:** `todos.id` と紐づく

```sql
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
```

**カラム説明:**

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | サブタスクID |
| todo_id | UUID | ToDoタスクID |
| subtask_name | TEXT | サブタスク名（例: "どこいくか｜調査｜AI利用"） |
| is_completed | BOOLEAN | 完了状態（true = 完了、false = 未完了） |
| display_order | INTEGER | 表示順序（小さい順に表示） |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**制約:**
- サブタスクは進捗管理のみ（ポイント/EXPは付与しない）
- 親タスク（todos）が削除されると、サブタスクも自動削除（CASCADE）


## Row Level Security（RLS）設定

### 基本方針

- **すべてのテーブルでRLSを有効化**
- **ユーザーは自分のデータのみアクセス可能**
- **認証されていないユーザーはアクセス不可**

### RLS有効化SQL

```sql
-- RLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_subtasks ENABLE ROW LEVEL SECURITY;
```

### RLSポリシー設定

#### 1. profiles（ユーザープロファイル）

```sql
-- SELECT: 自分のプロファイルのみ閲覧可能
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- INSERT: サインアップ時に自分のプロファイル作成可能
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- UPDATE: 自分のプロファイルのみ更新可能
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

#### 2. daily_logs（日誌）

```sql
-- SELECT: 自分の日誌のみ閲覧可能
CREATE POLICY "Users can view own daily logs"
ON daily_logs FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: 自分の日誌のみ作成可能
CREATE POLICY "Users can insert own daily logs"
ON daily_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: 自分の日誌のみ更新可能
CREATE POLICY "Users can update own daily logs"
ON daily_logs FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: 自分の日誌のみ削除可能
CREATE POLICY "Users can delete own daily logs"
ON daily_logs FOR DELETE
USING (auth.uid() = user_id);
```

#### 3. habits（習慣マスタ）

```sql
-- SELECT: 自分の習慣のみ閲覧可能
CREATE POLICY "Users can view own habits"
ON habits FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: 自分の習慣のみ作成可能
CREATE POLICY "Users can insert own habits"
ON habits FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: 自分の習慣のみ更新可能
CREATE POLICY "Users can update own habits"
ON habits FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: 自分の習慣のみ削除可能
CREATE POLICY "Users can delete own habits"
ON habits FOR DELETE
USING (auth.uid() = user_id);
```

#### 4. habit_logs（習慣記録）

```sql
-- SELECT: 自分の習慣記録のみ閲覧可能
CREATE POLICY "Users can view own habit logs"
ON habit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = habit_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);

-- INSERT: 自分の習慣記録のみ作成可能
CREATE POLICY "Users can insert own habit logs"
ON habit_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = habit_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);

-- UPDATE: 自分の習慣記録のみ更新可能
CREATE POLICY "Users can update own habit logs"
ON habit_logs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = habit_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);

-- DELETE: 自分の習慣記録のみ削除可能
CREATE POLICY "Users can delete own habit logs"
ON habit_logs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = habit_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);
```

#### 5. todos（ToDoマスタ）

```sql
-- SELECT: 自分のToDoのみ閲覧可能
CREATE POLICY "Users can view own todos"
ON todos FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: 自分のToDoのみ作成可能
CREATE POLICY "Users can insert own todos"
ON todos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: 自分のToDoのみ更新可能
CREATE POLICY "Users can update own todos"
ON todos FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: 自分のToDoのみ削除可能
CREATE POLICY "Users can delete own todos"
ON todos FOR DELETE
USING (auth.uid() = user_id);
```

#### 6. todo_logs（ToDo記録）

```sql
-- SELECT: 自分のToDo記録のみ閲覧可能
CREATE POLICY "Users can view own todo logs"
ON todo_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = todo_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);

-- INSERT: 自分のToDo記録のみ作成可能
CREATE POLICY "Users can insert own todo logs"
ON todo_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = todo_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);

-- DELETE: 自分のToDo記録のみ削除可能
CREATE POLICY "Users can delete own todo logs"
ON todo_logs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM daily_logs
    WHERE daily_logs.id = todo_logs.daily_log_id
    AND daily_logs.user_id = auth.uid()
  )
);
```

#### 7. todo_subtasks（ToDoサブタスク）

```sql
-- SELECT: 自分のToDoサブタスクのみ閲覧可能
CREATE POLICY "Users can view own todo subtasks"
ON todo_subtasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_subtasks.todo_id
    AND todos.user_id = auth.uid()
  )
);

-- INSERT: 自分のToDoサブタスクのみ作成可能
CREATE POLICY "Users can insert own todo subtasks"
ON todo_subtasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_subtasks.todo_id
    AND todos.user_id = auth.uid()
  )
);

-- UPDATE: 自分のToDoサブタスクのみ更新可能
CREATE POLICY "Users can update own todo subtasks"
ON todo_subtasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_subtasks.todo_id
    AND todos.user_id = auth.uid()
  )
);

-- DELETE: 自分のToDoサブタスクのみ削除可能
CREATE POLICY "Users can delete own todo subtasks"
ON todo_subtasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_subtasks.todo_id
    AND todos.user_id = auth.uid()
  )
);
```


## 初期データ挿入（デフォルト習慣・デフォルトToDo）

新規ユーザー登録時に、デフォルトの習慣（良習慣1・悪習慣1）とデフォルトToDo（1件＋サブタスク1件）を自動挿入する関数です。本番では `docs/sql-snippet/set-new-user-defaults.sql` を実行すると、初期ゴルド50・権利Aのみ・上記習慣・ToDoがまとめて設定されます。

**create_default_habits_for_user**（良習慣「早起きする｜8時まで」、悪習慣「無目的なYouTube視聴」の2件のみ）

```sql
CREATE OR REPLACE FUNCTION create_default_habits_for_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO habits (user_id, habit_name, habit_type, points, exp_body, exp_mind, exp_spirit, display_order, input_type, exclude_from_complete) VALUES
  (user_id, '早起きする｜8時まで', 'good', 1, 0, 0, 0, 1, 'checkbox', false),
  (user_id, '無目的なYouTube視聴', 'bad', 1, 0, 0, 0, 2, 'checkbox', false);
END;
$$ LANGUAGE plpgsql;
```

**create_default_todos_for_user**（ToDo「テストタスク」期限 2026-12-31、サブタスク「サブタスク サンプル」1件）

```sql
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
```


## データベース作成手順

### 1. Supabaseダッシュボードにアクセス

https://app.supabase.com/project/YOUR_PROJECT_ID/editor

### 2. SQL Editorで実行

1. 上記のSQL（テーブル定義）をコピー
2. Supabase SQL Editorに貼り付け
3. 「Run」をクリック

### 3. RLSポリシーを設定

1. RLS有効化SQLを実行
2. RLSポリシー設定SQLを実行

### 4. 動作確認

テーブルが正常に作成されたか確認：

```sql
-- テーブル一覧確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- profilesテーブルの構造確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles';
```


### 8. announcements（お知らせ）

**説明:** 全ユーザーに表示するお知らせ（日付・件名）。DB保存で全ユーザー共通。

- **テーブル作成・RLS:** `docs/sql-snippet/create-announcements-table.sql` を Supabase SQL Editor で実行
- **カラム:** id, notice_date（TEXT）, subject（TEXT）, display_order（INTEGER）, created_at, updated_at
- **RLS:** 認証ユーザーは SELECT 可能。INSERT/UPDATE/DELETE は管理アカウント（指定メールまたは profiles.is_admin）のみ
- **API:** GET /api/announcements（一覧）、POST /api/announcements（追加・管理のみ）

---

## 次のステップ

- [ ] Supabaseにテーブルを作成
- [ ] RLSポリシーを設定
- [ ] 初期データ挿入関数をテスト
- [ ] Next.jsからデータ取得・更新のAPI実装
- [ ] UI側でデータベース連携


