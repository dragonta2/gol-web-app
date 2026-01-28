# サーバー側バリデーション設計書

**このファイルの役割:** サーバー側バリデーションの実装方針とデータベース制約との整合性

---

## バリデーション方針

### 基本原則

1. **クライアント側とサーバー側の二重チェック**
   - クライアント側: UX向上（即座のフィードバック）
   - サーバー側: セキュリティとデータ整合性の保証

2. **データベース制約との整合性**
   - データベースのCHECK制約、UNIQUE制約、NOT NULL制約を反映
   - 外部キー制約の整合性を確認

3. **エラーメッセージの統一**
   - ユーザーフレンドリーなエラーメッセージ
   - 詳細情報を`details`フィールドに含める

---

## データベース制約との整合性

### 1. daily_logs（日誌）

**データベース制約:**
- `journal_text`: TEXT（最大長制約なし、アプリ側で3000文字制限）
- `one_line_comment`: TEXT（最大長制約なし、アプリ側で500文字制限）
- `right_*_count`: INTEGER（0以上、アプリ側で上限設定）
- `UNIQUE(user_id, log_date)`: 1ユーザーにつき1日1レコード

**バリデーション実装:**
- `validateJournalText`: 0-3000文字
- `validateImpressionText`: 0-500文字
- `validateRightCount`: 0-上限値（権利Cは10、その他は99）
- API Routeでユーザー所有権を確認

**API Route:**
- `PUT /api/daily-logs`: 日誌の更新

---

### 2. habits（習慣マスタ）

**データベース制約:**
- `habit_name`: TEXT NOT NULL
- `habit_type`: TEXT NOT NULL CHECK (habit_type IN ('good', 'bad', 'bonus'))
- `points`: INTEGER DEFAULT 1（0以上）
- `exp_body`, `exp_mind`, `exp_spirit`: INTEGER DEFAULT 0（0以上）
- `input_type`: TEXT DEFAULT 'checkbox' CHECK (input_type IN ('checkbox', 'number'))
- `user_id`: UUID NOT NULL REFERENCES profiles(id)

**バリデーション実装:**
- `validateHabitName`: 必須、1-100文字
- `validateHabitType`: 'good', 'bad', 'bonus'のいずれか
- `validateInputType`: 'checkbox', 'number'のいずれか
- `validatePoints`: 0-9999
- `validateExp`: 0-9999
- API Routeでユーザー所有権を確認

**API Route:**
- `POST /api/habits`: 習慣の作成
- `PUT /api/habits`: 習慣の更新
- `DELETE /api/habits`: 習慣の削除（カスタム習慣のみ）

---

### 3. todos（ToDoマスタ）

**データベース制約:**
- `task_name`: TEXT NOT NULL
- `status`: TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed'))
- `sp_points`, `sp_exp_*`: INTEGER DEFAULT 0（0以上）
- `due_date`: DATE（YYYY-MM-DD形式）
- `user_id`: UUID NOT NULL REFERENCES profiles(id)

**バリデーション実装:**
- `validateTaskName`: 必須、1-200文字
- `validateTodoStatus`: 'active', 'in_progress', 'completed'のいずれか
- `validatePoints`: 0-9999
- `validateExp`: 0-9999
- `validateDateFormat`: YYYY-MM-DD形式
- API Routeでユーザー所有権を確認

**API Route:**
- `POST /api/todos`: ToDoの作成
- `PUT /api/todos`: ToDoの更新
- `DELETE /api/todos`: ToDoの削除

---

### 4. AI判定・生成API

**バリデーション実装:**
- `validateJournalText`: 0-3000文字
- `validateImpressionText`: 0-500文字
- `validateScore`: 0-100（体調スコア・気分スコア）

**API Route:**
- `POST /api/ai/judgment`: 日誌本文・一言感想のバリデーション
- `POST /api/ai/advice`: 日誌本文・一言感想・スコアのバリデーション
- `POST /api/ai/story`: 日誌本文・一言感想のバリデーション

---

## 実装済みバリデーション関数

### 文字列バリデーション
- `validateStringLength`: 文字列の長さチェック
- `validateJournalText`: 日誌本文（0-3000文字）
- `validateImpressionText`: 一言感想（0-500文字）
- `validateHabitName`: 習慣名（必須、1-100文字）
- `validateTaskName`: ToDoタスク名（必須、1-200文字）

### 数値バリデーション
- `validateNumberRange`: 数値の範囲チェック
- `validateInteger`: 整数チェック
- `validatePoints`: ポイント（0-9999）
- `validateExp`: EXP（0-9999）
- `validateScore`: スコア（0-100）
- `validateRightCount`: 権利の利用回数（0-上限値）

### 列挙型バリデーション
- `validateHabitType`: 習慣の種類（'good', 'bad', 'bonus'）
- `validateInputType`: 入力タイプ（'checkbox', 'number'）
- `validateTodoStatus`: ToDoステータス（'active', 'in_progress', 'completed'）

### フォーマットバリデーション
- `validateDateFormat`: 日付フォーマット（YYYY-MM-DD）
- `validateUUID`: UUID形式

### 複合バリデーション
- `validateAll`: 複数のバリデーション結果をまとめてチェック

---

## セキュリティ考慮事項

### 認証チェック
- すべてのAPI Routeで認証状態を確認
- 未認証の場合は401を返す

### 所有権チェック
- データの所有権を確認（ユーザーIDの一致）
- 他ユーザーのデータへのアクセスは403を返す

### データ存在確認
- 更新・削除前にデータの存在を確認
- 存在しない場合は404を返す

---

## エラーレスポンス形式

```typescript
{
  error: string,        // メインエラーメッセージ
  details?: string[]    // 詳細エラー情報（複数のバリデーションエラーがある場合）
}
```

**HTTPステータスコード:**
- `400`: バリデーションエラー
- `401`: 認証エラー
- `403`: アクセス権限エラー
- `404`: リソースが見つからない
- `500`: サーバーエラー

---

## 今後の拡張予定

- [ ] habit_logsのバリデーション（API Route作成）
- [ ] todo_logsのバリデーション（API Route作成）
- [ ] todo_subtasksのバリデーション（API Route作成）
- [ ] データベース制約違反時の詳細エラーメッセージ

