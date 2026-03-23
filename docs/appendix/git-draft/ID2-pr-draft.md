---
PR番号: 2
ブランチ: refactor/260322-apply-react-best-practice → main
作成日: 260323-Mon
---

# PR #2 下書き

## タイトル

`refactor: React best practices 準拠・速度改善（memo/lazy/Promise.all/コンポーネント分離）`

## 概要

React 19 / Next.js 16 のベストプラクティスに準拠したリファクタリング。
不要な再レンダー・ウォーターフォール・バンドルサイズの3点を改善する。

## 変更内容

### コンポーネントのメモ化（`memo()`）

- `TodoSummaryTab` を `memo()` でラップし、親の再レンダーで不要な再マウントを抑制
- `SortableManagementGroup` を `memo()` でラップ

### 遅延ロード（`lazy() + Suspense`）

- `TodoSummaryTab` を `dynamic(() => import(...))` に変更し、初回バンドルから分離
- `AnnouncementsContent` も同様に遅延ロード化
- 対象ファイル: `app/dashboard/dashboard-tabs.tsx`

### 並列フェッチ（`Promise.all()`）

API ルートで逐次 `await` していた複数クエリを `Promise.all()` に変更し、ウォーターフォールを排除。

- `app/api/daily-logs/confirm/route.ts`
- `app/api/daily-logs/unconfirm/route.ts`
- `app/api/ai/advice/route.ts`
- `app/api/ai/story/route.ts`

### useMemo 化

- `app/dashboard/journal-form.tsx` のスコア表示計算を JSX IIFE から `useMemo` に移行

### コンポーネント分離（ファイル新規作成）

肥大化していたファイルを責務単位に分割。

- `app/dashboard/subtask-rows.tsx`（新規）: `SubtaskEditRow` 等のサブタスク行コンポーネント群を `todo-summary-tab.tsx` から抽出
- `app/dashboard/habit-list-utils.tsx`（新規）: 型・ユーティリティ・`SortableManagementGroup` を `habit-list.tsx` から抽出

## 変更ファイル一覧

**新規作成（2ファイル）**

- `gol-web/app/dashboard/subtask-rows.tsx`
- `gol-web/app/dashboard/habit-list-utils.tsx`

**変更（10ファイル）**

- `gol-web/app/api/ai/advice/route.ts`
- `gol-web/app/api/ai/story/route.ts`
- `gol-web/app/api/daily-logs/confirm/route.ts`
- `gol-web/app/api/daily-logs/unconfirm/route.ts`
- `gol-web/app/dashboard/dashboard-tabs.tsx`
- `gol-web/app/dashboard/habit-list.tsx`
- `gol-web/app/dashboard/journal-form.tsx`
- `gol-web/app/dashboard/todo-summary-tab.tsx`
- `docs/3-project-progress.md`
- `docs/4-dev-log.md`

## テスト
- ローカル動作確認済み（260323-Mon）
- lint / build エラーなし
