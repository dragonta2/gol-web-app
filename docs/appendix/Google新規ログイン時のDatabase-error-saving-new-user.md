# Google 新規ログイン時の「Database error saving new user」

## 現象

初めての Google アカウントで「Googleでログイン」すると、リダイレクト後に次のようなエラーになる。

- 画面: `no_code` やエラー表示
- URL: `...#error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user`

## 原因

Supabase Auth で新規ユーザーが `auth.users` に INSERT されると、トリガー `on_auth_user_created` で `public.handle_new_user()` が実行される。

1. **profiles への INSERT**  
   `id`, `username`, `class_name`, `level`, `points`, `exp_body`, `exp_mind`, `exp_spirit` を挿入。  
   - 後から追加した `use_username_as_display_name` や `is_admin` は省略可能（DEFAULT あり）。
2. **デフォルト習慣の挿入**  
   `create_default_habits_for_user(NEW.id)` で `habits` に多数行を INSERT。

このどれかが失敗すると、トリガー全体が失敗し、`auth.users` への INSERT もロールバックされて「Database error saving new user」になる。

想定される要因の例:

- **profiles**  
  - 後から追加したカラムが NOT NULL で DEFAULT が無い（マイグレーション不整合）。
- **create_default_habits_for_user**  
  - `habits` のスキーマ変更（必須カラム追加など）で INSERT が失敗。
  - RLS により、トリガー実行時点では「自分の習慣」として INSERT が許可されない。

## 対処（推奨）

1. **トリガー関数の修正を適用する**  
   [fix-trigger-handle-new-user.sql](../sql-snippet/fix-trigger-handle-new-user.sql) を Supabase Dashboard → SQL Editor で実行する。
   - `username` を Google の `full_name` や `name` からもフォールバックするように変更。
   - **デフォルト習慣の挿入が失敗しても、profiles の作成は成功させる**ように `EXCEPTION` で囲む。  
     → 新規ユーザーはログインできるようになり、習慣だけ未作成になる。

2. **Supabase のログで詳細を確認する**  
   Dashboard → Logs → Postgres で、トリガー実行時のエラーメッセージを確認する。  
   - `create_default_habits_for_user` 失敗時は `RAISE WARNING` で「create_default_habits_for_user failed for user ...」が出る。
   - ここで「どのテーブル・制約で失敗したか」を確認できる。

3. **習慣が作られなかったユーザー向け**  
   管理者が Supabase SQL で手動実行するか、アプリ側で「デフォルト習慣を作成」する処理を用意する。

## 関連ファイル

- トリガー定義（元）: [supabase-trigger-setup.sql](../sql-snippet/supabase-trigger-setup.sql)
- トリガー修正用: [fix-trigger-handle-new-user.sql](../sql-snippet/fix-trigger-handle-new-user.sql)
- デフォルト習慣: [supabase-setup.sql](../sql-snippet/supabase-setup.sql) 内の `create_default_habits_for_user`
