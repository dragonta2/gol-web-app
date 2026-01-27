# タグ・フィルター・難易度設定機能｜実装設計書

**作成日**: 260122-木
**目的**: Habiticaの「タグ・フィルター」と「難易度設定」機能をGOLシステムに実装するための設計書

---

## 1. 概要

### 1.1 実装する機能

1. **タグ機能**
   - 習慣（habits）とToDo（todos）にタグを付与可能
   - タグによる分類・検索・フィルタリング
   - タグの作成・編集・削除

2. **フィルター機能**
   - タグによるフィルタリング
   - 難易度によるフィルタリング
   - 複数条件の組み合わせフィルタリング
   - フィルター状態の保存（オプション）

3. **難易度設定**
   - 習慣とToDoに難易度を設定可能
   - 難易度レベル: trivial（簡単）、easy（易しい）、medium（普通）、hard（難しい）
   - 難易度に応じた報酬の調整（オプション）

### 1.2 参考元（Habitica）

- **タグ・フィルター**: タスクを分類・検索可能
- **難易度設定**: タスクに難易度を設定（trivial, easy, medium, hard）

---

## 2. データベース設計

### 2.1 新規テーブル

#### 2.1.1 tags（タグマスタ）

**説明**: ユーザーが作成したタグの定義を格納

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_color TEXT DEFAULT '#3b82f6', -- タグの色（HEX形式、デフォルトは青）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, tag_name) -- 1ユーザー内でタグ名は一意
);

CREATE INDEX idx_tags_user ON tags(user_id);
CREATE INDEX idx_tags_name ON tags(tag_name);

CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**カラム説明:**

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | タグID |
| user_id | UUID | ユーザーID |
| tag_name | TEXT | タグ名（例: "運動", "仕事", "プライベート"） |
| tag_color | TEXT | タグの色（HEX形式、例: "#3b82f6"） |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**制約:**
- UNIQUE(user_id, tag_name): 1ユーザー内でタグ名は一意

#### 2.1.2 habit_tags（習慣-タグ関連）

**説明**: 習慣とタグの多対多リレーション

```sql
CREATE TABLE habit_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(habit_id, tag_id) -- 1習慣に同じタグは1つまで
);

CREATE INDEX idx_habit_tags_habit ON habit_tags(habit_id);
CREATE INDEX idx_habit_tags_tag ON habit_tags(tag_id);
```

**カラム説明:**

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | 関連ID |
| habit_id | UUID | 習慣ID |
| tag_id | UUID | タグID |
| created_at | TIMESTAMP | 作成日時 |

**制約:**
- UNIQUE(habit_id, tag_id): 1習慣に同じタグは1つまで

#### 2.1.3 todo_tags（ToDo-タグ関連）

**説明**: ToDoとタグの多対多リレーション

```sql
CREATE TABLE todo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(todo_id, tag_id) -- 1ToDoに同じタグは1つまで
);

CREATE INDEX idx_todo_tags_todo ON todo_tags(todo_id);
CREATE INDEX idx_todo_tags_tag ON todo_tags(tag_id);
```

**カラム説明:**

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | 関連ID |
| todo_id | UUID | ToDoタスクID |
| tag_id | UUID | タグID |
| created_at | TIMESTAMP | 作成日時 |

**制約:**
- UNIQUE(todo_id, tag_id): 1ToDoに同じタグは1つまで

### 2.2 既存テーブルの拡張

#### 2.2.1 habitsテーブルに難易度フィールドを追加

```sql
ALTER TABLE habits
ADD COLUMN difficulty TEXT DEFAULT 'medium' 
  CHECK (difficulty IN ('trivial', 'easy', 'medium', 'hard'));

CREATE INDEX idx_habits_difficulty ON habits(difficulty);
```

**カラム説明:**

| カラム名 | 型 | 説明 | デフォルト |
|---------|---|------|---------|
| difficulty | TEXT | 難易度（'trivial', 'easy', 'medium', 'hard'） | 'medium' |

#### 2.2.2 todosテーブルに難易度フィールドを追加

```sql
ALTER TABLE todos
ADD COLUMN difficulty TEXT DEFAULT 'medium' 
  CHECK (difficulty IN ('trivial', 'easy', 'medium', 'hard'));

CREATE INDEX idx_todos_difficulty ON todos(difficulty);
```

**カラム説明:**

| カラム名 | 型 | 説明 | デフォルト |
|---------|---|------|---------|
| difficulty | TEXT | 難易度（'trivial', 'easy', 'medium', 'hard'） | 'medium' |

### 2.3 RLS（Row Level Security）設定

#### 2.3.1 tagsテーブルのRLS

```sql
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分のタグのみ閲覧可能
CREATE POLICY "Users can view own tags"
ON tags FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: 自分のタグのみ作成可能
CREATE POLICY "Users can insert own tags"
ON tags FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: 自分のタグのみ更新可能
CREATE POLICY "Users can update own tags"
ON tags FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: 自分のタグのみ削除可能
CREATE POLICY "Users can delete own tags"
ON tags FOR DELETE
USING (auth.uid() = user_id);
```

#### 2.3.2 habit_tagsテーブルのRLS

```sql
ALTER TABLE habit_tags ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分の習慣のタグのみ閲覧可能
CREATE POLICY "Users can view own habit tags"
ON habit_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM habits
    WHERE habits.id = habit_tags.habit_id
    AND habits.user_id = auth.uid()
  )
);

-- INSERT: 自分の習慣のタグのみ作成可能
CREATE POLICY "Users can insert own habit tags"
ON habit_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM habits
    WHERE habits.id = habit_tags.habit_id
    AND habits.user_id = auth.uid()
  )
);

-- DELETE: 自分の習慣のタグのみ削除可能
CREATE POLICY "Users can delete own habit tags"
ON habit_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM habits
    WHERE habits.id = habit_tags.habit_id
    AND habits.user_id = auth.uid()
  )
);
```

#### 2.3.3 todo_tagsテーブルのRLS

```sql
ALTER TABLE todo_tags ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分のToDoのタグのみ閲覧可能
CREATE POLICY "Users can view own todo tags"
ON todo_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_tags.todo_id
    AND todos.user_id = auth.uid()
  )
);

-- INSERT: 自分のToDoのタグのみ作成可能
CREATE POLICY "Users can insert own todo tags"
ON todo_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_tags.todo_id
    AND todos.user_id = auth.uid()
  )
);

-- DELETE: 自分のToDoのタグのみ削除可能
CREATE POLICY "Users can delete own todo tags"
ON todo_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_tags.todo_id
    AND todos.user_id = auth.uid()
  )
);
```

---

## 3. 型定義（TypeScript）

### 3.1 新規型定義

```typescript
// lib/types.ts に追加

/**
 * tagsテーブル（タグマスタ）
 */
export interface Tag {
  /** タグの一意ID */
  id: string;
  /** ユーザーID */
  user_id: string;
  /** タグ名（例: "運動", "仕事"） */
  tag_name: string;
  /** タグの色（HEX形式、例: "#3b82f6"） */
  tag_color: string;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

/**
 * habit_tagsテーブル（習慣-タグ関連）
 */
export interface HabitTag {
  /** 関連ID */
  id: string;
  /** 習慣ID */
  habit_id: string;
  /** タグID */
  tag_id: string;
  /** 作成日時 */
  created_at: string;
}

/**
 * todo_tagsテーブル（ToDo-タグ関連）
 */
export interface TodoTag {
  /** 関連ID */
  id: string;
  /** ToDoタスクID */
  todo_id: string;
  /** タグID */
  tag_id: string;
  /** 作成日時 */
  created_at: string;
}

/**
 * 難易度の型
 */
export type Difficulty = 'trivial' | 'easy' | 'medium' | 'hard';

/**
 * 難易度の表示名
 */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  trivial: '簡単',
  easy: '易しい',
  medium: '普通',
  hard: '難しい',
};

/**
 * 難易度の色（Tailwind CSSクラス）
 */
export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  trivial: 'bg-gray-500',
  easy: 'bg-green-500',
  medium: 'bg-yellow-500',
  hard: 'bg-red-500',
};
```

### 3.2 既存型定義の拡張

```typescript
// Habitインターフェースに追加
export interface Habit {
  // ... 既存のフィールド
  /** 難易度 */
  difficulty: Difficulty;
  /** タグリスト（UI表示用、JOINで取得） */
  tags?: Tag[];
}

// Todoインターフェースに追加
export interface Todo {
  // ... 既存のフィールド
  /** 難易度 */
  difficulty: Difficulty;
  /** タグリスト（UI表示用、JOINで取得） */
  tags?: Tag[];
}
```

---

## 4. UI/UX設計

### 4.1 タグ機能のUI

#### 4.1.1 タグ入力UI（習慣・ToDo編集モーダル内）

**場所**: 習慣追加/編集モーダル、ToDo追加/編集モーダル

**UI要素:**
- **タグ選択エリア**
  - 既存タグの一覧表示（チェックボックスまたはチップ形式）
  - タグの色を表示（小さなカラーボックス）
  - 複数選択可能
- **新規タグ作成ボタン**
  - 「+ 新しいタグ」ボタン
  - クリックでタグ作成モーダルを開く
- **タグ作成モーダル**
  - タグ名入力フィールド
  - 色選択（カラーピッカーまたはプリセット色）
  - 「作成」ボタン

**デザイン案:**
```
┌─────────────────────────────────┐
│ タグ                            │
├─────────────────────────────────┤
│ [✓] 運動 #3b82f6               │
│ [ ] 仕事 #ef4444               │
│ [✓] プライベート #10b981       │
│                                 │
│ [+ 新しいタグ]                  │
└─────────────────────────────────┘
```

#### 4.1.2 タグ表示UI（習慣リスト・ToDoカンバン）

**場所**: 習慣リスト、ToDoカンバンボード

**UI要素:**
- 各習慣/ToDoの下にタグをチップ形式で表示
- タグの色を背景色として表示
- タグクリックでフィルター適用

**デザイン案:**
```
習慣名: 筋トレ
[運動] [健康] ← タグチップ
```

### 4.2 フィルター機能のUI

#### 4.2.1 フィルターUI（習慣リスト・ToDoカンバン上部）

**場所**: 習慣リスト、ToDoカンバンボードの上部

**UI要素:**
- **タグフィルター**
  - ドロップダウンまたはチップ選択
  - 複数タグの選択可能（AND条件）
  - 「すべて」オプション（フィルター解除）
- **難易度フィルター**
  - ドロップダウンまたはチップ選択
  - 複数難易度の選択可能（OR条件）
  - 「すべて」オプション（フィルター解除）
- **フィルターリセットボタン**
  - 「フィルターをクリア」ボタン

**デザイン案:**
```
┌─────────────────────────────────┐
│ フィルター                      │
├─────────────────────────────────┤
│ タグ: [すべて ▼]               │
│ 難易度: [すべて ▼]             │
│ [フィルターをクリア]            │
└─────────────────────────────────┘
```

#### 4.2.2 フィルター結果の表示

- フィルター適用時は、該当する習慣/ToDoのみ表示
- フィルター適用件数を表示（例: "3件表示中"）

### 4.3 難易度設定のUI

#### 4.3.1 難易度選択UI（習慣・ToDo編集モーダル内）

**場所**: 習慣追加/編集モーダル、ToDo追加/編集モーダル

**UI要素:**
- ラジオボタンまたはセレクトボックス
- 難易度ごとに色分け表示
- デフォルトは「普通（medium）」

**デザイン案:**
```
難易度:
○ 簡単 (trivial)
○ 易しい (easy)
● 普通 (medium) ← デフォルト
○ 難しい (hard)
```

---

## 5. API設計

### 5.1 タグ管理API

#### 5.1.1 タグ一覧取得

```
GET /api/tags
```

**レスポンス:**
```json
{
  "tags": [
    {
      "id": "tag-001",
      "user_id": "user-001",
      "tag_name": "運動",
      "tag_color": "#3b82f6",
      "created_at": "2024-01-22T00:00:00Z",
      "updated_at": "2024-01-22T00:00:00Z"
    }
  ]
}
```

#### 5.1.2 タグ作成

```
POST /api/tags
```

**リクエストボディ:**
```json
{
  "tag_name": "運動",
  "tag_color": "#3b82f6"
}
```

**レスポンス:**
```json
{
  "tag": {
    "id": "tag-001",
    "user_id": "user-001",
    "tag_name": "運動",
    "tag_color": "#3b82f6",
    "created_at": "2024-01-22T00:00:00Z",
    "updated_at": "2024-01-22T00:00:00Z"
  }
}
```

#### 5.1.3 タグ更新

```
PUT /api/tags/:id
```

**リクエストボディ:**
```json
{
  "tag_name": "運動・健康",
  "tag_color": "#10b981"
}
```

#### 5.1.4 タグ削除

```
DELETE /api/tags/:id
```

### 5.2 習慣-タグ関連API

#### 5.2.1 習慣にタグを追加

```
POST /api/habits/:habitId/tags
```

**リクエストボディ:**
```json
{
  "tag_id": "tag-001"
}
```

#### 5.2.2 習慣からタグを削除

```
DELETE /api/habits/:habitId/tags/:tagId
```

#### 5.2.3 習慣のタグ一覧取得

```
GET /api/habits/:habitId/tags
```

### 5.3 ToDo-タグ関連API

#### 5.3.1 ToDoにタグを追加

```
POST /api/todos/:todoId/tags
```

**リクエストボディ:**
```json
{
  "tag_id": "tag-001"
}
```

#### 5.3.2 ToDoからタグを削除

```
DELETE /api/todos/:todoId/tags/:tagId
```

#### 5.3.3 ToDoのタグ一覧取得

```
GET /api/todos/:todoId/tags
```

### 5.4 フィルター機能API

#### 5.4.1 習慣一覧取得（フィルター付き）

```
GET /api/habits?tags=tag-001,tag-002&difficulty=easy,medium
```

**クエリパラメータ:**
- `tags`: カンマ区切りのタグID（AND条件）
- `difficulty`: カンマ区切りの難易度（OR条件）

#### 5.4.2 ToDo一覧取得（フィルター付き）

```
GET /api/todos?tags=tag-001,tag-002&difficulty=easy,medium
```

**クエリパラメータ:**
- `tags`: カンマ区切りのタグID（AND条件）
- `difficulty`: カンマ区切りの難易度（OR条件）

---

## 6. 実装優先順位

### Phase 1: 基盤実装（最優先）

1. **データベーススキーマの追加**
   - [ ] tagsテーブルの作成
   - [ ] habit_tagsテーブルの作成
   - [ ] todo_tagsテーブルの作成
   - [ ] habitsテーブルにdifficultyカラム追加
   - [ ] todosテーブルにdifficultyカラム追加
   - [ ] RLSポリシーの設定

2. **型定義の追加**
   - [ ] Tag、HabitTag、TodoTag型の追加
   - [ ] Difficulty型の追加
   - [ ] Habit、Todo型にdifficultyとtagsフィールドを追加

### Phase 2: 難易度設定機能（優先度: 高）

3. **難易度設定UIの実装**
   - [ ] 習慣編集モーダルに難易度選択UI追加
   - [ ] ToDo編集モーダルに難易度選択UI追加
   - [ ] 難易度の保存機能実装

4. **難易度表示UIの実装**
   - [ ] 習慣リストに難易度バッジ表示
   - [ ] ToDoカンバンに難易度バッジ表示

### Phase 3: タグ機能（優先度: 中）

5. **タグ管理機能の実装**
   - [ ] タグ一覧取得API実装
   - [ ] タグ作成API実装
   - [ ] タグ更新API実装
   - [ ] タグ削除API実装

6. **タグ関連付け機能の実装**
   - [ ] 習慣-タグ関連付けAPI実装
   - [ ] ToDo-タグ関連付けAPI実装
   - [ ] タグ関連付けUI実装（編集モーダル内）

7. **タグ表示UIの実装**
   - [ ] 習慣リストにタグチップ表示
   - [ ] ToDoカンバンにタグチップ表示

### Phase 4: フィルター機能（優先度: 中）

8. **フィルターUIの実装**
   - [ ] 習慣リストにフィルターUI追加
   - [ ] ToDoカンバンにフィルターUI追加
   - [ ] フィルターロジックの実装（クライアント側）

9. **フィルターAPIの実装**
   - [ ] 習慣一覧取得APIにフィルターパラメータ追加
   - [ ] ToDo一覧取得APIにフィルターパラメータ追加

### Phase 5: 高度な機能（優先度: 低）

10. **フィルター状態の保存**
    - [ ] フィルター状態をローカルストレージに保存
    - [ ] ページリロード時にフィルター状態を復元

11. **難易度に応じた報酬調整（オプション）**
    - [ ] 難易度に応じたポイント/EXPの倍率設定
    - [ ] 報酬計算ロジックの実装

---

## 7. 実装時の注意点

### 7.1 パフォーマンス

- **タグのJOIN取得**: 習慣/ToDo一覧取得時にタグも一緒に取得する（N+1問題を回避）
- **インデックスの活用**: タグID、難易度での検索を高速化

### 7.2 ユーザビリティ

- **タグの自動補完**: タグ入力時に既存タグをサジェスト
- **タグの色の自動割り当て**: 新規タグ作成時に色を自動割り当て（オプション）
- **フィルターの視覚的フィードバック**: フィルター適用中であることを明確に表示

### 7.3 データ整合性

- **タグ削除時の処理**: タグを削除する際、関連付けも自動削除（CASCADE）
- **難易度のデフォルト値**: 既存データには'medium'を設定

---

## 8. 次のステップ

1. **設計レビュー**: この設計書をレビューして、修正点があれば反映
2. **Phase 1の実装開始**: データベーススキーマの追加から開始
3. **段階的な実装**: Phase 1 → Phase 2 → Phase 3 → Phase 4 の順で実装

---

## 9. 参考資料

- Habitica分析レポート: `HABITICA_ANALYSIS_REPORT.md`
- データベース設計書: `07-database-schema.md`
- 型定義ファイル: `gol-web/lib/types.ts`
