# 設定管理機能の実装計画（ハイブリッドアプローチ）

## 概要

ユーザーが設定できる項目をウェブの設定画面で管理し、マークダウン版との同期機能を提供する。

## 実装フェーズ

### Phase 1: 設定画面の拡張 ✅（APIは既に実装済み）

#### 1.1 設定画面のルーティング構造
```
/settings
  ├── /settings/habits    - 習慣管理
  ├── /settings/todos     - ToDo管理
  ├── /settings/rights    - 権利設定管理
  └── /settings/sync      - マークダウン同期
```

#### 1.2 習慣管理画面 (`/settings/habits`)
- **機能**:
  - 習慣一覧の表示（良習慣/悪習慣/ボーナスで分類）
  - 習慣の追加（フォーム）
  - 習慣の編集（モーダルまたはインライン編集）
  - 習慣の削除（カスタム習慣のみ）
  - 表示順序の変更（ドラッグ&ドロップ）
- **API**: `/api/habits` (POST, PUT, DELETE) ✅ 既に実装済み

#### 1.3 ToDo管理画面 (`/settings/todos`)
- **機能**:
  - ToDo一覧の表示
  - ToDoの追加（フォーム）
  - ToDoの編集（モーダルまたはインライン編集）
  - ToDoの削除
  - SP設定の変更
  - 表示順序の変更（ドラッグ&ドロップ）
- **API**: `/api/todos` (POST, PUT, DELETE) ✅ 既に実装済み

#### 1.4 権利設定管理画面 (`/settings/rights`)
- **機能**:
  - 権利一覧の表示（A, B, C, D, E, F, O, U, X）
  - 各権利のポイント消費量の変更
  - 権利の有効/無効の切り替え（将来の拡張）
- **API**: `/api/settings/rights` (GET, PUT) - **新規作成が必要**

### Phase 2: マークダウン同期機能

#### 2.1 マークダウンエクスポート機能 (`/settings/sync`)
- **機能**:
  - 現在の設定（習慣、ToDo、権利設定）をマークダウン形式でエクスポート
  - ダウンロードボタンでファイルをダウンロード
- **出力形式**:
  ```markdown
  ## 基準項目 --------------
  
  ### 習慣
  
  - 良習慣
    - 習慣名1: +1pt, 身体+1, 頭脳+0, 精神+0
    - 習慣名2: +2pt, 身体+0, 頭脳+1, 精神+1
  
  - 悪習慣
    - 習慣名3: -1pt
  
  ### ポイント消費関連
  
  - 権利A: TVゲーム 2時間｜-5pt
  - 権利B: お酒を飲む 4杯まで｜-4pt
  ...
  ```

#### 2.2 マークダウンインポート機能 (`/settings/sync`)
- **機能**:
  - マークダウンファイルをアップロード
  - 設定をパースしてデータベースに反映
  - 競合解決（既存設定とのマージまたは上書き）
- **入力形式**: マークダウンファイルの「基準項目」セクション

## 実装の優先順位

### 優先度: 高
1. ✅ 習慣管理画面の実装
2. ✅ ToDo管理画面の実装
3. 権利設定管理画面の実装
4. 権利設定APIの作成

### 優先度: 中
5. マークダウンエクスポート機能
6. マークダウンインポート機能

## 技術的な考慮事項

### 権利設定の保存方法
- **オプション1**: `profiles`テーブルにJSONカラムを追加
  ```sql
  ALTER TABLE profiles ADD COLUMN rights_config JSONB DEFAULT '{}';
  ```
- **オプション2**: 新しい`rights_config`テーブルを作成
  ```sql
  CREATE TABLE rights_config (
    user_id UUID PRIMARY KEY REFERENCES profiles(id),
    right_a_points INTEGER DEFAULT 5,
    right_b_points INTEGER DEFAULT 4,
    ...
  );
  ```
- **推奨**: オプション1（シンプルで拡張しやすい）

### マークダウン同期の競合解決
- **戦略1**: 上書き（マークダウンファイルの設定で完全に置き換え）
- **戦略2**: マージ（既存設定とマークダウンファイルの設定を統合）
- **推奨**: 戦略1（シンプルで予測可能）

## 既存の実装状況

### ✅ 実装済み
- `/api/habits` (POST, PUT, DELETE)
- `/api/todos` (POST, PUT, DELETE)
- `/app/settings/page.tsx` (データ削除機能のみ)

### 🔨 実装が必要
- `/app/settings/habits/page.tsx`
- `/app/settings/todos/page.tsx`
- `/app/settings/rights/page.tsx`
- `/app/settings/sync/page.tsx`
- `/api/settings/rights/route.ts`
- `/api/settings/export-md/route.ts`
- `/api/settings/import-md/route.ts`

## 次のステップ

1. 設定画面のナビゲーション構造を作成
2. 習慣管理画面の実装
3. ToDo管理画面の実装
4. 権利設定管理画面の実装
5. マークダウン同期機能の実装
