/**
 * sync-todos.ts（経路 B）
 * やりたいことリスト.md の未完了 ToDo を GOL-WEB Supabase に同期するスクリプト。
 * パースはアプリの `parse-todo-markdown.ts` と同一（YR-11 互換）。
 *
 * 実行: cd gol-web && npm run sync-todos
 *       cd gol-web && npx tsx scripts/sync-todos.ts
 *       npx tsx scripts/sync-todos.ts --dry-run   （DB に接続せずパース・診断のみ）
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { parseTodoMarkdownWithDiagnostics } from '@/lib/parse-todo-markdown'

// ─── 既定パス（環境変数で上書き可）────────────────────────────

const DEFAULT_MD_FILE =
  '/Users/ta2/Library/Mobile Documents/com~apple~CloudDocs/ALL-DTA2-iCloud/1-i-IT/i-Z-汎用生成物/i-1-中村辰彦/i-やりたいことリスト/やりたいこと・自動化したいことリスト.md'

// ─── env 読み込み（.env.local を優先、なければ env.local）──────

function resolveEnvFile(): string | null {
  const root = path.join(__dirname, '..')
  const dot = path.join(root, '.env.local')
  const legacy = path.join(root, 'env.local')
  if (fs.existsSync(dot)) return dot
  if (fs.existsSync(legacy)) return legacy
  return null
}

function loadEnv(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const vars: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    vars[key] = val
  }
  return vars
}

function mdFilePath(): string {
  const fromEnv = process.env.SYNC_TODOS_MD_FILE?.trim()
  if (fromEnv) return fromEnv
  return DEFAULT_MD_FILE
}

// ─── メイン ──────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const mdPath = mdFilePath()

  if (!fs.existsSync(mdPath)) {
    console.error(`マークダウンファイルが見つかりません: ${mdPath}`)
    console.error('SYNC_TODOS_MD_FILE でパスを指定するか、scripts/sync-todos.ts 内の既定を編集してください。')
    process.exit(1)
  }

  const mdContent = fs.readFileSync(mdPath, 'utf-8')
  const { todos: parsed, diagnostics } = parseTodoMarkdownWithDiagnostics(mdContent)

  if (diagnostics.length > 0) {
    console.log('--- パース診断 ---')
    for (const d of diagnostics) {
      const tag = d.severity === 'error' ? 'エラー' : '警告'
      console.log(`  [${tag}] L${d.line}: ${d.message}`)
    }
    console.log('')
  }

  const hasErrors = diagnostics.some((d) => d.severity === 'error')
  if (hasErrors) {
    console.error('エラーがあるため同期を中止しました（インポートモーダルと同様、修正してから再実行してください）。')
    process.exit(1)
  }

  console.log(`パース: ${parsed.length} 件の ToDo（未完了トップレベル）\n`)

  if (dryRun) {
    for (const t of parsed) {
      const due = t.due_date ?? 'なし'
      const yidPart = t.source_yid ? ` ${t.source_yid}` : ''
      console.log(`  -${yidPart} ${t.task_name} [${t.difficulty}] 期限:${due} 報酬:${t.sp_points}G`)
      if (t.description) console.log(`      説明: ${t.description.split('\n')[0].slice(0, 60)}…`)
      if (t.subtasks.length) console.log(`      サブ: ${t.subtasks.length} 件`)
    }
    console.log('\n--dry-run のため DB には書き込みません。')
    return
  }

  const envPath = resolveEnvFile()
  if (!envPath) {
    console.error('`.env.local` または `env.local` が gol-web 直下にありません。')
    process.exit(1)
  }

  const env = loadEnv(envPath)
  const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
  const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY']
  const adminEmails = env['NEXT_PUBLIC_ADMIN_EMAILS']

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が設定されていません')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const adminEmail = adminEmails?.split(',')[0].trim()
  if (!adminEmail) {
    console.error('NEXT_PUBLIC_ADMIN_EMAILS が設定されていません')
    process.exit(1)
  }

  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
  if (userError) {
    console.error('ユーザー取得エラー:', userError.message)
    process.exit(1)
  }

  const adminUser = users.find((u) => u.email === adminEmail)
  if (!adminUser) {
    console.error(`管理者ユーザーが見つかりません: ${adminEmail}`)
    process.exit(1)
  }

  const userId = adminUser.id
  console.log(`対象ユーザー: ${adminEmail} (${userId})`)
  console.log(`環境: ${path.basename(envPath)}\n`)

  const { data: existingTodos, error: fetchError } = await supabase
    .from('todos')
    .select('task_name, source_yid')
    .eq('user_id', userId)

  if (fetchError) {
    console.error('既存 ToDo 取得エラー:', fetchError.message)
    process.exit(1)
  }

  const existingNames = new Set(
    (existingTodos ?? []).map((t) => t.task_name.trim()).filter(Boolean),
  )
  const existingYids = new Set(
    (existingTodos ?? [])
      .map((t) => t.source_yid?.trim())
      .filter((y): y is string => Boolean(y)),
  )

  const { data: maxOrderRow } = await supabase
    .from('todos')
    .select('display_order')
    .eq('user_id', userId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  let displayOrder = maxOrderRow ? maxOrderRow.display_order + 1 : 0

  let created = 0
  let skipped = 0

  for (const todo of parsed) {
    const name = todo.task_name.trim()
    if (!name) continue

    const yid = todo.source_yid?.trim() || null
    if (yid) {
      if (existingYids.has(yid)) {
        console.log(`  スキップ（同一YID）: ${yid} / ${name}`)
        skipped++
        continue
      }
    } else if (existingNames.has(name)) {
      console.log(`  スキップ（重複タスク名）: ${name}`)
      skipped++
      continue
    }

    const { data: newTodo, error: insertError } = await supabase
      .from('todos')
      .insert({
        user_id: userId,
        task_name: name,
        description: todo.description,
        sp_points: todo.sp_points,
        sp_exp_body: todo.sp_exp_body,
        sp_exp_mind: todo.sp_exp_mind,
        sp_exp_spirit: todo.sp_exp_spirit,
        status: 'active',
        difficulty: todo.difficulty,
        display_order: displayOrder,
        is_on_hold: false,
        due_date: todo.due_date,
        completed_at: null,
        source_yid: yid,
      })
      .select()
      .single()

    if (insertError || !newTodo) {
      console.error(`  ToDo 作成エラー（${name}）:`, insertError?.message ?? 'unknown')
      continue
    }

    existingNames.add(name)
    if (yid) existingYids.add(yid)

    if (todo.subtasks.length > 0) {
      const subtaskInserts = todo.subtasks.map((subtask_name, idx) => ({
        todo_id: newTodo.id,
        subtask_name,
        is_completed: false,
        display_order: idx,
      }))

      const { error: subtaskError } = await supabase.from('todo_subtasks').insert(subtaskInserts)

      if (subtaskError) {
        console.error(`  サブタスク作成エラー（${name}）:`, subtaskError.message)
      }
    }

    const subInfo = todo.subtasks.length > 0 ? ` (サブ ${todo.subtasks.length} 件)` : ''
    console.log(`  作成: ${name} [${todo.difficulty}]${subInfo}`)
    created++
    displayOrder++
  }

  console.log(`\n完了: ${created} 件作成, ${skipped} 件スキップ`)
}

main().catch((err) => {
  console.error('予期しないエラー:', err)
  process.exit(1)
})
