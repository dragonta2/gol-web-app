# 管理者権限システム セットアップガイド

このガイドでは、管理者権限システムのセットアップ方法を説明します。

## 概要

- **目的**: AI使用量の確認を管理者アカウントのみに制限
- **管理者**: 自分のアカウントとテストアカウントのみ
- **実装内容**: `profiles`テーブルに`is_admin`カラムを追加し、管理者チェック機能を実装

---

## セットアップ手順

### 1. データベースのセットアップ

#### 1-1. SQLスクリプトの実行

1. **Supabase Dashboard** を開く
2. 左側メニューから **「SQL Editor」** をクリック
3. **「New query」** をクリック
4. **「Create a new snippet」** を選択
5. `docs/supabase-admin-setup.sql` の内容をコピー＆ペースト
6. **「Run」** ボタンをクリックして実行

#### 1-2. 実行結果の確認

**重要**: 「Success. No rows returned」と表示されれば**正常に完了**しています。

これらのSQL操作（`ALTER TABLE`、`CREATE INDEX`、`CREATE FUNCTION`）は行を返さないため、「No rows returned」は正常な動作です。

**セットアップが完了したか確認する方法**:

#### 確認クエリの実行手順（詳細）

1. **Supabase Dashboard** を開く
2. 左側メニューから **「SQL Editor」** をクリック
3. **「New query」** ボタンをクリック（画面右上または左上）
4. **「Create a new snippet」** を選択（「Create a new folder」ではない）
5. 以下のクエリを**1つずつ**コピー＆ペーストして実行します

**確認クエリ1: is_adminカラムの確認**

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_admin';
```

**実行方法**:
- 上記のクエリをコピー
- SQL Editorの入力欄にペースト
- **「Run」** ボタン（または `Ctrl+Enter` / `Cmd+Enter`）をクリック

**期待される結果**:
- 1行の結果が表示される
- `column_name: is_admin`
- `data_type: boolean`
- `column_default: false`

**確認クエリ2: インデックスの確認**

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'profiles' AND indexname = 'idx_profiles_is_admin';
```

**実行方法**:
- 上記のクエリをコピー
- SQL Editorの入力欄にペースト（前のクエリを消去または新しいクエリを作成）
- **「Run」** ボタンをクリック

**期待される結果**:
- 1行の結果が表示される
- `indexname: idx_profiles_is_admin`
- `indexdef` にインデックスの定義が表示される

**確認クエリ3: 関数の確認**

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'is_admin';
```

**実行方法**:
- 上記のクエリをコピー
- SQL Editorの入力欄にペースト
- **「Run」** ボタンをクリック

**期待される結果**:
- 1行の結果が表示される
- `routine_name: is_admin`
- `routine_type: FUNCTION`

---

**確認結果の見方**:

- ✅ **すべてのクエリで1行ずつ結果が表示される** → セットアップ完了
- ❌ **結果が0行（何も表示されない）** → セットアップが完了していない可能性があります
  - その場合は、`supabase-admin-setup.sql` を再度実行してください

**注意**: 各クエリは**別々に実行**してください。3つのクエリを一度に実行すると、最後の結果しか表示されない場合があります。

---

### 2. 管理者アカウントの設定

#### 2-1. ユーザーID（UUID）の確認

**重要**: ユーザーIDは**メールアドレスではありません**。UUID（一意の識別子）です。

##### 方法1: Supabase Dashboardから確認（GUI）

1. **Supabase Dashboard** を開く
2. 左側メニューから **「Authentication」** をクリック
3. **「Users」** タブをクリック
4. ユーザー一覧が表示されます
5. 管理者に設定したいユーザー（自分のアカウントとテストアカウント）を探す
6. ユーザー一覧の **「ID」** 列（または **「UUID」** 列）を確認
   - 形式: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`（例: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`）
   - **メールアドレス列とは別**です
7. 該当するユーザーの **UUID** をコピー

**表示される情報**:
- **ID列**: UUID（例: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`）← **これを使用**
- **Email列**: メールアドレス（例: `user@example.com`）← これは使用しない
- **Created列**: アカウント作成日時
- **Last Sign In列**: 最終ログイン日時

##### 方法2: SQL Editorから確認（SQLクエリ）

1. **Supabase Dashboard** → **「SQL Editor」** を開く
2. **「New query」** → **「Create a new snippet」** を選択
3. 以下のクエリをコピー＆ペーストして実行

**全ユーザーの一覧を表示**:

```sql
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;
```

**特定のメールアドレスでユーザーを検索**:

```sql
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'メールアドレス@example.com';
```

**profilesテーブルと結合して詳細情報を表示**:

```sql
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  p.username,
  p.is_admin,
  p.level,
  p.points
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
```

**管理者アカウントのみを表示**:

```sql
SELECT 
  u.id,
  u.email,
  p.username,
  p.is_admin
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
WHERE p.is_admin = true;
```

**期待される結果**:
- ユーザー一覧が表示される
- `id`列にUUIDが表示される（これを使用）
- `email`列にメールアドレスが表示される
- `is_admin`列に管理者フラグが表示される（`true`/`false`）

**補足**:
- **ID列**: UUID（例: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`）← **これを使用**
- **Email列**: メールアドレス（例: `user@example.com`）← これは使用しない

#### 2-2. 管理者フラグの設定

**実行手順（確認クエリと同じ方法）**:

1. **Supabase Dashboard** → **「SQL Editor」** を開く
2. **「New query」** ボタンをクリック
3. **「Create a new snippet」** を選択
4. 以下のクエリを**1つずつ**コピー＆ペーストして実行します

**自分のアカウントを管理者に設定**:

```sql
UPDATE profiles
SET is_admin = true
WHERE id = 'あなたのユーザーID（UUID）';
```

**実行方法**:
- 上記のクエリをコピー
- `'あなたのユーザーID（UUID）'` の部分を、**2-1で確認した自分のUUID**に置き換える
  - 例: `WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';`
- SQL Editorの入力欄にペースト
- **「Run」** ボタン（または `Ctrl+Enter` / `Cmd+Enter`）をクリック

**期待される結果**:
- 「Success. No rows returned」または「Success」と表示される
- これは正常な動作です（UPDATE文は行を返さないため）

**テストアカウントを管理者に設定**（テストアカウントがある場合）:

```sql
UPDATE profiles
SET is_admin = true
WHERE id = 'テストアカウントのユーザーID（UUID）';
```

**実行方法**:
- 上記のクエリをコピー
- `'テストアカウントのユーザーID（UUID）'` の部分を、**2-1で確認したテストアカウントのUUID**に置き換える
- 新しいクエリを作成してペースト
- **「Run」** ボタンをクリック

**注意**: 
- `'あなたのユーザーID（UUID）'` と `'テストアカウントのユーザーID（UUID）'` を実際のUUIDに置き換えてください
- UUIDは**シングルクォート（`'`）で囲む**必要があります
- メールアドレスではなく、UUIDを使用してください

#### 2-3. 設定の確認

以下のクエリで管理者アカウントを確認できます：

```sql
-- 管理者アカウントの一覧を表示
SELECT id, username, is_admin
FROM profiles
WHERE is_admin = true;
```

---

### 3. 動作確認

#### 3-1. 管理者アカウントでログイン

1. 管理者に設定したアカウントでログイン
2. ダッシュボード → **「統計」** タブを開く
3. **「AI使用量」** セクションが表示されることを確認

#### 3-2. 一般ユーザーでログイン（テスト）

1. 管理者以外のアカウントでログイン（または新規登録）
2. ダッシュボード → **「統計」** タブを開く
3. **「AI使用量」** セクションが**表示されない**ことを確認

---

## セキュリティ

### ✅ 実装済みのセキュリティ対策

- **サーバーサイドチェック**: APIルート（`/api/ai/usage`）で管理者権限をチェック
- **RLS保護**: `profiles`テーブルは既存のRLSポリシーで保護されているため、`is_admin`カラムも保護されます
- **エラーハンドリング**: 管理者権限がない場合、403 Forbiddenを返し、クライアント側で適切に処理

### 🔒 セキュリティ上の注意事項

- **管理者アカウントの管理**: 管理者アカウントは最小限に保つ
- **ユーザーIDの機密性**: ユーザーID（UUID）は機密情報ではありませんが、管理者設定時は注意してください
- **RLSポリシー**: 既存のRLSポリシーにより、ユーザーは自分の`profiles`データのみアクセス可能です

---

## トラブルシューティング

### 「AI使用量」セクションが表示されない

#### 原因1: 管理者権限が設定されていない

**確認方法**:
```sql
SELECT id, username, is_admin
FROM profiles
WHERE id = 'あなたのユーザーID';
```

**対処法**: `is_admin`が`false`または`NULL`の場合、管理者フラグを設定してください。

#### 原因2: データベースのセットアップが完了していない

**確認方法**: SQL Editorで以下を実行
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'is_admin';
```

**対処法**: `is_admin`カラムが存在しない場合、`supabase-admin-setup.sql`を実行してください。

#### 原因3: APIエラーが発生している

**確認方法**: ブラウザの開発者ツール（F12）→ Networkタブで`/api/ai/usage`のレスポンスを確認

**対処法**: 
- 403エラー: 管理者権限が設定されていません
- 500エラー: サーバーログを確認してください

---

## ファイル構成

### 新規作成ファイル

- `docs/supabase-admin-setup.sql`: データベースセットアップ用SQLスクリプト
- `gol-web/lib/auth/admin.ts`: 管理者権限チェック用ユーティリティ関数
- `docs/ADMIN_SETUP_GUIDE.md`: このガイド

### 変更ファイル

- `gol-web/app/api/ai/usage/route.ts`: 管理者権限チェックを追加
- `gol-web/app/dashboard/stats-tab.tsx`: 403エラー時の処理を追加

---

## 次のステップ

1. ✅ データベースのセットアップ（`supabase-admin-setup.sql`を実行）
2. ✅ 管理者アカウントの設定（自分のアカウントとテストアカウント）
3. ✅ 動作確認（管理者/一般ユーザーでログインして確認）

---

## 参考情報

- **RLS（Row Level Security）**: `profiles`テーブルは既存のRLSポリシーで保護されています
- **管理者チェック**: サーバーサイド（APIルート）とクライアントサイド（エラーハンドリング）の両方で実装
- **セキュリティ**: 管理者権限のチェックは必ずサーバーサイドで行います
