'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { parseTodoMarkdownWithDiagnostics } from '@/lib/parse-todo-markdown'
import { DIFFICULTY_LABELS } from '@/lib/types'
import { TodoSourceYidBadge } from '@/components/todo-source-yid-badge'
import { toast } from 'sonner'

interface TodoMdImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onSuccess: () => void
}

export function TodoMdImportModal({ open, onOpenChange, userId, onSuccess }: TodoMdImportModalProps) {
  const [text, setText] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const { todos: parsed, diagnostics } = useMemo(
    () => parseTodoMarkdownWithDiagnostics(text),
    [text],
  )
  const hasErrors = diagnostics.some((d) => d.severity === 'error')
  const warnings = diagnostics.filter((d) => d.severity === 'warn')
  const errors = diagnostics.filter((d) => d.severity === 'error')

  const handleCreate = async () => {
    if (parsed.length === 0 || hasErrors) return

    setIsCreating(true)
    setProgress({ done: 0, total: parsed.length })

    try {
      const supabase = createClient()

      const { data: maxOrderTodo } = await supabase
        .from('todos')
        .select('display_order')
        .eq('user_id', userId)
        .order('display_order', { ascending: false })
        .limit(1)
        .single()

      const baseOrder = maxOrderTodo ? maxOrderTodo.display_order + 1 : 0

      const { data: existingRows, error: existingErr } = await supabase
        .from('todos')
        .select('source_yid')
        .eq('user_id', userId)

      if (existingErr) {
        toast.error('既存ToDoの取得に失敗しました', { description: existingErr.message })
        return
      }

      const dbYids = new Set(
        (existingRows ?? [])
          .map((r) => r.source_yid?.trim())
          .filter((y): y is string => Boolean(y)),
      )
      const batchYids = new Set<string>()

      let created = 0
      let skipped = 0
      let orderOffset = 0

      for (let i = 0; i < parsed.length; i++) {
        const t = parsed[i]
        const yid = t.source_yid?.trim() || null

        const dupByYid = Boolean(yid && (dbYids.has(yid) || batchYids.has(yid)))

        if (dupByYid) {
          skipped++
          setProgress({ done: i + 1, total: parsed.length })
          continue
        }

        const { data: todo, error } = await supabase
          .from('todos')
          .insert({
            user_id: userId,
            task_name: t.task_name,
            description: t.description,
            sp_points: t.sp_points,
            sp_exp_body: t.sp_exp_body,
            sp_exp_mind: t.sp_exp_mind,
            sp_exp_spirit: t.sp_exp_spirit,
            status: 'active',
            difficulty: t.difficulty,
            display_order: baseOrder + orderOffset,
            is_on_hold: false,
            due_date: t.due_date,
            completed_at: null,
            source_yid: yid,
          })
          .select()
          .single()

        if (error || !todo) {
          toast.error(`「${t.task_name}」の作成に失敗しました`, {
            description: error?.message,
          })
          setProgress({ done: i + 1, total: parsed.length })
          continue
        }

        orderOffset++
        created++
        if (yid) {
          batchYids.add(yid)
          dbYids.add(yid)
        }

        if (t.subtasks.length > 0) {
          await supabase.from('todo_subtasks').insert(
            t.subtasks.map((subName, idx) => ({
              todo_id: todo.id,
              subtask_name: subName,
              is_completed: false,
              display_order: idx,
            })),
          )
        }

        setProgress({ done: i + 1, total: parsed.length })
      }

      if (created > 0) {
        toast.success(
          skipped > 0
            ? `${created}件のToDoを作成しました（${skipped}件は同一YIDのためスキップ）`
            : `${created}件のToDoを作成しました`,
        )
        onSuccess()
        onOpenChange(false)
        setText('')
      } else if (skipped > 0) {
        toast.message('すべてスキップしました（インポート対象のYIDはすべて既に登録済み）')
      }
    } catch (err) {
      toast.error('エラーが発生しました')
      console.error(err)
    } finally {
      setIsCreating(false)
      setProgress(null)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        if (!isCreating) onOpenChange(v)
      }}
      title="マークダウンからToDoタスクを作成"
      description={
        <div className="space-y-3">
          <p>
            <strong>やりたいことリスト</strong>
            などの Markdown を下の欄に貼り付けると、内容を解釈して{' '}
            <strong>GOL の ToDo として登録</strong>
            します。トップレベルの{' '}
            <code className="rounded bg-zinc-800/90 px-1 py-0.5 font-mono text-xs text-cyan-200/95">
              - []
            </code>{' '}
            が複数あれば、<strong>1 回の「作成する」でまとめて複数件</strong>を作れます。形式がずれている行は警告・エラーとして表示されます。
          </p>
          <div>
            <p className="mb-1.5 font-medium text-zinc-200">書式（やりたいことリスト互換）</p>
            <ul className="list-disc space-y-1.5 pl-4 marker:text-zinc-500">
              <li>
                <span className="text-zinc-400">親タスク（1 行に 1 ToDo）</span>：{' '}
                <code className="rounded bg-zinc-800/90 px-1 py-0.5 font-mono text-xs text-cyan-200/95">
                  - [] YID-1｜タスク名
                </code>{' '}
                のように <code className="font-mono text-xs text-cyan-200/95">- []</code> で開始
              </li>
              <li>
                <span className="text-zinc-400">説明</span>：インデントした行で{' '}
                <code className="rounded bg-zinc-800/90 px-1 py-0.5 font-mono text-xs text-cyan-200/95">
                  **｜説明｜本文**
                </code>{' '}
                （先頭・末尾の <code className="font-mono text-xs">**</code> が必須）
              </li>
              <li>
                <span className="text-zinc-400">期限・難易度・報酬</span>：サブ行で{' '}
                <code className="font-mono text-xs text-cyan-200/95">｜期限｜</code>・
                <code className="font-mono text-xs text-cyan-200/95">｜難易度｜</code>・
                <code className="font-mono text-xs text-cyan-200/95">｜報酬｜</code>
              </li>
              <li>
                <span className="text-zinc-400">サブタスク</span>：{' '}
                <code className="rounded bg-zinc-800/90 px-1 py-0.5 font-mono text-xs text-cyan-200/95">
                  - [] 名前
                </code>{' '}
                またはチェックなしの{' '}
                <code className="rounded bg-zinc-800/90 px-1 py-0.5 font-mono text-xs text-cyan-200/95">
                  - 名前
                </code>
              </li>
            </ul>
          </div>
        </div>
      }
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          '- [] YID-1｜タスク名\n  **｜説明｜詳細**\n  - ｜期限｜260411-土\n  - ｜難易度｜ふつう\n  - ｜報酬｜2G｜身体0｜頭脳2｜精神0\n  - [] サブタスク'
        }
        className="w-full min-h-40 h-48 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y"
        disabled={isCreating}
      />

      {diagnostics.length > 0 && (
        <div className="rounded-md border border-zinc-600 bg-zinc-800/80 px-3 py-2 text-xs space-y-2 max-h-36 overflow-y-auto">
          {errors.length > 0 && (
            <div>
              <p className="text-rose-400 font-medium mb-1">エラー（作成できません）</p>
              <ul className="list-disc list-inside text-rose-200/90 space-y-0.5">
                {errors.map((d, i) => (
                  <li key={`e-${i}`}>
                    L{d.line}: {d.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div>
              <p className="text-amber-400 font-medium mb-1">警告（このまま作成は可能）</p>
              <ul className="list-disc list-inside text-amber-100/80 space-y-0.5">
                {warnings.map((d, i) => (
                  <li key={`w-${i}`}>
                    L{d.line}: {d.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {parsed.length > 0 && (
        <div>
          <p className="text-xs text-zinc-400 mb-2">{parsed.length}件を作成します（プレビュー・重複は実行時にスキップ）</p>
          <ul className="space-y-3 max-h-56 overflow-y-auto pr-1 text-left">
            {parsed.map((t, i) => (
              <li key={i} className="text-sm text-zinc-300 border border-zinc-700 rounded-md p-2 bg-zinc-800/50">
                <div className="flex flex-wrap items-center gap-1.5 font-medium text-cyan-300">
                  <TodoSourceYidBadge sourceYid={t.source_yid} />
                  <span className="min-w-0">{t.task_name}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-1 space-x-2 flex flex-wrap gap-x-2 gap-y-0.5">
                  <span>難易度: {DIFFICULTY_LABELS[t.difficulty]}</span>
                  <span>
                    報酬: {t.sp_points}G / 体{t.sp_exp_body} 頭{t.sp_exp_mind} 心{t.sp_exp_spirit}
                  </span>
                  {t.due_date ? (
                    <span>
                      期限:{' '}
                      {t.due_date_weekday_label
                        ? `${t.due_date_weekday_label}（${t.due_date}）`
                        : t.due_date}
                    </span>
                  ) : (
                    <span>期限: なし</span>
                  )}
                </div>
                {t.description ? (
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-3 whitespace-pre-wrap">{t.description}</p>
                ) : null}
                {t.subtasks.length > 0 && (
                  <ul className="ml-3 mt-1 space-y-0.5">
                    {t.subtasks.map((s, j) => (
                      <li key={j} className="text-xs text-zinc-500">
                        └ {s}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          disabled={isCreating}
          className="border-zinc-600 bg-zinc-800 text-zinc-100 shadow-none hover:bg-zinc-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
        >
          キャンセル
        </Button>
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={parsed.length === 0 || isCreating || hasErrors}
          className="bg-cyan-600 font-medium text-white shadow-none hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
        >
          {isCreating && progress
            ? `${progress.done}/${progress.total}件作成中...`
            : `${parsed.length > 0 ? `${parsed.length}件を` : ''}作成する`}
        </Button>
      </div>
    </Modal>
  )
}
