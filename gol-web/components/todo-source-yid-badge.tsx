/** `YID-12` → 接頭辞は小さく、数字だけ強調 */
const YID_SPLIT = /^(YID-)(\d+)$/i

/** ToDo カード等に表示する「やりたいことリスト」連携 YID ラベル */
export function TodoSourceYidBadge({
  sourceYid,
  className = '',
}: {
  sourceYid: string | null | undefined
  className?: string
}) {
  if (!sourceYid) return null
  const trimmed = sourceYid.trim()
  const m = trimmed.match(YID_SPLIT)
  const base = `inline-block font-mono font-semibold text-cyan-400/95 shrink-0 ${className}`

  if (m) {
    const prefix = m[1]
    const digits = m[2]
    return (
      <span className={base} title="やりたいことリスト連携ID（YID）">
        <span className="text-[10px]">{prefix}</span>
        <span className="text-sm">{digits}</span>
      </span>
    )
  }

  return (
    <span className={`${base} text-sm`} title="やりたいことリスト連携ID（YID）">
      {trimmed}
    </span>
  )
}
