# 実装｜進行補助用メモ

## 記法・ルール -------------

**役割:** 未確定事項・検討案・相談メモ・不具合・進行中の整理を記載するファイル（確定した仕様は1-spec-sheet.mdへ）

記法・ルール → `docs-markdown-conventions.mdc`（`~/.claude/CLAUDE.md` 経由で AI に自動適用済み）


## 2604 -------------

### 260406｜ダッシュボード｜RSC と router.refresh

**記載** Cursor

- ダッシュボードは `app/dashboard/page.tsx` で RSC として profiles・`daily_logs`・習慣・ToDo・スコア内訳などをサーバー取得している。クライアントからの Supabase/API 更新だけでは、一度サーバーが渡した props は自動更新されない。

- そのためヘッダー未確定ゴルドなどサーバー計算値を DB と揃えるには `router.refresh()` で RSC を再実行する必要があり、習慣チェック後などでも呼んでいた。

- `RouterRefreshProvider` では `refresh`（`useTransition`＋全画面スピナー）と `refreshQuiet`（`router.refresh` のみ・オーバーレイなし）を分けている。高頻度操作は `refreshQuiet`（実装: `gol-web/contexts/router-refresh-context.tsx`）。

- refresh を根本から減らすには、該当データのクライアント取得（SWR 等）への寄せや、楽観的 UI だけで足りる箇所の整理といった設計見直しが必要。

---

### 260401-Wed ToDoスコア設計メモ -------------

#### 260401-Wed｜確定後にToDoを完了させた場合の挙動

**記載** ClaudeCode

**方針（検討中）**: ToDoは日誌と独立した存在として扱う

- 確定後に過去の日誌を見ながらToDoを完了しても、**その日誌のスコアは変えない**
- 完了させたら「**今日（未確定）の日誌**」のtodo_logsに加算する
- 現状問題: 過去日誌を見ながら完了に動かすと `dailyLogId` が過去の日誌IDになる → 修正が必要

**現状の挙動（コード調査済み）**:

- カンバン（日誌タブ）: `isConfirmed` チェックあり → 確定後は `todo_logs` 更新なし（スコア変化なし）
- ToDoサマリータブ: `isConfirmed` チェックなし → 確定後でも `todo_logs` に書き込まれてしまう

- [] 上記方針で実装を修正する `260401実装済み`

---


