# MD版↔Web版 同期可能性分析

**作成日:** 2024-11-28-金

**目的:** MD版（`gol/md-app/now/story/`）とWeb版（Supabase）の同期可能性を検証

---

## MD版のデータ構造

### ファイル構成

1. **`0-monthly-episode-YYMM.md`**（月次日誌ファイル）
   - 雛形セクション（編集禁止）
   - ToDoリスト（アクティブ/完了済み）
   - 日誌｜処理前/ドラフト/当日日誌
   - 日誌｜処理済み/最新話
   - 日誌｜過去分

2. **`1-todo-list-summary.md`**（ToDoサマリー）
   - アクティブタスク
   - 完了済みタスク

### データ構造（MD版）

#### 1. 習慣

**形式:**
```markdown
- 良習慣実行（やった場合にチェック）
  - [x] GOLリストを記述｜ログインボーナス｜1日に一回のみ
  - [x] 起床｜7時までに
  - [x] 懸垂｜10回
  - [] ラン or 散歩

- 悪習慣回避（やらなかった場合にチェック）
  - [x] 無目的なYouTube視聴（30分以上）しない
  - [] お酒を飲まなかった

- 習慣ボーナス
  - [] Completeボーナス｜+10pt
```

**特徴:**
- チェックボックス形式（`- [x]` = 実行済み、`- []` = 未実行）
- 習慣名は自由記述（「｜」で区切り情報を記載）
- 数値入力は習慣名に含まれる（例: 「懸垂｜10回」）
- 種類は見出しで区別（良習慣/悪習慣/ボーナス）

#### 2. ToDoタスク

**形式:**
```markdown
- [] ⚠️ 期限超過｜**SP-2pt-2ex**｜タスク名:トラSSでのプチツーリング計画
  - 期限:251120-木
  - 完了日:2511DD-W
  - [] どこいくか｜調査｜AI利用
  - [] 候補 リストアップ｜AI利用
  - [] 判断｜AI利用
  - [] 決める

- ✅ ⚠️ 期限超過｜通常｜タスク名:睡眠時無呼吸の検査キット実施
  - 身体: +0 / 頭脳: +1 / 精神: +1
  - 期限:251114-金
  - 完了日:251127-木
  - ✅ 箱開けて確認
  - ✅ 調査｜資料、やり方 把握
  - ✅ 実施する
```

**特徴:**
- チェックボックス形式（`- []` = アクティブ、`- ✅` = 完了済み）
- 期限超過ラベル（`⚠️ 期限超過`）
- SPタスク: `**SP-Xpt-Yex**`形式（X=ポイント、Y=合計EXP）
- サブタスク: インデントされたチェックリスト
- 期限・完了日: `期限:YYMMDD-W`形式
- EXP配分: `身体: +X / 頭脳: +Y / 精神: +Z`形式（完了済みのみ）

#### 3. 日誌

**形式:**
```markdown
##### 今日の日誌 ==============

0700｜起床
冷水シャワー
Langaku｜鬼滅の刃
瞑想｜VZ
...

##### 一言感想 ==============

早起きはできた。
やっと、めんどうな小規模企業共済の現金払い手続きが終わった。
...
```

**特徴:**
- 自由記述テキスト
- 時系列形式（例: `0700｜起床`）

#### 4. 権利（ポイント利用）

**形式:**
```markdown
- [] 権利A｜TVゲーム
- [] 権利B｜お酒を飲む
- [xxx] 権利E｜朝食 or 昼食を食べる｜1日1食であればノーチェック
```

**特徴:**
- チェックボックス形式
- 回数は`[x]`の数で表現（例: `[xxx]` = 3回）
- 権利名（A/B/C/D/E/F/O/U/X）

#### 5. AI判定結果

**形式:**
```markdown
#### AI判定 ==============

- この日に完了したToDoタスク
**ToDo完了**: ⚠️ 期限超過｜通常｜睡眠時無呼吸の検査キット実施｜予定: +1ポイント / +2 EXP（身体: +0 / 頭脳: +1 / 精神: +1）

- ~~コンディション・スコア（AI自動採点｜5段階評価）~~ **⚠️ 廃止機能（MD版で廃止のため、Web版でも廃止。260116）**
  - ~~体調: 3~~
  - ~~気分: 4~~

- ポイント
  - 本日追加したポイント: +28pt
  - 本日消費したポイント: -5pt
  - 本日の総合加減算ポイント: +23pt
  - 今日現在の累積ポイント: 42pt

- 本日獲得したEXP
  - 身体: +5
  - 頭脳: +3
  - 精神: +2

- アドバイス
 辰彦よ、今日は習慣の多くを守り...

- あらすじ
  - これまでの冒険: ...
  - これからの冒険: ...
```

**特徴:**
- 構造化されたMarkdown形式
- ~~スコアは数値（例: `体調: 3`）~~ **⚠️ 廃止機能（MD版で廃止のため、Web版でも廃止。260116）**
- テキスト形式（アドバイス、あらすじ）

---

## Web版のデータ構造

### データベーステーブル構成

1. **profiles**（ユーザープロファイル）
2. **daily_logs**（日誌）
3. **habits**（習慣マスタ）
4. **habit_logs**（習慣記録）
5. **todos**（ToDoマスタ）
6. **todo_logs**（ToDo記録）

### データ構造（Web版）

#### 1. 習慣

**habitsテーブル:**
```typescript
{
  id: string;
  user_id: string;
  habit_name: string;        // "GOLリストを記述｜ログインボーナス"
  habit_type: 'good' | 'bad' | 'bonus';
  points: number;            // 1
  exp_body: number;          // 0
  exp_mind: number;          // 1
  exp_spirit: number;        // 1
  input_type: 'checkbox' | 'number';
  display_order: number;
  // ...
}
```

**habit_logsテーブル:**
```typescript
{
  id: string;
  daily_log_id: string;
  habit_id: string;
  is_checked: boolean;       // true = [x], false = []
  count: number;             // 数値入力の場合（例: 10回）
  // ...
}
```

#### 2. ToDoタスク

**todosテーブル:**
```typescript
{
  id: string;
  user_id: string;
  task_name: string;         // "トラSSでのプチツーリング計画"
  is_special: boolean;       // true = SPタスク
  sp_points: number;         // 2
  sp_exp_body: number;       // 0
  sp_exp_mind: number;       // 1
  sp_exp_spirit: number;     // 1
  status: 'active' | 'in_progress' | 'completed';
  due_date: string | null;   // "2025-11-20"
  completed_at: string | null;
  display_order: number;
  // ...
}
```

**todo_logsテーブル:**
```typescript
{
  id: string;
  daily_log_id: string;
  todo_id: string;
  points_earned: number;
  exp_body_earned: number;   // 完了時の実際のEXP配分
  exp_mind_earned: number;
  exp_spirit_earned: number;
  // ...
}
```

**⚠️ 現在未実装: todo_subtasksテーブル**
- Phase 3で実装予定
- サブタスクを保存するためのテーブルが必要

#### 3. 日誌

**daily_logsテーブル:**
```typescript
{
  id: string;
  user_id: string;
  log_date: string;          // "2025-11-28"
  journal_text: string;      // "0700｜起床\n冷水シャワー..."
  one_line_comment: string;  // "早起きはできた。..."
  base_consumption: number;  // -5
  right_a_count: number;     // 0
  right_b_count: number;     // 0
  // ... (right_c_count ~ right_x_count)
  // ⚠️ 廃止機能（MD版で廃止のため、Web版でも廃止。260116）
  // ai_condition_body: number; // 3
  // ai_condition_mood: number; // 4
  ai_points_earned: number;  // 28
  ai_points_consumed: number;// 5
  ai_points_total: number;   // 23
  ai_exp_body: number;       // 5
  ai_exp_mind: number;       // 3
  ai_exp_spirit: number;     // 2
  ai_advice: string;
  ai_story_past: string;
  ai_story_future: string;
  // ...
}
```

---

## 同期可能性分析

### ✅ 同期可能なデータ

#### 1. 日誌本文・一言感想

**MD → Web:**
- `##### 今日の日誌 ==============` → `daily_logs.journal_text`
- `##### 一言感想 ==============` → `daily_logs.one_line_comment`
- **変換:** Markdownテキストをそのままコピー（改行コード変換のみ）

**Web → MD:**
- `daily_logs.journal_text` → `##### 今日の日誌 ==============`
- `daily_logs.one_line_comment` → `##### 一言感想 ==============`
- **変換:** データベースのテキストをそのまま出力

#### 2. 権利（ポイント利用）

**MD → Web:**
- `[x]` = 1回、`[xx]` = 2回、`[xxx]` = 3回 → `right_a_count = 3`
- **変換:** チェックボックスの`x`の数をカウント

**Web → MD:**
- `right_a_count = 3` → `[xxx] 権利A｜TVゲーム`
- **変換:** 数値を`x`の数に変換

#### 3. AI判定結果

**⚠️ 廃止機能:** 体調・気分スコア（MD版で廃止のため、Web版でも廃止。260116）

**MD → Web:**
- ~~`体調: 3` → `ai_condition_body = 3`~~（廃止）
- ~~`気分: 4` → `ai_condition_mood = 4`~~（廃止）
- `本日追加したポイント: +28pt` → `ai_points_earned = 28`
- アドバイス・あらすじ → `ai_advice`, `ai_story_past`, `ai_story_future`
- **変換:** Markdownから数値・テキストを抽出

**Web → MD:**
- ~~`ai_condition_body = 3` → `体調: 3`~~（廃止）
- `ai_points_earned = 28` → `本日追加したポイント: +28pt`
- **変換:** データベースの値をMarkdown形式で出力

#### 4. ToDoタスク（基本情報）

**MD → Web:**
- `**SP-2pt-2ex**` → `is_special = true`, `sp_points = 2`, `sp_exp_body + sp_exp_mind + sp_exp_spirit = 2`
- `期限:251120-木` → `due_date = "2025-11-20"`
- `完了日:251127-木` → `completed_at = "2025-11-27"`
- `- []` → `status = 'active'`
- `- ✅` → `status = 'completed'`
- **変換:** Markdownパース + 日付変換（`YYMMDD-W` → `YYYY-MM-DD`）

**Web → MD:**
- `is_special = true, sp_points = 2` → `**SP-2pt-2ex**`
- `due_date = "2025-11-20"` → `期限:251120-木`
- `completed_at = "2025-11-27"` → `完了日:251127-木`
- **変換:** データベースの値をMarkdown形式で出力 + 曜日補完

#### 5. 習慣（基本情報）

**MD → Web:**
- `- [x] GOLリストを記述｜ログインボーナス` → `habit_logs.is_checked = true`
- `- [] 起床｜7時までに` → `habit_logs.is_checked = false`
- 習慣名のマッチング（`habits.habit_name`と一致するものを探す）
- **変換:** チェックボックス状態を`is_checked`に変換

**Web → MD:**
- `habit_logs.is_checked = true` → `- [x] GOLリストを記述｜ログインボーナス`
- `habits.habit_name` + `habit_logs.is_checked` → Markdown形式で出力
- **変換:** データベースの値をMarkdown形式で出力

---

### ⚠️ 同期に課題があるデータ

#### 1. ToDoサブタスク（現在未実装）

**現状:**
- MD版: サブタスクが存在（インデントされたチェックリスト）
- Web版: `todo_subtasks`テーブルが未実装

**対応:**
- Phase 3で`todo_subtasks`テーブルを実装予定
- 実装後は同期可能

**同期方法（実装後）:**
```typescript
// MD → Web
- [] どこいくか｜調査｜AI利用  → todo_subtasks { name: "どこいくか｜調査｜AI利用", is_completed: false }

// Web → MD
todo_subtasks { name: "...", is_completed: false }  →  - [] どこいくか｜調査｜AI利用
```

#### 2. 習慣名のマッチング

**課題:**
- MD版: 習慣名は自由記述（例: `GOLリストを記述｜ログインボーナス｜1日に一回のみ`）
- Web版: `habits.habit_name`は登録済みの習慣のみ

**対応:**
- MD版の習慣名とWeb版の`habits.habit_name`を一致させる必要がある
- 完全一致または部分一致でマッチング
- マッチしない場合は新規習慣として登録（オプション）

#### 3. 数値入力習慣の扱い

**課題:**
- MD版: `懸垂｜10回`のように習慣名に数値が含まれる
- Web版: `input_type = 'number'`の場合、`habit_logs.count`に数値を保存

**対応:**
- MD版から数値を抽出（正規表現で「数字+単位」を抽出）
- Web版の`input_type = 'number'`の習慣については`count`を使用

#### 4. EXP配分の同期

**課題:**
- MD版: 完了済みToDoに`身体: +0 / 頭脳: +1 / 精神: +1`形式で記載
- Web版: `todo_logs.exp_body_earned`, `exp_mind_earned`, `exp_spirit_earned`に保存
- ただし、MD版では完了時に記載されるが、Web版では`todo_logs`テーブルに保存

**対応:**
- MD → Web: EXP配分を抽出して`todo_logs`に保存
- Web → MD: `todo_logs`からEXP配分を読み取ってMarkdown形式で出力

#### 5. 習慣の種類（良習慣/悪習慣/ボーナス）

**課題:**
- MD版: 見出しで区別（`- 良習慣実行`、`- 悪習慣回避`、`- 習慣ボーナス`）
- Web版: `habits.habit_type`（'good', 'bad', 'bonus'）

**対応:**
- 見出しの位置で種類を判定
- MD → Web: 見出しの位置を解析して`habit_type`を設定
- Web → MD: `habit_type`に応じて適切な見出しセクションに配置

#### 6. ToDoの期限超過ラベル

**課題:**
- MD版: `⚠️ 期限超過`がタスク名の前に記載される
- Web版: 期限超過は計算で判定可能（`due_date < 今日` && `status !== 'completed'`）

**対応:**
- MD → Web: `⚠️ 期限超過`ラベルを無視（期限は`due_date`から判定）
- Web → MD: 期限超過を計算してラベルを自動追加

#### 7. 日付フォーマット

**課題:**
- MD版: `YYMMDD-W`形式（例: `251120-木`）
- Web版: `YYYY-MM-DD`形式（例: `2025-11-20`）

**対応:**
- MD → Web: `YYMMDD-W` → `YYYY-MM-DD`（年は推測、例: `25` → `2025`）
- Web → MD: `YYYY-MM-DD` → `YYMMDD-W`（曜日は計算）

---

## 同期実装の方針

### Phase 5での実装（設計書通り）

**手動同期ボタン方式:**
- ユーザーが「同期」ボタンをクリック
- MD → Web または Web → MD の一方方向のみ同期
- 競合解決は手動（または「最後に更新した方」優先）

### 実装すべき機能

#### 1. MD → Web 同期

**必要な処理:**
1. Markdownファイルのパース
2. データの抽出（習慣、ToDo、日誌、権利、AI判定）
3. データベースへの保存・更新
4. マッチング処理（習慣名の一致確認など）

**実装場所:**
```
/app/api/sync/md-to-web/route.ts（API Route）
  └─ Markdownパーサー
  └─ データ変換ロジック
  └─ Supabaseへの保存処理
```

#### 2. Web → MD 同期

**必要な処理:**
1. データベースからのデータ取得
2. Markdown形式への変換
3. ファイルへの書き込み

**実装場所:**
```
/app/api/sync/web-to-md/route.ts（API Route）
  └─ データベースから取得
  └─ Markdown生成ロジック
  └─ ファイル書き込み（ローカルファイルシステム or クラウドストレージ）
```

### 技術的な課題

#### 1. ファイルアクセス

**課題:**
- Next.js（Vercel）はサーバーレス環境
- ローカルファイルシステムへの直接アクセスができない

**対応案:**
- **Option A（推奨）:** GitHub API経由でMDファイルを読み書き
  - MDファイルをGitHubリポジトリに保存
  - GitHub APIでファイルを取得・更新
- **Option B:** Supabase Storageを使用
  - MDファイルをSupabase Storageに保存
  - ファイル読み書きAPIを実装
- **Option C:** ローカル開発環境のみ対応
  - 開発環境では直接ファイルアクセス
  - 本番環境では未対応

#### 2. マークダウンパーサー

**必要な処理:**
- チェックボックス形式のパース
- 見出しレベルでの構造解析
- 日付フォーマット変換
- テキスト抽出

**推奨ライブラリ:**
- `remark` + `remark-gfm`（GitHub Flavored Markdown）
- `gray-matter`（フロントマター解析）
- カスタムパーサー（MD版の特殊形式に対応）

#### 3. データ整合性

**課題:**
- MD版とWeb版でデータが不一致になる可能性
- 競合解決が必要

**対応:**
- タイムスタンプベースの競合解決
- 手動確認画面の提供
- 差分表示機能

---

## 結論

### ✅ 同期は可能

**現在のWeb版の実装で問題なく同期できる理由:**

1. **データ構造の対応:**
   - 日誌本文・一言感想: 完全対応
   - 権利（ポイント利用）: 完全対応
   - AI判定結果: 完全対応
   - ToDo基本情報: 完全対応（サブタスクはPhase 3で実装）
   - 習慣基本情報: 対応可能（習慣名マッチングが必要）

2. **未実装機能:**
   - `todo_subtasks`テーブル: Phase 3で実装予定
   - 同期機能自体: Phase 5で実装予定

3. **技術的な実現可能性:**
   - Markdownパース: 可能（ライブラリ使用）
   - データ変換: 可能（変換ロジック実装）
   - ファイルアクセス: 可能（GitHub API or Supabase Storage）

### ⚠️ 実装時に注意すべき点

1. **習慣名のマッチング精度:**
   - MD版の習慣名とWeb版の`habits.habit_name`を一致させる必要がある
   - 完全一致または部分一致でマッチング
   - マッチしない場合は新規習慣として登録（オプション）

2. **日付フォーマット変換:**
   - `YYMMDD-W` ↔ `YYYY-MM-DD`の変換
   - 曜日の計算（日付から曜日を算出）

3. **サブタスク機能:**
   - Phase 3で`todo_subtasks`テーブルを実装してから同期機能を実装

4. **ファイルアクセス方法:**
   - GitHub API経由が推奨（MDファイルをGitHubリポジトリに保存）
   - またはSupabase Storageを使用

### 推奨実装順序

1. **Phase 3:** ToDoサブタスク機能実装（`todo_subtasks`テーブル作成）
2. **Phase 4:** UI/UX改善
3. **Phase 5:** MD版同期機能実装
   - MD → Web 同期
   - Web → MD 同期
   - 手動同期ボタン
   - 競合解決機能

---

**結論: 現在のWeb版の実装で問題なく同期できます。Phase 5で実装予定の同期機能により、MD版とWeb版の相互同期が可能になります。**

