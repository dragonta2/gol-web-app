# MD版↔Web版 同期機能実装ガイド

**作成日:** 2026-01-18
**目的:** マークダウン版とウェブ版の同期機能実装に向けた補助資料

---

## 📁 ディレクトリ構成の違い

**ステータス: 検討中**

### MD版（`gol/md-app/`）

```
md-app/
├── docs/                   # コンセプト、ルール、進捗管理
├── _Initial-reference/     # 設計資料、ルール、参考情報
├── now/
│   └── story/
│       ├── 0-monthly-episode-2601.md    # 月次日誌ファイル（メイン）
│       ├── 1-todo-list-summary.md       # ToDoサマリー
│       ├── 2-quotes-library.md          # 名言ライブラリ
│       ├── past/                        # 過去の月次ファイル
│       └── temp/                        # テンプレート
└── general/               # Git自動コミットスクリプトなど
```

**特徴:**
- 1つのMarkdownファイル（`0-monthly-episode-YYMM.md`）に1ヶ月分の日誌を集約
- 日付は見出し形式（`### YYMMDD-W` または `### YYYY-MM-DD-W`）
- ファイルベースのデータ管理
- 手動でファイルを編集・管理

### Web版（`gol/web-app/`）

```
web-app/
├── docs/                  # 設計資料、ガイド、SQLスクリプト
└── gol-web/
    ├── app/              # Next.js App Router
    │   ├── api/          # API Routes
    │   ├── dashboard/    # ダッシュボード画面
    │   └── settings/     # 設定画面
    ├── components/       # Reactコンポーネント
    ├── lib/              # ユーティリティ、型定義
    └── scripts/          # マイグレーションスクリプトなど
```

**特徴:**
- Supabaseデータベースでデータ管理
- 日付は`YYYY-MM-DD`形式
- RESTful API経由でデータ操作
- Web UIでデータを管理

### 違いのまとめ

| 項目 | MD版 | Web版 |
|------|------|-------|
| データ保存場所 | マークダウンファイル | Supabaseデータベース |
| 日付形式 | `YYMMDD-W` または `YYYY-MM-DD-W` | `YYYY-MM-DD` |
| データ管理方法 | ファイル編集 | Web UI + API |
| ファイル構成 | 1ファイルに1ヶ月分 | データベーステーブルで管理 |
| 同期方法 | - | 今後実装予定 |

### 検討事項

#### 1. ファイルアクセス方法

**現状:**
- MD版: ローカルファイルシステムで直接編集
- Web版: データベース経由でアクセス

**課題:**
同期時にファイルアクセス方法をどうするか

**候補案:**
- **GitHub API経由（推奨）**
  - MDファイルをGitHubリポジトリに保存
  - GitHub APIでファイルを取得・更新
  - 認証・権限管理が容易
- **Supabase Storage経由**
  - MDファイルをSupabase Storageに保存
  - ファイル読み書きAPIを実装
  - データベースと同一プラットフォームで管理可能
- **ローカル開発環境のみ対応**
  - 開発環境では直接ファイルアクセス
  - 本番環境では未対応

**ステータス: 検討中**

#### 2. データ構造の対応

**現状:**
- MD版: Markdown形式で構造化
- Web版: データベーステーブルで構造化

**課題:**
両者のデータ構造をどのように対応付けるか

**現状:**
本ガイドの「🔍 機能的な違いの詳細分析」セクションで詳細を分析済み

**ステータス: 分析完了**

#### 3. 日付フォーマット変換

**現状:**
- MD版: `YYMMDD-W` または `YYYY-MM-DD-W`
- Web版: `YYYY-MM-DD`

**課題:**
同期時に日付フォーマットをどう変換するか

**対応:**
変換関数を実装する必要がある（詳細は「📋 実装時の注意点」セクション参照）

**ステータス: 検討中**

#### 4. ファイル構造の統一

**現状:**
- MD版: `gol/md-app/now/story/` 配下に月次ファイル
- Web版: `gol/web-app/` 配下にNext.jsアプリケーション

**検討事項:**
ファイル構造を少しでも合わせた方がいいか？

**メリット（統一する場合）:**
- 同期機能の実装が簡単になる可能性
- ファイルパスの解決が統一される
- 開発者が理解しやすい
- 共通のスクリプトやツールを配置しやすい

**デメリット（統一する場合）:**
- 既存の構造を変更する必要がある
- 既存のワークフローやスクリプトに影響が出る可能性
- 移行コストが発生する

**現状の分析:**

**統一できる可能性のある箇所:**
- `docs/` ディレクトリ: 両方に存在（設計資料、ガイド）
  - MD版: `md-app/docs/`
  - Web版: `web-app/docs/`
  - → `gol/docs/` に統一することも検討可能

**統一する必要がない箇所:**
- `story/` ディレクトリ: MD版固有（月次ファイル）
- `app/` ディレクトリ: Web版固有（Next.jsアプリケーション）
- `general/` ディレクトリ: MD版固有（Git自動コミットスクリプトなど）

**推奨案:**
1. **現状維持（推奨）**
   - 各版の役割が明確で、統一の必要性が低い
   - 同期機能はAPI/ファイルパスを抽象化すれば対応可能
   - 既存のワークフローに影響を与えない

2. **部分的統一（オプション）**
   - `docs/` のみ `gol/docs/` に統一
   - 共通のドキュメントを1箇所で管理
   - ただし、移行コストを考慮する必要がある

**ステータス: 検討中**

### 次のステップ

- [ ] ファイル構造の統一方針決定（現状維持 / 部分的統一）
- [ ] ファイルアクセス方法の決定（GitHub API / Supabase Storage / ローカルのいずれか）
- [x] データ構造の対応分析（完了）
- [ ] 日付フォーマット変換関数の実装
- [ ] 機能的な違いの詳細分析（進行中）
- [ ] 同期実装の方針決定
- [ ] 実装順序の確定

---

## 🔍 機能的な違いの詳細分析

### 1. 日誌データ

#### MD版
```markdown
### 260118-日

##### 今日の日誌 ==============
0700｜起床
冷水シャワー
Langaku｜鬼滅の刃
...

##### 一言感想 ==============
早起きはできた。
...
```

**特徴:**
- 見出しで日付を区切る（`### YYMMDD-W` または `### YYYY-MM-DD-W`）
- 自由記述テキスト
- 時系列形式（例: `0700｜起床`）

#### Web版
```typescript
daily_logs {
  log_date: "2026-01-18",
  journal_text: "0700｜起床\n冷水シャワー\n...",
  one_line_comment: "早起きはできた。",
  ...
}
```

**対応関係:**
- ✅ 完全対応可能
- MD → Web: Markdownテキストをそのままコピー（改行コード変換のみ）
- Web → MD: データベースのテキストをそのまま出力

---

### 2. 習慣データ

#### MD版
```markdown
##### 習慣 ==============

- 良習慣実行（やった場合にチェック）
  - [x] GOLリストを記述｜ログインボーナス｜1日に一回のみ
  - [x] 起床｜8時までに
  - [] 懸垂｜10回 or ディップス｜10回
  - [] ももあげクランチ｜25回 or L字腹筋｜30秒

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

#### Web版
```typescript
habits {
  habit_name: "GOLリストを記述｜ログインボーナス",
  habit_type: 'good' | 'bad' | 'bonus',
  points: 1,
  input_type: 'checkbox' | 'number',
  ...
}

habit_logs {
  habit_id: "...",
  is_checked: true,
  count: 10,  // 数値入力の場合
  ...
}
```

**対応関係:**
- ⚠️ マッチング処理が必要
- MD → Web: 
  - 習慣名のマッチング（`habits.habit_name`と一致するものを探す）
  - チェックボックス状態 → `is_checked`
  - 数値抽出（正規表現で「数字+単位」を抽出） → `count`
- Web → MD:
  - `habit_type`に応じて適切な見出しセクションに配置
  - `is_checked` → `[x]` または `[]`
  - `count` → 習慣名に数値を含める

**課題:**
- 習慣名の完全一致または部分一致でマッチングが必要
- マッチしない場合は新規習慣として登録（オプション）

---

### 3. ToDoタスクデータ

#### MD版
```markdown
## ToDoリスト --------------

### アクティブタスク
- [] ⚠️ 期限超過｜**SP-4pt-4ex**｜タスク名:健康診断予定立てる
  - 期限:251122-土
  - 完了日:YYMMDD-W
  - [] 資料確認
  - [] 調査｜病院
  - [] 判断・決断
  - [] 病院に行って健康診断を受ける

### 完了済みタスク
- ✅ ⚠️ 期限超過｜通常｜タスク名:書斎の加湿器を買う
  - 身体: +0 / 頭脳: +1 / 精神: +0
  - 期限:260110-土
  - 完了日:260117-土
  - [x] 調査
  - [x] 判断
  - [x] 購入
```

**特徴:**
- チェックボックス形式（`- []` = アクティブ、`- ✅` = 完了済み）
- 期限超過ラベル（`⚠️ 期限超過`）
- SPタスク: `**SP-Xpt-Yex**`形式（X=ポイント、Y=合計EXP）
- サブタスク: インデントされたチェックリスト
- 期限・完了日: `期限:YYMMDD-W`形式
- EXP配分: `身体: +X / 頭脳: +Y / 精神: +Z`形式（完了済みのみ）

#### Web版
```typescript
todos {
  task_name: "健康診断予定立てる",
  is_special: true,
  sp_points: 4,
  sp_exp_body: 0,
  sp_exp_mind: 1,
  sp_exp_spirit: 3,
  status: 'active' | 'in_progress' | 'completed',
  due_date: "2025-11-22",
  completed_at: null,
  ...
}

todo_logs {
  todo_id: "...",
  points_earned: 4,
  exp_body_earned: 0,
  exp_mind_earned: 1,
  exp_spirit_earned: 3,
  ...
}

todo_subtasks {
  todo_id: "...",
  subtask_name: "資料確認",
  is_completed: false,
  ...
}
```

**対応関係:**
- ✅ 基本情報は対応可能
- ⚠️ サブタスクは実装済み（`todo_subtasks`テーブル）
- MD → Web:
  - `**SP-Xpt-Yex**` → `is_special = true`, `sp_points = X`, EXP配分を計算
  - `期限:YYMMDD-W` → `due_date = "YYYY-MM-DD"`（日付変換）
  - `- []` → `status = 'active'`
  - `- ✅` → `status = 'completed'`
  - サブタスク → `todo_subtasks`テーブルに保存
- Web → MD:
  - `is_special = true, sp_points = 4` → `**SP-4pt-Yex**`（EXP合計を計算）
  - `due_date = "2025-11-22"` → `期限:251122-土`（曜日を計算）
  - `status = 'completed'` → `- ✅`
  - 期限超過は計算で判定（`due_date < 今日` && `status !== 'completed'`）

**課題:**
- 日付フォーマット変換（`YYMMDD-W` ↔ `YYYY-MM-DD`）
- 曜日の計算（日付から曜日を算出）
- EXP配分の同期（MD版では完了時に記載、Web版では`todo_logs`に保存）

---

### 4. 権利（ポイント利用）データ

#### MD版
```markdown
##### 本日の利用ポイント ==============

- [] 権利A｜TVゲーム
- [] 権利B｜お酒を飲む
- [xxx] 権利E｜朝食 or 昼食を食べる｜1日1食であればノーチェック
```

**特徴:**
- チェックボックス形式
- 回数は`[x]`の数で表現（例: `[xxx]` = 3回）
- 権利名（A/B/C/D/E/F/O/U/X）

#### Web版
```typescript
daily_logs {
  right_a_count: 0,
  right_b_count: 0,
  right_c_count: 0,
  right_d_count: 0,
  right_e_count: 3,  // [xxx] = 3回
  right_f_count: 0,
  right_o_count: 0,
  right_u_count: 0,
  right_x_count: 0,
  ...
}
```

**対応関係:**
- ✅ 完全対応可能
- MD → Web: チェックボックスの`x`の数をカウント → `right_X_count`
- Web → MD: 数値を`x`の数に変換 → `[xxx] 権利E｜...`

---

### 5. AI判定結果データ

#### MD版
```markdown
#### AI判定 ==============

- この日に完了したToDoタスク
**ToDo完了**: ⚠️ 期限超過｜通常｜睡眠時無呼吸の検査キット実施｜予定: +1ポイント / +2 EXP（身体: +0 / 頭脳: +1 / 精神: +1）

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
- テキスト形式（アドバイス、あらすじ）

#### Web版
```typescript
daily_logs {
  ai_points_earned: 28,
  ai_points_consumed: 5,
  ai_points_total: 23,
  ai_exp_body: 5,
  ai_exp_mind: 3,
  ai_exp_spirit: 2,
  ai_advice: "辰彦よ、今日は習慣の多くを守り...",
  ai_story_past: "...",
  ai_story_future: "...",
  ...
}
```

**対応関係:**
- ✅ 完全対応可能
- MD → Web: Markdownから数値・テキストを抽出 → データベースに保存
- Web → MD: データベースの値をMarkdown形式で出力

---

## 🔄 同期実装の方針

### 実装アプローチ

**手動同期ボタン方式（推奨）:**
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

**技術的な課題:**
- **ファイルアクセス:** Next.js（Vercel）はサーバーレス環境のため、ローカルファイルシステムへの直接アクセスができない
  - **推奨案:** GitHub API経由でMDファイルを読み書き
  - **代替案:** Supabase Storageを使用
  - **開発環境のみ:** ローカル開発環境では直接ファイルアクセス

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
  └─ ファイル書き込み（GitHub API or Supabase Storage）
```

---

## 📋 実装時の注意点

### 1. 日付フォーマット変換

**課題:**
- MD版: `YYMMDD-W`形式（例: `251120-木`）
- Web版: `YYYY-MM-DD`形式（例: `2025-11-20`）

**対応:**
- MD → Web: `YYMMDD-W` → `YYYY-MM-DD`（年は推測、例: `25` → `2025`）
- Web → MD: `YYYY-MM-DD` → `YYMMDD-W`（曜日は計算）

**実装例:**
```typescript
// YYMMDD-W → YYYY-MM-DD
function convertDateMDToWeb(dateStr: string): string {
  // "251120-木" → "2025-11-20"
  const match = dateStr.match(/^(\d{2})(\d{2})(\d{2})-(.)$/);
  if (match) {
    const [, yy, mm, dd] = match;
    const year = parseInt(yy) < 50 ? `20${yy}` : `19${yy}`;
    return `${year}-${mm}-${dd}`;
  }
  // YYYY-MM-DD-W形式も対応
  const match2 = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})-(.)$/);
  if (match2) {
    const [, yyyy, mm, dd] = match2;
    return `${yyyy}-${mm}-${dd}`;
  }
  throw new Error(`Invalid date format: ${dateStr}`);
}

// YYYY-MM-DD → YYMMDD-W
function convertDateWebToMD(dateStr: string): string {
  // "2025-11-20" → "251120-木"
  const date = new Date(dateStr);
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const w = weekdays[date.getDay()];
  return `${yy}${mm}${dd}-${w}`;
}
```

### 2. 習慣名のマッチング

**課題:**
- MD版の習慣名とWeb版の`habits.habit_name`を一致させる必要がある
- MD版の習慣名は「｜」で区切られた情報が含まれる（例: "GOLリストを記述｜ログインボーナス｜1日に一回のみ"）
- 複数選択肢がある場合（例: "懸垂｜10回 or ディップス｜10回"）
- 特殊文字が含まれる場合（例: "起床後 or 起床 → 運動後すぐの冷水シャワー"）

**実装例（詳細版）:**
```typescript
/**
 * MD版の習慣名をWeb版の習慣とマッチングする
 * 
 * マッチング優先順位:
 * 1. 完全一致
 * 2. 「｜」の前の部分（基本名）での一致
 * 3. 正規化後の基本名での一致（空白・特殊文字を除去）
 * 4. 部分一致（基本名が含まれる）
 * 5. マッチしない場合はnullを返す（新規習慣として登録するかは呼び出し側で判断）
 */
function matchHabitName(mdHabitName: string, webHabits: Habit[]): Habit | null {
  // 1. 完全一致を優先
  const exactMatch = webHabits.find(h => h.habit_name === mdHabitName);
  if (exactMatch) return exactMatch;
  
  // 2. 「｜」の前の部分（基本名）でマッチング
  const mdBaseName = mdHabitName.split('｜')[0].trim();
  const baseNameMatch = webHabits.find(h => {
    const webBaseName = h.habit_name.split('｜')[0].trim();
    return webBaseName === mdBaseName;
  });
  if (baseNameMatch) return baseNameMatch;
  
  // 3. 正規化後の基本名でマッチング（空白・特殊文字を除去）
  const normalizeName = (name: string): string => {
    return name
      .replace(/\s+/g, '') // 空白を除去
      .replace(/[→←]/g, '') // 矢印を除去
      .replace(/or/g, '') // "or"を除去
      .toLowerCase();
  };
  
  const normalizedMdName = normalizeName(mdBaseName);
  const normalizedMatch = webHabits.find(h => {
    const webBaseName = h.habit_name.split('｜')[0].trim();
    return normalizeName(webBaseName) === normalizedMdName;
  });
  if (normalizedMatch) return normalizedMatch;
  
  // 4. 部分一致（基本名が含まれる）
  const partialMatch = webHabits.find(h => {
    const webBaseName = h.habit_name.split('｜')[0].trim();
    return mdBaseName.includes(webBaseName) || webBaseName.includes(mdBaseName);
  });
  if (partialMatch) return partialMatch;
  
  // 5. マッチしない場合はnullを返す
  return null;
}

/**
 * 複数選択肢がある習慣名から、実際に選択された習慣を特定する
 * 
 * 例: "懸垂｜10回 or ディップス｜10回" → "懸垂｜10回" または "ディップス｜10回"
 * 
 * 実装方針:
 * - チェックボックスの状態から、どの選択肢が選ばれたかを判定
 * - または、ユーザーに確認を求める
 */
function parseMultipleChoiceHabit(mdHabitName: string): string[] {
  // "or"で分割して選択肢を抽出
  const choices = mdHabitName.split(' or ').map(c => c.trim());
  return choices;
}
```

**マッチング戦略の推奨:**
1. **完全一致を最優先** - 最も確実
2. **基本名（「｜」の前）での一致** - 追加情報の違いを無視
3. **正規化後の一致** - 空白や特殊文字の違いを吸収
4. **部分一致** - 最後の手段、誤マッチの可能性あり

**マッチしない場合の対応:**
- **オプション1:** 新規習慣として登録（ユーザーに確認）
- **オプション2:** スキップして警告を表示
- **オプション3:** ユーザーに手動でマッチングを要求

### 3. 数値入力習慣の扱い

**課題:**
- MD版: `懸垂｜10回`のように習慣名に数値が含まれる
- Web版: `input_type = 'number'`の場合、`habit_logs.count`に数値を保存
- 複数選択肢がある場合（例: "懸垂｜10回 or ディップス｜10回"）
- 範囲指定がある場合（例: "ラン｜1kmごとにチェックひとつ｜最大10まで"）

**実装例（詳細版）:**
```typescript
/**
 * 習慣名から数値を抽出する
 * 
 * 対応パターン:
 * - "懸垂｜10回" → 10
 * - "ももあげクランチ｜25回" → 25
 * - "L字腹筋｜30秒" → 30
 * - "ラン｜1kmごとにチェックひとつ｜最大10まで" → 1（最初の数値）
 * - "ジムに行った｜1回3チェック" → 3（最後の数値、チェック数）
 */
function extractCountFromHabitName(habitName: string): {
  count: number | null;
  unit: string | null;
  extractedFrom: string | null; // どの部分から抽出したか
} {
  // パターン1: 「数字+単位」の形式（例: "10回", "30秒", "1km"）
  const unitPattern = /(\d+)(回|秒|分|時間|km|kg|m|cm|mm)/g;
  const unitMatches = Array.from(habitName.matchAll(unitPattern));
  
  if (unitMatches.length > 0) {
    // 最後のマッチを優先（"1回3チェック"の場合、3を取得）
    const lastMatch = unitMatches[unitMatches.length - 1];
    return {
      count: parseInt(lastMatch[1]),
      unit: lastMatch[2],
      extractedFrom: lastMatch[0],
    };
  }
  
  // パターン2: 「最大Nまで」の形式（例: "最大10まで"）
  const maxPattern = /最大(\d+)まで/;
  const maxMatch = habitName.match(maxPattern);
  if (maxMatch) {
    return {
      count: parseInt(maxMatch[1]),
      unit: null,
      extractedFrom: maxMatch[0],
    };
  }
  
  // パターン3: 「Nごとに」の形式（例: "1kmごとに"）
  const perPattern = /(\d+)(\w+)ごとに/;
  const perMatch = habitName.match(perPattern);
  if (perMatch) {
    return {
      count: parseInt(perMatch[1]),
      unit: perMatch[2],
      extractedFrom: perMatch[0],
    };
  }
  
  return {
    count: null,
    unit: null,
    extractedFrom: null,
  };
}

/**
 * 複数選択肢がある習慣から、選択された習慣の数値を抽出する
 * 
 * 例: "懸垂｜10回 or ディップス｜10回" → どちらが選ばれたかによって数値を決定
 * 
 * 実装方針:
 * - チェックボックスの状態から、どの選択肢が選ばれたかを判定
 * - 選択肢ごとに数値を抽出
 */
function extractCountFromMultipleChoice(
  mdHabitName: string,
  isChecked: boolean
): number | null {
  if (!isChecked) return null;
  
  const choices = parseMultipleChoiceHabit(mdHabitName);
  // 最初の選択肢の数値を返す（実際にはチェックボックスの状態から判定する必要がある）
  if (choices.length > 0) {
    const result = extractCountFromHabitName(choices[0]);
    return result.count;
  }
  
  return null;
}
```

**数値抽出の優先順位:**
1. **「数字+単位」の形式** - 最も一般的（例: "10回", "30秒"）
2. **「最大Nまで」の形式** - 範囲指定の場合
3. **「Nごとに」の形式** - 単位あたりの数値

**注意点:**
- 複数選択肢がある場合は、実際に選択された選択肢の数値を抽出する必要がある
- チェックボックスの状態から判定できない場合は、ユーザーに確認を求める

### 4. EXP配分の同期

**課題:**
- MD版: 完了済みToDoに`身体: +0 / 頭脳: +1 / 精神: +1`形式で記載
- MD版: AI判定結果に`身体: +4｜現在の累積 481`形式で記載（累積値も含む）
- Web版: `todo_logs.exp_body_earned`, `exp_mind_earned`, `exp_spirit_earned`に保存
- Web版: `daily_logs.ai_exp_body`, `ai_exp_mind`, `ai_exp_spirit`に保存

**実装例（詳細版）:**
```typescript
/**
 * ToDo完了時のEXP配分を抽出する
 * 
 * 対応パターン:
 * - "身体: +0 / 頭脳: +1 / 精神: +1" → { body: 0, mind: 1, spirit: 1 }
 * - "身体: 0 / 頭脳: 1 / 精神: 1" → { body: 0, mind: 1, spirit: 1 }（+記号なし）
 */
function parseTodoExpDistribution(expStr: string): {
  body: number;
  mind: number;
  spirit: number;
} {
  // パターン1: "身体: +0 / 頭脳: +1 / 精神: +1"
  const match1 = expStr.match(/身体:\s*\+?(\d+)\s*\/\s*頭脳:\s*\+?(\d+)\s*\/\s*精神:\s*\+?(\d+)/);
  if (match1) {
    return {
      body: parseInt(match1[1]),
      mind: parseInt(match1[2]),
      spirit: parseInt(match1[3]),
    };
  }
  
  // パターン2: "身体: 0 / 頭脳: 1 / 精神: 1"（+記号なし）
  const match2 = expStr.match(/身体:\s*(\d+)\s*\/\s*頭脳:\s*(\d+)\s*\/\s*精神:\s*(\d+)/);
  if (match2) {
    return {
      body: parseInt(match2[1]),
      mind: parseInt(match2[2]),
      spirit: parseInt(match2[3]),
    };
  }
  
  // デフォルト値
  return { body: 0, mind: 0, spirit: 0 };
}

/**
 * AI判定結果のEXP配分を抽出する
 * 
 * 対応パターン:
 * - "身体: +4｜現在の累積 481" → { earned: 4, total: 481 }
 * - "頭脳: +3｜現在の累積 291" → { earned: 3, total: 291 }
 * 
 * 注意: 累積値は同期時に使用しない（Web版ではprofilesテーブルで管理）
 */
function parseAiExpDistribution(expStr: string): {
  body: { earned: number; total: number | null };
  mind: { earned: number; total: number | null };
  spirit: { earned: number; total: number | null };
} {
  const result = {
    body: { earned: 0, total: null as number | null },
    mind: { earned: 0, total: null as number | null },
    spirit: { earned: 0, total: null as number | null },
  };
  
  // 身体EXPの抽出
  const bodyMatch = expStr.match(/身体:\s*\+?(\d+)(?:｜現在の累積\s*(\d+))?/);
  if (bodyMatch) {
    result.body.earned = parseInt(bodyMatch[1]);
    if (bodyMatch[2]) {
      result.body.total = parseInt(bodyMatch[2]);
    }
  }
  
  // 頭脳EXPの抽出
  const mindMatch = expStr.match(/頭脳:\s*\+?(\d+)(?:｜現在の累積\s*(\d+))?/);
  if (mindMatch) {
    result.mind.earned = parseInt(mindMatch[1]);
    if (mindMatch[2]) {
      result.mind.total = parseInt(mindMatch[2]);
    }
  }
  
  // 精神EXPの抽出
  const spiritMatch = expStr.match(/精神:\s*\+?(\d+)(?:｜現在の累積\s*(\d+))?/);
  if (spiritMatch) {
    result.spirit.earned = parseInt(spiritMatch[1]);
    if (spiritMatch[2]) {
      result.spirit.total = parseInt(spiritMatch[2]);
    }
  }
  
  return result;
}

/**
 * Web版からMD版へのEXP配分の出力
 * 
 * ToDo完了時: "身体: +0 / 頭脳: +1 / 精神: +1"
 * AI判定結果: "身体: +4｜現在の累積 481"
 */
function formatExpDistributionForMD(
  body: number,
  mind: number,
  spirit: number,
  type: 'todo' | 'ai' = 'todo',
  totals?: { body: number; mind: number; spirit: number }
): string {
  if (type === 'todo') {
    return `身体: +${body} / 頭脳: +${mind} / 精神: +${spirit}`;
  } else {
    // AI判定結果の場合
    const bodyStr = totals
      ? `身体: +${body}｜現在の累積 ${totals.body}`
      : `身体: +${body}`;
    const mindStr = totals
      ? `頭脳: +${mind}｜現在の累積 ${totals.mind}`
      : `頭脳: +${mind}`;
    const spiritStr = totals
      ? `精神: +${spirit}｜現在の累積 ${totals.spirit}`
      : `精神: +${spirit}`;
    return `${bodyStr}\n\n  ${mindStr}\n\n  ${spiritStr}`;
  }
}
```

**EXP配分の同期方針:**
1. **ToDo完了時のEXP配分** - `todo_logs`テーブルに保存
2. **AI判定結果のEXP配分** - `daily_logs`テーブルに保存
3. **累積値の扱い** - MD版には累積値が記載されるが、Web版では`profiles`テーブルで管理するため、同期時には累積値は使用しない

**注意点:**
- MD版の累積値は参考情報としてのみ使用
- 実際の累積値はWeb版の`profiles`テーブルから取得
- Web → MD同期時は、`profiles`テーブルから累積値を取得して出力

### 5. マークダウンパーサー

**必要な処理:**
- チェックボックス形式のパース
- 見出しレベルでの構造解析
- 日付フォーマット変換
- テキスト抽出

**推奨ライブラリ:**
- `remark` + `remark-gfm`（GitHub Flavored Markdown）
- `gray-matter`（フロントマター解析）
- カスタムパーサー（MD版の特殊形式に対応）

---

## 🚀 実装順序（推奨）

### Phase 1: 基盤整備
1. マークダウンパーサーの実装
2. 日付フォーマット変換関数の実装
3. データ変換ロジックの実装

### Phase 2: MD → Web 同期
1. 日誌データの同期（`journal_text`, `one_line_comment`）
2. 権利データの同期（`right_X_count`）
3. AI判定結果の同期（`ai_points_earned`, `ai_advice`など）
4. ToDoタスクの同期（基本情報）
5. 習慣データの同期（マッチング処理含む）

### Phase 3: Web → MD 同期
1. データベースからのデータ取得
2. Markdown形式への変換
3. ファイルへの書き込み（GitHub API or Supabase Storage）

### Phase 4: UI実装
1. 同期ボタンの追加（`/settings/sync`画面）
2. 同期方向の選択（MD → Web / Web → MD）
3. 競合解決画面
4. 同期結果の表示

---

## 📝 データ整合性の考慮

### 競合解決

**課題:**
- MD版とWeb版でデータが不一致になる可能性
- 競合解決が必要

**対応:**
- タイムスタンプベースの競合解決
- 手動確認画面の提供
- 差分表示機能

### データ検証

**実装すべき検証:**
- 日付の妥当性チェック
- 数値の範囲チェック（ポイント、EXPなど）
- 必須フィールドの存在確認
- 外部キー制約の確認（習慣ID、ToDoIDなど）

---

## 🔗 関連ファイル

- `/web-app/docs/08-md-sync-analysis.md` - 既存の同期可能性分析
- `/web-app/docs/MARKDOWN_MIGRATION_GUIDE.md` - マークダウン移行ガイド
- `/web-app/gol-web/scripts/migrate-md-to-web.ts` - 既存の移行スクリプト（参考）

---

## ✅ 結論

### 同期は可能

**現在のWeb版の実装で問題なく同期できる理由:**

1. **データ構造の対応:**
   - 日誌本文・一言感想: ✅ 完全対応
   - 権利（ポイント利用）: ✅ 完全対応
   - AI判定結果: ✅ 完全対応
   - ToDo基本情報: ✅ 完全対応（サブタスクも実装済み）
   - 習慣基本情報: ⚠️ 対応可能（習慣名マッチングが必要）

2. **技術的な実現可能性:**
   - Markdownパース: ✅ 可能（ライブラリ使用）
   - データ変換: ✅ 可能（変換ロジック実装）
   - ファイルアクセス: ✅ 可能（GitHub API or Supabase Storage）

### 実装時の優先順位

1. **最優先:** 日誌データの同期（`journal_text`, `one_line_comment`）
2. **高優先:** 権利データの同期（`right_X_count`）
3. **中優先:** ToDoタスクの同期（基本情報 + サブタスク）
4. **低優先:** 習慣データの同期（マッチング処理が複雑）

---

**このガイドは、マークダウン版とウェブ版の同期機能実装を支援するための補助資料です。実装時は、このガイドを参考にしながら、段階的に機能を追加していくことを推奨します。**
