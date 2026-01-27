# GOL Web版｜ドキュメント目次

このフォルダには、GOL Web版開発に関するドキュメントが格納されています。

---

## 📚 ドキュメント一覧

### 00-AI-prompt-memo.md
**通称:** AIプロンプトメモ
**役割:** AIへのプロンプト指示をメモした雑多なファイル

### 01-web-ai-directive-draft.md
**通称:** 草案、ドラフト
**役割:** AIへの指示や設計の草案（下書き・思考整理・アイデアメモ）

### 02-gol-design-doc.md
**通称:** 仕様書、運用ルール、ルール
**役割:** 決定稿の実装ルール（確定した設計・仕様・ルール）

### 03-wireframe.md
**通称:** ワイヤーフレーム
**役割:** 画面レイアウトのワイヤーフレーム（UI設計図）

### 04-project-progress.md
**通称:** 進捗表、簡潔記録
**役割:** 日々のGOL-Web版の進捗報告（整理されたもの）

**記載内容:** 概要、一覧、サマリー程度。「何を作ったか」を簡潔に記録

- 実施内容の箇条書き（要点のみ）
- 決定事項
- 成果物リスト
- 学んだこと（簡潔に）
- 次回予定

**記述レベル:** クリーンで読みやすい

### 05-dev-log.md
**通称:** 開発ログ、詳細記録
**役割:** 作業ログ（雑多でOK、コマンド、使用した流れ、学習メモ）

**記載内容:** 詳細にやったことを全て記録。「どうやって作ったか」を詳細に記録

- 使用したコマンド（全て）
- コードの詳細（サンプルコード含む）
- 実装手順（ステップバイステップ）
- エラーと解決方法
- 学習メモ（詳細な技術解説）
- つまづいた点の詳細

**記述レベル:** 雑多でOK、クリーンにする必要なし

**⚠️ 04と05の棲み分けを厳守すること**

### 06-dta2-memo.md
**通称:** dta2メモ
**役割:** AI時代のエンジニア、クリエイターとしての考え方、心がけ、良いやり方

### 07-database-schema.md
**通称:** DB設計書
**役割:** Supabaseデータベース設計書（テーブル定義、RLS設定、初期データ挿入関数）

### 08-md-sync-analysis.md
**通称:** MD同期分析
**役割:** MD版との同期機能に関する分析・設計

### 09-server-validation.md
**通称:** サーバーバリデーション設計書
**役割:** サーバー側バリデーション設計書

### 10-progress-support.md
**通称:** 進捗支援
**役割:** 一時的な進捗管理・支援、方針決定のサポート用に利用するドキュメント

### 11-tags-difficulty-design.md
**通称:** タグ・難易度設計書
**役割:** タグ機能と難易度設定機能の設計書

---

## 📋 ガイド・マニュアル

### ADMIN_SETUP_GUIDE.md
**役割:** 管理者権限の設定ガイド

### AI_USAGE_TROUBLESHOOTING.md
**役割:** AI機能の使用に関するトラブルシューティングガイド

### DATA_DELETION_GUIDE.md
**役割:** データ削除機能のガイド

### DATABASE_SETUP_GUIDE.md
**役割:** データベースセットアップガイド

### DEBUG_STATUS_500.md
**役割:** ステータス500エラーのデバッグガイド

### HABITICA_ANALYSIS_REPORT.md
**役割:** Habiticaアプリの分析レポート

### MARKDOWN_MIGRATION_GUIDE.md
**役割:** マークダウン版からの移行ガイド

### SETTINGS_IMPLEMENTATION_PLAN.md
**役割:** 設定機能の実装計画書

### thread-summary-260122.md
**役割:** スレッドサマリー（260122時点）

---

## 💾 SQLファイル

### supabase-setup.sql
**役割:** Supabase実行用SQLファイル（全テーブル作成、RLS設定、関数作成を一括実行）

### sql-snippet/
**役割:** SQLスニペット集（個別のテーブル作成・更新用SQLファイル）
- `add-difficulty-column-to-todos.sql`: ToDoテーブルに難易度カラムを追加
- `add-unique-constraint-todos.sql`: ToDoテーブルにユニーク制約を追加
- `check-todo-tags-table.sql`: ToDoタグテーブルの確認用
- `create-todo-tags-table.sql`: ToDoタグテーブルの作成
- `insert-test-todos.sql`: テスト用ToDoデータの挿入
- `remove-duplicate-todos.sql`: 重複ToDoの削除
- `supabase-add-right-e.sql`: 権利Eの追加
- `supabase-add-rights-config.sql`: 権利設定の追加
- `supabase-admin-setup.sql`: 管理者権限のセットアップ
- `supabase-ai-usage-setup.sql`: AI使用量追跡のセットアップ
- `supabase-delete-user-data.sql`: ユーザーデータ削除用
- `supabase-setup.sql`: 基本セットアップ（テーブル作成、RLS設定）
- `supabase-tags-difficulty-setup.sql`: タグ・難易度機能のセットアップ
- `supabase-todo-subtasks-setup.sql`: ToDoサブタスク機能のセットアップ
- `supabase-trigger-setup.sql`: トリガー関数のセットアップ
- `update-difficulty-to-3-levels.sql`: 難易度を3段階に更新


**最終更新: 2026-01-23**

