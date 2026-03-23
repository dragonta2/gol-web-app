"use client"

import { memo, useState, useEffect } from "react"
import type { TodoSubtask } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, ChevronUp, ChevronDown, GripVertical } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { isSubmitShortcut } from "@/lib/utils"

/** サブタスク1行：入力はローカルstateで保持し、保存ボタン押下時のみ親に通知（入力遅延防止）。並び替えはドラッグハンドルまたは↑↓ボタン */
export const SubtaskEditRow = memo(function SubtaskEditRow({
  subtask,
  onSave,
  onDelete,
  dragHandle,
  isDeleting,
  onMoveUp,
  onMoveDown,
}: {
  subtask: TodoSubtask
  onSave: (name: string) => void
  onDelete: () => void
  dragHandle?: React.ReactNode
  isDeleting?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  const [value, setValue] = useState(subtask.subtask_name)
  useEffect(() => {
    setValue(subtask.subtask_name)
  }, [subtask.id, subtask.subtask_name])
  const handleSaveClick = () => {
    const name = value.trim()
    if (!name) {
      toast.error("サブタスク名を入力してください")
      return
    }
    onSave(name)
  }
  if (isDeleting) {
    return (
      <div className="flex items-center gap-2 p-2 bg-zinc-800 rounded text-zinc-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
        <span>削除中...</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 p-2 bg-zinc-800 rounded" data-subtask-edit-row>
      {dragHandle != null && (
        <div className="shrink-0 touch-none" aria-label="ドラッグして並び替え">
          {dragHandle}
        </div>
      )}
      {(onMoveUp != null || onMoveDown != null) && (
        <div className="flex flex-col shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={onMoveUp == null}
            className="p-0.5 rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="上に移動"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={onMoveDown == null}
            className="p-0.5 rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="下に移動"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 min-w-0 bg-zinc-900 border-zinc-700 text-zinc-100 text-sm"
        placeholder="サブタスク名"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleSaveClick}
        className="text-xs text-cyan-400 hover:text-cyan-300 shrink-0 h-auto py-1"
      >
        保存
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="text-xs text-red-400 hover:text-red-300 shrink-0 h-auto py-1"
      >
        削除
      </Button>
    </div>
  )
})

/** 新規サブタスク入力：「+ 追加」ボタン押下時のみ作成（Enterでは作成しない） */
export const NewSubtaskInput = memo(function NewSubtaskInput({
  todoId,
  onAdd,
  disabled,
  isAdding,
}: {
  todoId: string
  onAdd: (todoId: string, name: string) => void
  disabled?: boolean
  isAdding?: boolean
}) {
  const [value, setValue] = useState("")
  const handleAdd = () => {
    const name = value.trim()
    if (!name) {
      toast.error("サブタスク名を入力してください")
      return
    }
    onAdd(todoId, name)
    setValue("")
  }
  const busy = disabled || isAdding
  return (
    <div className="flex items-center gap-2" data-subtask-new>
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (isSubmitShortcut(e)) {
            e.preventDefault()
            e.stopPropagation()
            handleAdd()
          }
        }}
        placeholder="サブタスク名を入力"
        className="flex-1 min-w-0 bg-zinc-800 border-zinc-700 text-zinc-100"
        disabled={busy}
        aria-label="新しいサブタスク名を入力。追加するには右の「+ 追加」または Cmd+Enter を押してください"
      />
      <Button
        type="button"
        onClick={handleAdd}
        disabled={busy}
        className="bg-cyan-600 hover:bg-cyan-700 text-white shrink-0 min-w-20"
      >
        {isAdding ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
            <span className="ml-1">追加中...</span>
          </>
        ) : (
          "+ 追加"
        )}
      </Button>
    </div>
  )
})

/** 編集モーダル用：ドラッグ&ドロップまたは↑↓ボタンで並び替え可能なサブタスク1行 */
export const SortableSubtaskRow = memo(function SortableSubtaskRow({
  subtask,
  onSave,
  onDelete,
  isDeleting,
  onMoveUp,
  onMoveDown,
}: {
  subtask: TodoSubtask
  onSave: (name: string) => void
  onDelete: () => void
  isDeleting?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: subtask.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        isDragging ? "opacity-50" : "",
        isOver ? "outline outline-2 outline-dashed outline-cyan-400 rounded-md" : "",
      ].filter(Boolean).join(" ") || undefined}
    >
      <SubtaskEditRow
        subtask={subtask}
        onSave={onSave}
        onDelete={onDelete}
        isDeleting={isDeleting}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        dragHandle={
          <button
            type="button"
            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none"
            {...listeners}
            {...attributes}
            aria-label="ドラッグして並び替え"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        }
      />
    </div>
  )
})
