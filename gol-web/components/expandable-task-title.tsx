'use client'

import { useState } from 'react'

/** 長いタスク名はデフォルト1行省略。クリックで全文表示／再クリックで畳む（親の DnD と競合しないよう pointer を止める） */
export function ExpandableTaskTitle({
  taskName,
  textClassName = '',
}: {
  taskName: string
  textClassName?: string
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <button
      type="button"
      className={`flex-1 min-w-0 text-left text-base font-bold text-zinc-100 rounded px-0.5 -mx-0.5 hover:bg-zinc-800/50 transition-colors ${expanded ? 'whitespace-normal wrap-break-word' : 'truncate'} ${textClassName}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        setExpanded((v) => !v)
      }}
      aria-expanded={expanded}
      aria-label={
        expanded
          ? `${taskName}（タスク名を折りたたむ）`
          : `${taskName}（タスク名を展開して全文を表示）`
      }
      suppressHydrationWarning
    >
      {taskName}
    </button>
  )
}
