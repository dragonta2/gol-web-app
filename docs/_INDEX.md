# GOL Web版｜ドキュメント目次

このフォルダには、GOL Web版開発に関するドキュメントが格納されています。

**最終更新: 260323-Mon**

---

## ルートファイル --------------

### README.md（リポジトリルート）
**通称:** README
**役割:** プロジェクト概要・セットアップ手順・CI/デプロイ構成など、技術インフラの情報。初めてリポジトリを触る人向け

## docs/ ドキュメント一覧 --------------

### 0-AI-prompt-memo.md
**通称:** AIプロンプトメモ、0、0番
**役割:** AIへのプロンプト指示をメモした雑多なファイル

### 1-spec-sheet.md
**通称:** 仕様書、設計書、運用ルール、ルール、ルールブック、1、1番
**役割:** 決定稿の実装ルール（確定した設計・仕様・ルール）。GOL としてのゲームルール・スコア設計・データモデル・プロジェクト固有の決め事を記載
**README との棲み分け:** CI/デプロイ構成などインフラ情報は README に書き、1番には「ルール」の要点1行だけ書いて README に誘導する

### 2-support-of-progress.md
**通称:** 進捗支援、2、2番
**役割:** 一時的な進捗管理・支援、方針決定のサポート用に利用するドキュメント

### 3-project-progress.md
**通称:** 進捗表、簡潔記録、3、3番
**役割:** 日々のGOL-Web版の進捗報告（整理されたもの）。「何を作ったか」を簡潔に記録

**記載内容:**

- 実施内容の箇条書き（要点のみ）
- 決定事項
- 成果物リスト

**記述レベル:** クリーンで読みやすい

### 4-dev-log.md
**通称:** 開発ログ、詳細記録、4、4番
**役割:** 作業ログ（雑多でOK）。「どうやって作ったか」を詳細に記録

**記載内容:**

- 使用したコマンド（全て）
- コードの詳細・実装手順
- エラーと解決方法
- つまづいた点の詳細

**記述レベル:** 雑多でOK、クリーンにする必要なし

**⚠️ 4と5の棲み分けを厳守すること**

### 5-dta2-memo.md
**通称:** dta2メモ、5、5番
**役割:** AI時代のエンジニア・クリエイターとしての考え方、心がけ、良いやり方

### z-project-draft.md
**通称:** 草案、ドラフト、z、z番
**役割:** AIへの指示や設計の草案（下書き・思考整理・アイデアメモ）

### thread-summary-260122.md
**役割:** スレッドサマリー（260122時点のアーカイブ）

---

## appendix/ -------------

### appendix/git-draft/
**通称:** PR下書き
**役割:** GitHub PR の下書きファイル置き場。ファイル名は `ID{番号}-pr-draft.md`

### appendix/wireframe.md
**通称:** ワイヤーフレーム
**役割:** 画面レイアウトのワイヤーフレーム（UI設計図）

### appendix/deploy-guide.md
**通称:** デプロイガイド
**役割:** デプロイ手順・運用ガイド

#### DB 関連

### appendix/DB-related/DATABASE_SCHEMA.md
**通称:** DB設計書
**役割:** Supabaseデータベース設計書（テーブル定義、RLS設定、初期データ挿入関数）

### appendix/DB-related/SERVER_VALIDATION.md
**通称:** サーバーバリデーション設計書
**役割:** サーバー側バリデーション設計書

### appendix/DB-related/TAGS_DIFFICULTY_DESIGN.md
**通称:** タグ・難易度設計書
**役割:** タグ機能と難易度設定機能の設計書

### appendix/DB-related/MD_SYNC_ANALYSIS.md
**通称:** MD同期分析
**役割:** MD版との同期機能に関する分析・設計

#### ガイド類

### appendix/DB-related/ADMIN_SETUP_GUIDE.md
**役割:** 管理者権限の設定ガイド

### appendix/DB-related/AI_USAGE_TROUBLESHOOTING.md
**役割:** AI機能の使用に関するトラブルシューティングガイド

### appendix/DB-related/DATA_DELETION_GUIDE.md
**役割:** データ削除機能のガイド

### appendix/DB-related/DATABASE_SETUP_GUIDE.md
**役割:** データベースセットアップガイド

### appendix/DB-related/DEBUG_STATUS_500.md
**役割:** ステータス500エラーのデバッグガイド

### appendix/DB-related/HABITICA_ANALYSIS_REPORT.md
**役割:** Habiticaアプリの分析レポート

### appendix/DB-related/MARKDOWN_MIGRATION_GUIDE.md
**役割:** マークダウン版からの移行ガイド

### appendix/DB-related/SETTINGS_IMPLEMENTATION_PLAN.md
**役割:** 設定機能の実装計画書

---

## appendix/DB-related/sql-snippet/ --------------

- `supabase-setup.sql` — 全テーブル作成・RLS設定・関数作成を一括実行
- `add-difficulty-column-to-todos.sql` — ToDoテーブルに難易度カラムを追加
- `add-unique-constraint-todos.sql` — ToDoテーブルにユニーク制約を追加
- `check-todo-tags-table.sql` — ToDoタグテーブルの確認用
- `create-todo-tags-table.sql` — ToDoタグテーブルの作成
- `insert-test-todos.sql` — テスト用ToDoデータの挿入
- `remove-duplicate-todos.sql` — 重複ToDoの削除
- `supabase-add-right-e.sql` — 権利Eの追加
- `supabase-add-rights-config.sql` — 権利設定の追加
- `supabase-admin-setup.sql` — 管理者権限のセットアップ
- `supabase-ai-usage-setup.sql` — AI使用量追跡のセットアップ
- `supabase-delete-user-data.sql` — ユーザーデータ削除用
- `supabase-tags-difficulty-setup.sql` — タグ・難易度機能のセットアップ
- `supabase-todo-subtasks-setup.sql` — ToDoサブタスク機能のセットアップ
- `supabase-trigger-setup.sql` — トリガー関数のセットアップ
- `update-difficulty-to-3-levels.sql` — 難易度を3段階に更新
