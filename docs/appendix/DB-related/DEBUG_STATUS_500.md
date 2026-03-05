# Status 500 エラーのデバッグ手順

Status 500が続く場合の詳細な確認方法です。

---

## ステップ1: エラーメッセージの詳細を確認

### 方法1: NetworkタブのResponseを確認

1. 開発者ツール（F12）→ **Network**タブを開く
2. `/api/ai/usage` をクリック
3. **「Response」**タブまたは**「Preview」**タブをクリック
4. エラーメッセージを確認
   - `"使用量統計の取得に失敗しました"`
   - `"details"` フィールドに詳細なエラーメッセージが表示される

### 方法2: Consoleタブでエラーを確認

1. 開発者ツール（F12）→ **Console**タブを開く
2. 赤いエラーメッセージを確認
   - `使用量統計取得エラー:` というメッセージがあるか確認
   - その後に表示されるエラーの詳細を確認

---

## ステップ2: データベースの状態を確認

### 確認1: RPC関数が存在するか

SQL Editorで以下のクエリを実行：

```sql
-- すべてのRPC関数を確認
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'get_usage_statistics',
  'get_today_usage_count',
  'get_monthly_usage_count',
  'get_today_total_cost',
  'get_monthly_total_cost'
)
ORDER BY routine_name;
```

**期待される結果**: 5つの関数がすべて表示される

**もし関数が表示されない場合**:
- SQLスクリプトが正しく実行されていない可能性があります
- 再度、`supabase-ai-usage-setup.sql`の「3. 使用量集計関数」セクションを実行してください

---

### 確認2: ai_usage_logsテーブルが存在するか

```sql
-- テーブルが存在するか確認
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'ai_usage_logs';
```

**期待される結果**: `ai_usage_logs` が表示される

**もしテーブルが存在しない場合**:
- `supabase-ai-usage-setup.sql`の「1. AI使用量記録テーブル」セクションを実行してください

---

### 確認3: テーブルのカラムを確認

```sql
-- テーブルのカラムを確認
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ai_usage_logs'
ORDER BY ordinal_position;
```

**期待されるカラム**:
- `id`
- `user_id`
- `api_type`
- `total_tokens`
- `total_cost`
- `created_at`
- `status`

---

## ステップ3: 関数を直接テスト

SQL Editorで以下のクエリを実行して、関数が正しく動作するか確認：

```sql
-- テスト用: あなたのユーザーID（UUID）に置き換える
SELECT get_usage_statistics('あなたのユーザーID（UUID）', 30);
```

**もしエラーが表示される場合**:
- エラーメッセージの内容を確認してください
- よくあるエラー:
  - `column "total_tokens" does not exist` → カラム名が間違っている
  - `relation "ai_usage_logs" does not exist` → テーブルが存在しない
  - `function get_usage_statistics does not exist` → 関数が作成されていない

---

## ステップ4: 管理者権限を確認

管理者フラグが設定されているか確認：

```sql
-- メールアドレスからUUIDと管理者フラグを確認
SELECT u.id, u.email, p.is_admin
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'あなたのメールアドレス@example.com';
```

**期待される結果**: `is_admin` が `true` であること

**もし `is_admin` が `false` または `NULL` の場合**:

```sql
-- 管理者フラグを設定
UPDATE profiles
SET is_admin = true
WHERE id = 'あなたのユーザーID（UUID）';
```

---

## よくあるエラーと対処法

### エラー1: "function get_usage_statistics does not exist"

**原因**: 関数が作成されていない

**対処法**:
- `supabase-ai-usage-setup.sql`の「3. 使用量集計関数」セクションを再度実行

---

### エラー2: "column 'total_tokens' does not exist"

**原因**: テーブルのカラム名が間違っている

**確認方法**:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'ai_usage_logs';
```

**対処法**:
- カラム名を確認し、関数のSQLを修正する必要がある場合があります

---

### エラー3: "relation ai_usage_logs does not exist"

**原因**: テーブルが作成されていない

**対処法**:
- `supabase-ai-usage-setup.sql`の「1. AI使用量記録テーブル」セクションを実行

---

## 次のステップ

1. **NetworkタブのResponse**でエラーメッセージの詳細を確認
2. **Consoleタブ**でエラーメッセージを確認
3. 上記の確認クエリを実行して、データベースの状態を確認
4. エラーメッセージの内容を教えてください

具体的なエラーメッセージが分かれば、より正確な対処法を提案できます。
