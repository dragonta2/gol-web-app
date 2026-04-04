/**
 * sync-todos.ts
 * やりたいことリスト.md の未完了 ToDo を GOL-WEB Supabase に同期するスクリプト
 *
 * 実行: cd gol-web && npx tsx scripts/sync-todos.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ─── 設定 ────────────────────────────────────────────────────

const MD_FILE =
  '/Users/ta2/Library/Mobile Documents/com~apple~CloudDocs/ALL-DTA2-iCloud/1-i-IT/i-Z-汎用生成物/i-1-中村辰彦/i-やりたいことリスト/やりたいこと・自動化したいことリスト.md';

const ENV_FILE = path.join(__dirname, '../env.local');

// ─── env.local 読み込み ────────────────────────────────────────

function loadEnv(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    vars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return vars;
}

// ─── 型 ───────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard';

interface ParsedTodo {
  task_name: string;
  difficulty: Difficulty;
  subtasks: string[];
}

// ─── マークダウンパーサー ──────────────────────────────────────

function parseMd(text: string): ParsedTodo[] {
  const todos: ParsedTodo[] = [];
  let current: ParsedTodo | null = null;

  for (const line of text.split('\n')) {
    // - [x] は完了済みなのでスキップ
    if (/^- \[x\]/.test(line)) {
      current = null;
      continue;
    }

    // - [] または - [△] が対象
    const todoMatch = line.match(/^- \[[ △]?\] (.+)$/);
    if (todoMatch) {
      const raw = todoMatch[1].trim();
      const parts = raw.split('｜');

      let taskName: string;
      let difficulty: Difficulty = 'medium';

      if (/^YID-\d+$/.test(parts[0])) {
        // YID-N｜タスク名｜... 形式
        taskName = (parts[1] ?? parts[0]).trim();
        for (let i = 2; i < parts.length; i++) {
          const p = parts[i].trim();
          if (p === 'easy' || p === 'medium' || p === 'hard') {
            difficulty = p;
            break;
          }
        }
      } else {
        // YID プレフィックスなし
        taskName = parts[0].trim();
        for (let i = 1; i < parts.length; i++) {
          const p = parts[i].trim();
          if (p === 'easy' || p === 'medium' || p === 'hard') {
            difficulty = p;
            break;
          }
        }
      }

      current = { task_name: taskName, difficulty, subtasks: [] };
      todos.push(current);
      continue;
    }

    // サブタスク行（  - テキスト）
    if (current) {
      const subtaskMatch = line.match(/^  - (.+)$/);
      if (subtaskMatch) {
        current.subtasks.push(subtaskMatch[1].trim());
      } else if (/^- /.test(line)) {
        // 次の親 ToDo へ移行（todoMatch で処理されるので current はそこで更新される）
        current = null;
      }
    }
  }

  return todos;
}

// ─── 難易度 → ポイント ────────────────────────────────────────

const POINTS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

// ─── メイン ──────────────────────────────────────────────────

async function main() {
  // 環境変数
  const env = loadEnv(ENV_FILE);
  const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
  const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];
  const adminEmails = env['NEXT_PUBLIC_ADMIN_EMAILS'];

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が設定されていません');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 管理者ユーザーID を取得
  const adminEmail = adminEmails?.split(',')[0].trim();
  if (!adminEmail) {
    console.error('NEXT_PUBLIC_ADMIN_EMAILS が設定されていません');
    process.exit(1);
  }

  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('ユーザー取得エラー:', userError.message);
    process.exit(1);
  }

  const adminUser = users.find(u => u.email === adminEmail);
  if (!adminUser) {
    console.error(`管理者ユーザーが見つかりません: ${adminEmail}`);
    process.exit(1);
  }

  const userId = adminUser.id;
  console.log(`対象ユーザー: ${adminEmail} (${userId})\n`);

  // マークダウン読み込み・パース
  const mdContent = fs.readFileSync(MD_FILE, 'utf-8');
  const parsed = parseMd(mdContent);
  console.log(`パース: ${parsed.length} 件の未完了 ToDo を検出\n`);

  // 既存 ToDo 取得（重複チェック）
  const { data: existingTodos, error: fetchError } = await supabase
    .from('todos')
    .select('task_name')
    .eq('user_id', userId);

  if (fetchError) {
    console.error('既存 ToDo 取得エラー:', fetchError.message);
    process.exit(1);
  }

  const existingNames = new Set(existingTodos?.map(t => t.task_name) ?? []);

  // 現在の最大 display_order 取得
  const { data: maxOrderRow } = await supabase
    .from('todos')
    .select('display_order')
    .eq('user_id', userId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  let displayOrder = maxOrderRow ? maxOrderRow.display_order + 1 : 0;

  let created = 0;
  let skipped = 0;

  for (const todo of parsed) {
    if (existingNames.has(todo.task_name)) {
      console.log(`  スキップ（重複）: ${todo.task_name}`);
      skipped++;
      continue;
    }

    const pts = POINTS[todo.difficulty];

    const { data: newTodo, error: insertError } = await supabase
      .from('todos')
      .insert({
        user_id: userId,
        task_name: todo.task_name,
        sp_points: pts,
        sp_exp_body: 0,
        sp_exp_mind: pts,
        sp_exp_spirit: 0,
        status: 'active',
        due_date: null,
        display_order: displayOrder,
        difficulty: todo.difficulty,
        is_on_hold: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error(`  ToDo 作成エラー（${todo.task_name}）:`, insertError.message);
      continue;
    }

    // サブタスク INSERT
    if (todo.subtasks.length > 0 && newTodo) {
      const subtaskInserts = todo.subtasks.map((subtask_name, idx) => ({
        todo_id: newTodo.id,
        subtask_name,
        is_completed: false,
        display_order: idx,
      }));

      const { error: subtaskError } = await supabase
        .from('todo_subtasks')
        .insert(subtaskInserts);

      if (subtaskError) {
        console.error(`  サブタスク作成エラー（${todo.task_name}）:`, subtaskError.message);
      }
    }

    const subtaskInfo = todo.subtasks.length > 0 ? ` (サブタスク ${todo.subtasks.length} 件)` : '';
    console.log(`  作成: ${todo.task_name} [${todo.difficulty}]${subtaskInfo}`);
    created++;
    displayOrder++;
  }

  console.log(`\n完了: ${created} 件作成, ${skipped} 件スキップ`);
}

main().catch(err => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});
