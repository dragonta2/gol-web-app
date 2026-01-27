# AI使用量セクションが表示されない場合のトラブルシューティング

「統計」タブで「AI使用量」セクションが表示されない場合の確認方法と対処法です。

---

## 確認手順

### ステップ1: ブラウザの開発者ツールでエラーを確認

1. **ブラウザの開発者ツールを開く**
   - Windows/Linux: `F12` または `Ctrl+Shift+I`
   - Mac: `Cmd+Option+I`
   - または、右クリック → 「検証」を選択

2. **「Console」タブを開く**
   - エラーメッセージを確認
   - `AI使用量取得エラー` というメッセージがあるか確認

3. **「Network」タブを開く**
   - ページをリロード（`F5`）
   - `/api/ai/usage` というリクエストを探す
   - クリックして詳細を確認
   - **Status**列を確認:
     - `200`: 成功（データがない可能性）
     - `403`: 管理者権限がない
     - `500`: サーバーエラー（RPC関数が存在しない可能性）

---

## 原因と対処法

### 原因1: 管理者権限がない（403エラー）

**症状**:
- Networkタブで `/api/ai/usage` のStatusが `403`
- レスポンスに `"管理者権限が必要です"` というメッセージ

**確認方法**:

SQL Editorで以下のクエリを実行：

```sql
-- 現在ログインしているユーザーが管理者か確認
SELECT id, username, email, is_admin
FROM profiles
WHERE id = 'あなたのユーザーID（UUID）';
```

**期待される結果**:
- `is_admin` が `true` であること

**対処法**:

管理者フラグを設定：

```sql
UPDATE profiles
SET is_admin = true
WHERE id = 'あなたのユーザーID（UUID）';
```

**ユーザーID（UUID）の確認方法**:

```sql
-- メールアドレスからUUIDを確認
SELECT u.id, u.email, p.is_admin
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'あなたのメールアドレス@example.com';
```

---

### 原因2: AI判定を実行していない（データが存在しない）

**症状**:
- Networkタブで `/api/ai/usage` のStatusが `200`
- レスポンスは正常だが、データが空

**確認方法**:

SQL Editorで以下のクエリを実行：

```sql
-- AI使用量ログが存在するか確認
SELECT COUNT(*) as count
FROM ai_usage_logs
WHERE user_id = 'あなたのユーザーID（UUID）';
```

**期待される結果**:
- `count` が `0` より大きいこと

**対処法**:

1. ダッシュボード → 「日誌」タブに移動
2. 日誌本文または一言感想を入力
3. 「AI判定を実行」ボタンをクリック
4. AI判定が成功したら、「統計」タブに戻る
5. 「AI使用量」セクションが表示されることを確認

---

### 原因3: データベースのRPC関数が作成されていない（500エラー）

**症状**:
- Networkタブで `/api/ai/usage` のStatusが `500`
- レスポンスに `"使用量統計の取得に失敗しました"` というメッセージ
- Consoleに `get_usage_statistics` などの関数名が表示される

**確認方法**:

SQL Editorで以下のクエリを実行：

```sql
-- RPC関数が存在するか確認
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'get_usage_statistics',
  'get_today_usage_count',
  'get_monthly_usage_count',
  'get_today_total_cost',
  'get_monthly_total_cost'
);
```

**期待される結果**:
- 5つの関数がすべて表示されること

**対処法**:

`supabase-ai-usage-setup.sql` の「3. 使用量集計関数」セクションを実行してください。

1. Supabase Dashboard → SQL Editor
2. 「New query」→ 「Create a new snippet」
3. `docs/supabase-ai-usage-setup.sql` を開く
4. 「3. 使用量集計関数」セクションをコピー＆ペースト
5. 「Run」ボタンをクリック

---

### 原因4: データベーステーブルが作成されていない

**症状**:
- Networkタブで `/api/ai/usage` のStatusが `500`
- レスポンスに `"relation ai_usage_logs does not exist"` というメッセージ

**確認方法**:

SQL Editorで以下のクエリを実行：

```sql
-- ai_usage_logsテーブルが存在するか確認
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'ai_usage_logs';
```

**期待される結果**:
- `ai_usage_logs` が表示されること

**対処法**:

`supabase-ai-usage-setup.sql` の「1. AI使用量記録テーブル」セクションを実行してください。

---

## クイックチェックリスト

「AI使用量」セクションが表示されない場合、以下を順番に確認してください：

- [ ] **管理者フラグが設定されているか**
  ```sql
  SELECT is_admin FROM profiles WHERE id = 'あなたのUUID';
  ```
  → `true` であることを確認

- [ ] **AI判定を実行したか**
  ```sql
  SELECT COUNT(*) FROM ai_usage_logs WHERE user_id = 'あなたのUUID';
  ```
  → `0` より大きいことを確認

- [ ] **RPC関数が作成されているか**
  ```sql
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_name = 'get_usage_statistics';
  ```
  → 関数が表示されることを確認

- [ ] **テーブルが作成されているか**
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_name = 'ai_usage_logs';
  ```
  → `ai_usage_logs` が表示されることを確認

---

## よくある質問

### Q: 管理者フラグを設定したのに、まだ表示されない

**A**: 以下を確認してください：
1. ブラウザをリロード（`F5`）
2. ログアウトして再度ログイン
3. ブラウザの開発者ツール（F12）→ Networkタブで `/api/ai/usage` のレスポンスを確認

### Q: AI判定を実行したのに、まだ表示されない

**A**: 以下を確認してください：
1. AI判定が成功したか（エラーが出ていないか）
2. ブラウザをリロード（`F5`）
3. SQL Editorで使用量ログが記録されているか確認：
   ```sql
   SELECT * FROM ai_usage_logs WHERE user_id = 'あなたのUUID' ORDER BY created_at DESC LIMIT 5;
   ```

### Q: すべて確認したが、まだ表示されない

**A**: ブラウザの開発者ツール（F12）→ ConsoleタブとNetworkタブのエラーメッセージを確認し、上記の原因に該当するか確認してください。
