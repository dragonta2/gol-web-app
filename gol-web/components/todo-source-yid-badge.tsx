/** ToDo カード等に表示する「やりたいことリスト」連携 YID ラベル */
export function TodoSourceYidBadge({
  sourceYid,
  className = '',
}: {
  sourceYid: string | null | undefined
  className?: string
}) {
  if (!sourceYid) return null
  return (
    <span
      className={`inline-block text-[10px] font-mono font-semibold text-cyan-400/95 shrink-0 ${className}`}
      title="やりたいことリスト連携ID（YID）"
    >
      {sourceYid}
    </span>
  )
}
