# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root (delegates to `gol-web/`):

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E tests (CI only)
```

Or run directly from `gol-web/`:

```bash
cd gol-web
npx vitest run <path>          # Run a single test file
npx vitest run --coverage      # With coverage report
npx vitest --ui                # Interactive test UI
```

## Architecture

**GOL** is a personal RPG-style habit/task/journal tracker with AI coaching. Single-user-oriented but supports invited users.

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + Supabase (auth + PostgreSQL) + OpenAI API

### Directory Layout (`gol-web/`)

- `app/` — Next.js App Router pages and API routes
  - `dashboard/` — Main page (habits, todos, journal, rights tracking)
  - `settings/` — Account, habits, todos, rights, admin configuration
  - `api/` — All backend logic lives here as route handlers
    - `ai/` — OpenAI endpoints: judgment, advice, story, batch, usage
    - `daily-logs/` — Journal CRUD + confirm/unconfirm day
    - `habits/`, `todos/` — CRUD + tags
    - `stats/` — Completion rates, points/EXP history
    - `settings/` — Admin: level thresholds, rights config, AI limits
    - `user/` — Profile, data export/import/delete
- `components/` — React components; `components/ui/` contains shadcn/ui primitives
- `lib/` — Shared utilities
  - `supabase/client.ts`, `supabase/server.ts` — Supabase clients (browser vs server)
  - `types.ts` — All TypeScript interfaces (source of truth for data models)
  - `score-calculator.ts` — Aggregates points/EXP from habits, todos, AI, rights
  - `sync-profile-level.ts` — Level/class progression logic
  - `validation.ts` — Input sanitization used on every API route
- `contexts/` — React Context: `CalendarDialogContext`, `FontSizeContext`
- `middleware.ts` — Supabase session refresh on every request

### Data Flow

1. **Client components** call `/api/*` routes via fetch
2. **API routes** use `createClient()` (server Supabase) + validate input + query DB
3. **Supabase RLS** enforces row-level isolation (`auth.uid() = user_id`)
4. **AI routes** call OpenAI server-side; keys never reach the browser

### Key Data Models (from `lib/types.ts`)

- `DailyLog` — One per user per day; holds journal text, AI results, rights usage counts, `is_confirmed` flag
- `Habit` / `HabitLog` — Habit definitions + per-day check records linked to a `daily_log_id`
- `Todo` / `TodoLog` / `TodoSubtask` — Kanban tasks with subtasks; completion recorded against a daily log
- `Profile` — Points, EXP (body/mind/spirit), level, class_name

### Scoring / Confirmation Flow

- Habits and todos accumulate in `habit_logs` / `todo_logs` as user interacts
- "Confirm Day" (`POST /api/daily-logs/confirm`) calls `score-calculator.ts` to sum everything, then updates `profiles` with delta points/EXP
- Confirming locks the daily log (`is_confirmed = true`); unconfirming reverses the delta

### AI Integration

- OpenAI (GPT-4) generates: habit-day judgment (points ruling), coaching advice, RPG narrative
- Prompts live in `lib/ai/`
- Usage tracked per user with daily/monthly limits configurable by admin

### Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

Optional:
```
NOTION_API_KEY=
NOTION_JOURNAL_DB_ID=
NEXT_PUBLIC_ADMIN_EMAILS=
```

### Conventions

- `@/` path alias for `gol-web/` root (configured in `tsconfig.json`)
- Named exports only (no default exports)
- Server components by default; add `'use client'` only when needed
- API routes always validate auth and ownership before DB access
- Unit tests live in `app/api/**/__tests__/`; E2E tests in `e2e/`

◯番メモと言われたらこのプロジェクトの `docs/` 内の該当ファイルを参照する。

プロジェクト固有の通称・役割は `docs/_INDEX.md` を参照すること。

## チェックリスト実装ワークフロー（厳守）

`docs/2-support-of-progress.md` などのチェックリスト項目 `- [] 〇〇` に対応する作業（コード実装・設定変更・DB操作・環境変数編集など作業の種類を問わず）が完了した場合、**必ず作業完了直後に**末尾へ日付タグを追記する。

```markdown
- [] 項目名 `YYMMDD実装済み`
```

- ユーザーが確認・OKを出したら `[x]` をつける（AIはつけない）
- 実装後の日付追記を忘れた場合、次のユーザーメッセージで指摘される前に自己修正する
