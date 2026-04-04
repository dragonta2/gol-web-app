'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { parseTodoMarkdown } from '@/lib/parse-todo-markdown'
import { DIFFICULTY_LABELS } from '@/lib/types'
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

  const parsed = parseTodoMarkdown(text)

  const handleCreate = async () => {
    if (parsed.length === 0) return

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

      for (let i = 0; i < parsed.length; i++) {
        const t = parsed[i]

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
            display_order: baseOrder + i,
            is_on_hold: false,
            due_date: t.due_date,
            completed_at: null,
          })
          .select()
          .single()

        if (error || !todo) {
          toast.error(`「${t.task_name}」の作成に失敗しました`)
          continue
        }

        if (t.subtasks.length > 0) {
          await supabase.from('todo_subtasks').insert(
            t.subtasks.map((name, idx) => ({
              todo_id: todo.id,
              subtask_name: name,
              is_completed: false,
              display_order: idx,
            }))
          )
        }

        setProgress({ done: i + 1, total: parsed.length })
      }

      toast.success(`${parsed.length}件のToDoを作成しました`)
      onSuccess()
      onOpenChange(false)
      setText('')
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
      title="MDからToDoをインポート"
      description={
        <span>
          やりたいことリスト形式: 親行 <code className="text-zinc-300">- []</code> 、説明{' '}
          <code className="text-zinc-300">**｜説明｜…**</code> 、{' '}
          <code className="text-zinc-300">｜期限｜</code>
          <code className="text-zinc-300">｜難易度｜</code>
          <code className="text-zinc-300">｜報酬｜</code> 、サブは{' '}
          <code className="text-zinc-300">- [] 名前</code> またはプレーンの{' '}
          <code className="text-zinc-300">- 名前</code>。
        </span>
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

      {parsed.length > 0 && (
        <div>
          <p className="text-xs text-zinc-400 mb-2">{parsed.length}件を作成します（プレビュー）</p>
          <ul className="space-y-3 max-h-56 overflow-y-auto pr-1 text-left">
            {parsed.map((t, i) => (
              <li key={i} className="text-sm text-zinc-300 border border-zinc-700 rounded-md p-2 bg-zinc-800/50">
                <div className="font-medium text-cyan-300">{t.task_name}</div>
                <div className="text-xs text-zinc-500 mt-1 space-x-2 flex flex-wrap gap-x-2 gap-y-0.5">
                  <span>難易度: {DIFFICULTY_LABELS[t.difficulty]}</span>
                  <span>
                    報酬: {t.sp_points}G / 体{t.sp_exp_body} 頭{t.sp_exp_mind} 心{t.sp_exp_spirit}
                  </span>
                  {t.due_date ? <span>期限: {t.due_date}</span> : <span>期限: なし</span>}
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
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          キャンセル
        </Button>
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={parsed.length === 0 || isCreating}
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          {isCreating && progress
            ? `${progress.done}/${progress.total}件作成中...`
            : `${parsed.length > 0 ? `${parsed.length}件を` : ''}作成する`}
        </Button>
      </div>
    </Modal>
  )
}
