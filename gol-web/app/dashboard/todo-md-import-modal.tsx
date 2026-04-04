'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { parseTodoMarkdown } from '@/lib/parse-todo-markdown'
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
        const { task_name, subtasks } = parsed[i]

        const { data: todo, error } = await supabase
          .from('todos')
          .insert({
            user_id: userId,
            task_name,
            sp_points: 2,
            sp_exp_body: 0,
            sp_exp_mind: 2,
            sp_exp_spirit: 0,
            status: 'active',
            difficulty: 'medium',
            display_order: baseOrder + i,
            is_on_hold: false,
            due_date: null,
            completed_at: null,
          })
          .select()
          .single()

        if (error || !todo) {
          toast.error(`「${task_name}」の作成に失敗しました`)
          continue
        }

        if (subtasks.length > 0) {
          await supabase.from('todo_subtasks').insert(
            subtasks.map((name, idx) => ({
              todo_id: todo.id,
              subtask_name: name,
              is_completed: false,
              display_order: idx + 1,
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
      description="- [] タスク名 の形式で入力。インデント（2スペース or タブ）の - はサブタスクになります。"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"- [] タスクA\n  - サブタスク1\n  - サブタスク2\n- [] タスクB"}
        className="w-full h-40 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
        disabled={isCreating}
      />

      {parsed.length > 0 && (
        <div>
          <p className="text-xs text-zinc-400 mb-2">{parsed.length}件を作成します（難易度: ふつう）</p>
          <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {parsed.map((t, i) => (
              <li key={i} className="text-sm text-zinc-300">
                <span className="text-cyan-400">•</span> {t.task_name}
                {t.subtasks.length > 0 && (
                  <ul className="ml-4 mt-0.5 space-y-0.5">
                    {t.subtasks.map((s, j) => (
                      <li key={j} className="text-xs text-zinc-500">└ {s}</li>
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
