# データ削除ガイド

このガイドでは、データの削除方法を説明します。

---

## データ削除で削除されるデータの範囲

### ✅ 削除されるテーブル（すべて）

`profiles`を削除すると、外部キー制約（`ON DELETE CASCADE`）により、以下のデータが**自動的に削除**されます。

#### 1. **profiles（ユーザープロファイル）**
- ユーザー名、レベル、クラス
- ポイント、EXP（身体、頭脳、精神）
- 作成日時、更新日時

#### 2. **daily_logs（日誌データ）**
- 日誌本文、一言感想
- AI判定結果（スコア、ポイント、EXP）
- AIアドバイス、AIあらすじ
- ポイント利用（権利の使用回数）
- 各日の記録データ

#### 3. **habits（習慣マスタ）**
- 習慣名、習慣タイプ（良習慣/悪習慣/ボーナス）
- 報酬設定（ポイント、EXP）
- 表示順序、カスタマイズ設定

#### 4. **habit_logs（習慣記録）**
- 毎日の習慣チェック状況
- 習慣の達成記録（チェックボックス型/回数型）

#### 5. **todos（ToDoマスタ）**
- ToDoタスク名
- SPタスク設定、報酬設定
- ステータス（アクティブ/進行中/完了済み）
- 期限、完了日

#### 6. **todo_logs（ToDo記録）**
- ToDo完了履歴
- 完了時の報酬（ポイント、EXP）

#### 7. **todo_subtasks（ToDoサブタスク）**
- ToDoタスクのサブタスク（子チェックリスト）

#### 8. **ai_usage_logs（AI使用量ログ）**
- AI判定の使用回数
- トークン使用量、コスト
- エラーログ

---

### ❌ 削除されないもの

#### **auth.users（認証情報）**
- 現在の実装では削除していません（コメントアウト済み）
- メールアドレス、パスワードハッシュ
- 認証トークン、セッション情報

**注意**: 認証情報を削除すると、そのアカウントでログインできなくなります。必要に応じて、API Routeのコメントアウト部分を有効化できます。

---

### 削除の仕組み

```
profiles（削除）
  ↓ ON DELETE CASCADE
  ├─ daily_logs（自動削除）
  │   └─ habit_logs（自動削除）
  │   └─ todo_logs（自動削除）
  ├─ habits（自動削除）
  │   └─ habit_logs（自動削除）
  ├─ todos（自動削除）
  │   ├─ todo_logs（自動削除）
  │   └─ todo_subtasks（自動削除）
  └─ ai_usage_logs（自動削除）
```

**重要**: `profiles`を削除すると、そのユーザーに関連する**すべてのアプリケーションデータ**が削除されます。認証情報は残るため、再度ログインして新規データを作成できます。

認証情報も削除したい場合は、`gol-web/app/api/user/delete-data/route.ts`のコメントアウト部分を有効化してください。

---

## 1. 本番アカウントのテストデータ削除（管理者向け）

開発中に本番アカウントでテストデータを作成してしまった場合、SQLで直接削除できます。

### 手順

1. **Supabase Dashboard** → **「SQL Editor」** を開く
2. **「New query」** → **「Create a new snippet」** を選択
3. `docs/supabase-delete-user-data.sql` の内容をコピー＆ペースト
4. **削除したいユーザーのUUIDを確認**
   - Supabase Dashboard → Authentication → Users
   - 対象ユーザーの「ID」列（UUID）をコピー
5. SQL内の `'ユーザーID（UUID）'` を実際のUUIDに置き換える
6. **削除前の確認クエリを実行**（オプション）
   - 削除対象のデータ件数を確認
7. **「Run」** ボタンをクリックして実行

### 注意事項

- ⚠️ **この操作は取り消せません**
- ⚠️ 実行前に必ずバックアップを取ってください
- ⚠️ 削除されるデータ:
  - `daily_logs`（日誌データ）
  - `habits` / `habit_logs`（習慣データ）
  - `todos` / `todo_logs`（ToDoデータ）
  - `ai_usage_logs`（AI使用量ログ）
  - `profiles`（ユーザープロファイル）

### 例

```sql
-- 削除したいユーザーのUUIDを設定
DO $$
DECLARE
  target_user_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; -- ← 実際のUUIDに置き換える
BEGIN
  -- 削除前にデータ件数を確認
  RAISE NOTICE '削除対象ユーザーID: %', target_user_id;
  RAISE NOTICE 'daily_logs: %件', (SELECT COUNT(*) FROM daily_logs WHERE user_id = target_user_id);
  -- ... 他のテーブルも確認
  
  -- データを削除
  DELETE FROM profiles WHERE id = target_user_id;
  
  RAISE NOTICE '削除完了';
END $$;
```

---

## 2. ユーザーによるデータ削除機能（実運用向け）

ユーザーが自分でデータを削除できる機能を実装しました。

### 機能概要

- **場所**: ダッシュボード → 「設定」ページ
- **アクセス**: ダッシュボード上部の「設定」ボタンから
- **セキュリティ**: RLSにより、自分のデータのみ削除可能

### 使用方法

1. ダッシュボードにログイン
2. 上部の「**設定**」ボタンをクリック
3. 「**データの削除**」セクションを確認
4. 「**データを削除する**」ボタンをクリック
5. 警告メッセージを確認
6. 確認のため「**削除**」と入力
7. 「**削除を実行**」ボタンをクリック

### 削除されるデータ

- 日誌データ（`daily_logs`）
- 習慣データ（`habits`, `habit_logs`）
- ToDoデータ（`todos`, `todo_logs`）
- AI使用量ログ（`ai_usage_logs`）
- ユーザープロファイル（`profiles`）

### セキュリティ

- ✅ **RLS保護**: ユーザーは自分のデータのみ削除可能
- ✅ **認証チェック**: ログインしているユーザーのみアクセス可能
- ✅ **確認プロセス**: 「削除」と入力しないと削除できない
- ✅ **警告表示**: 削除前に警告メッセージを表示

---

## 3. 特定テーブルのデータのみ削除

全データではなく、特定のテーブルのデータだけを削除したい場合:

```sql
-- 例: daily_logsのみ削除
DELETE FROM daily_logs WHERE user_id = 'ユーザーID（UUID）';

-- 例: habitsとhabit_logsのみ削除
DELETE FROM habit_logs WHERE user_id = 'ユーザーID（UUID）';
DELETE FROM habits WHERE user_id = 'ユーザーID（UUID）';

-- 例: todosとtodo_logsのみ削除
DELETE FROM todo_logs WHERE user_id = 'ユーザーID（UUID）';
DELETE FROM todos WHERE user_id = 'ユーザーID（UUID）';

-- 例: AI使用量ログのみ削除
DELETE FROM ai_usage_logs WHERE user_id = 'ユーザーID（UUID）';
```

---

## 4. 削除前の確認クエリ

削除前に、削除対象のデータ件数を確認できます:

```sql
SELECT 
  'daily_logs' as table_name, COUNT(*) as count
FROM daily_logs WHERE user_id = 'ユーザーID（UUID）'
UNION ALL
SELECT 'habits', COUNT(*) FROM habits WHERE user_id = 'ユーザーID（UUID）'
UNION ALL
SELECT 'habit_logs', COUNT(*) FROM habit_logs WHERE user_id = 'ユーザーID（UUID）'
UNION ALL
SELECT 'todos', COUNT(*) FROM todos WHERE user_id = 'ユーザーID（UUID）'
UNION ALL
SELECT 'todo_logs', COUNT(*) FROM todo_logs WHERE user_id = 'ユーザーID（UUID）'
UNION ALL
SELECT 'ai_usage_logs', COUNT(*) FROM ai_usage_logs WHERE user_id = 'ユーザーID（UUID）';
```

---

## トラブルシューティング

### エラー: "permission denied"

**原因**: RLSポリシーにより、他のユーザーのデータを削除しようとしている

**対処法**: 
- 自分のデータのみ削除可能です
- 管理者が他のユーザーのデータを削除する場合は、Supabase DashboardのSQL Editorで直接実行してください

### エラー: "relation does not exist"

**原因**: テーブルが存在しない

**対処法**: 
- テーブル名を確認してください
- テーブルが作成されているか確認してください

### データが削除されない

**原因**: 外部キー制約により、親レコード（`profiles`）を削除する必要がある

**対処法**: 
- `profiles`テーブルから削除すると、関連データも自動的に削除されます（`ON DELETE CASCADE`）

---

## ファイル構成

### 新規作成ファイル

- `docs/supabase-delete-user-data.sql`: データ削除用SQLスクリプト
- `gol-web/app/api/user/delete-data/route.ts`: データ削除API Route
- `gol-web/app/settings/page.tsx`: 設定ページ（データ削除機能付き）
- `docs/DATA_DELETION_GUIDE.md`: このガイド

---

## 参考情報

- **RLS（Row Level Security）**: ユーザーは自分のデータのみアクセス可能
- **外部キー制約**: `ON DELETE CASCADE`により、親レコードを削除すると子レコードも自動削除
- **セキュリティ**: すべての削除操作はRLSにより保護されています
