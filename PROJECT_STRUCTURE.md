# GOL Web版｜プロジェクト構造

**最終更新:** 2024-11-13

このファイルは、GOL Web版プロジェクトのディレクトリ構造と各ファイルの役割を記載したものです。

**このファイルの更新方法:**

```bash
cd /Users/ta2/Develop/dta2/gol/web-app
tree -L 3 -I 'node_modules|.next|.git' --dirsfirst

```

---

## 📁 ディレクトリツリー

```
web-app/
├── docs/                           # ドキュメントディレクトリ
│   ├── z-project-draft.md
│   ├── 1-spec-sheet.md
│   ├── appendix/wireframe.md
│   ├── 3-project-progress.md
│   ├── 4-dev-log.md
│   ├── 5-dta2-memo.md
│   ├── 06-database-schema.md
│   ├── _INDEX.md
│   └── supabase-setup.sql
└── gol-web/                        # Next.jsプロジェクトディレクトリ
    ├── app/                        # App Routerディレクトリ（Next.js 16）
    │   ├── dashboard/              # ダッシュボード画面
    │   ├── login/                  # ログイン画面
    │   ├── signup/                 # サインアップ画面
    │   ├── test-supabase/          # Supabase接続テストページ
    │   ├── favicon.ico             # ファビコン
    │   ├── globals.css             # グローバルスタイル（Tailwind CSS）
    │   ├── layout.tsx              # ルートレイアウト（全ページ共通）
    │   └── page.tsx                # トップページ（/loginへリダイレクト）
    ├── lib/                        # ユーティリティ・ライブラリ
    │   └── supabase/               # Supabaseクライアント
    ├── public/                     # 静的ファイル
    │   ├── file.svg
    │   ├── globe.svg
    │   ├── next.svg
    │   ├── vercel.svg
    │   └── window.svg
    ├── README.md                   # プロジェクトREADME
    ├── eslint.config.mjs           # ESLint設定
    ├── next-env.d.ts               # Next.js型定義
    ├── next.config.ts              # Next.js設定
    ├── package-lock.json           # npm依存関係ロックファイル
    ├── package.json                # npm依存関係定義
    ├── postcss.config.mjs          # PostCSS設定（Tailwind用）
    └── tsconfig.json               # TypeScript設定
```

---

## 📝 ファイル・ディレクトリ詳細

### docs/ - ドキュメントディレクトリ

プロジェクトのドキュメント類を格納。

#### z-project-draft.md
**役割:** AIへの指示や設計の草案（下書き・思考整理・アイデアメモ）

**編集権限:** ユーザーのみ（AI編集禁止）

#### 1-spec-sheet.md
**役割:** 決定稿の実装ルール（確定した設計・仕様・ルール）

#### appendix/wireframe.md
**役割:** 画面レイアウトのワイヤーフレーム（UI設計図）

#### 3-project-progress.md
**役割:** 日々のGOL-Web版の進捗報告（整理されたもの）

**内容:** 実施内容、決定事項、成果物リスト、学んだこと、次回予定

#### 4-dev-log.md
**役割:** 作業ログ（雑多でOK、コマンド、使用した流れ、学習メモ）

**内容:** 使用したコマンド、コードの詳細、実装手順、エラーと解決方法、学習メモ

#### 5-dta2-memo.md
**役割:** AI時代のエンジニア、クリエイターとしての考え方、心がけ、良いやり方

#### 06-database-schema.md
**役割:** Supabaseデータベース設計書

**内容:** 6テーブル定義（profiles/daily_logs/habits/habit_logs/todos/todo_logs）、RLS設定、初期データ挿入関数

#### _INDEX.md
**役割:** ドキュメント目次

#### supabase-setup.sql
**役割:** Supabase実行用SQLファイル

**内容:** 全テーブル作成、RLS設定、初期データ挿入関数を一括実行

---

### gol-web/ - Next.jsプロジェクトディレクトリ

Next.js 16 + React 19 + TypeScript + Tailwind v4で構築されたWebアプリケーション。

#### app/ - App Routerディレクトリ

Next.js 16のApp Routerを使用したルーティング。

##### app/dashboard/ - ダッシュボード画面

**役割:** メイン画面（習慣チェック、ToDo管理、日誌入力）

**ファイル:** page.tsx, dashboard-tabs.tsx, habit-list.tsx, journal-form.tsx, kanban-board.tsx, logout-button.tsx

##### app/login/ - ログイン画面

**役割:** Email/Password、OAuth認証

##### app/signup/ - サインアップ画面

**役割:** ユーザー登録

##### app/test-supabase/ - Supabase接続テストページ

**役割:** Supabase接続確認用

##### app/favicon.ico
**役割:** ファビコン（ブラウザタブのアイコン）

##### app/globals.css
**役割:** グローバルスタイル（Tailwind CSS初期化）

##### app/layout.tsx
**役割:** ルートレイアウト（全ページ共通、HTML構造・フォント・メタデータ）

##### app/page.tsx
**役割:** トップページ（`/login`へリダイレクト）

#### lib/ - ユーティリティ・ライブラリディレクトリ

##### lib/supabase/ - Supabaseクライアント

**役割:** Supabase認証・データベースアクセス

**ファイル:** client.ts（Client Component用）, server.ts（Server Component用）

#### public/ - 静的ファイルディレクトリ

Next.jsのデフォルト静的ファイル（SVGアイコン類）

#### README.md
**役割:** プロジェクトREADME

#### eslint.config.mjs
**役割:** ESLint設定（コードスタイルチェック）

#### next-env.d.ts
**役割:** Next.js型定義（自動生成、手動編集禁止）

#### next.config.ts
**役割:** Next.js設定（ビルド、環境変数、リダイレクト）

#### package.json
**役割:** npm依存関係定義

**主要パッケージ:** Next.js 16、React 19、TypeScript 5、Tailwind v4、Supabase

#### package-lock.json
**役割:** npm依存関係ロック（自動生成、手動編集禁止）

#### postcss.config.mjs
**役割:** PostCSS設定（Tailwind CSS用）

#### tsconfig.json
**役割:** TypeScript設定（コンパイルオプション、パスエイリアス）

---

**最終生成日:** 2024-11-13

