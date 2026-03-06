import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Mac: Cmd+Enter / Windows: Ctrl+Enter でフォーム送信などのショートカット判定 */
export function isSubmitShortcut(
  e: { metaKey: boolean; ctrlKey: boolean; key: string }
): boolean {
  return (e.metaKey || e.ctrlKey) && e.key === "Enter"
}

/**
 * AI作成文章の改行ルール（1-spec-sheet.md 準拠）
 * 句点（。）・疑問符（？（全角）・?（半角））の後は必ず改行する
 */
export function applyAiTextLineBreaks(text: string): string {
  if (!text) return text
  return text
    .replace(/。/g, '。\n')
    .replace(/？/g, '？\n')   // 全角
    .replace(/\?/g, '?\n')   // 半角
    .replace(/\n{3,}/g, '\n\n') // 連続改行は最大2つに
    .trimEnd()
}

/**
 * 2行ごとに空行を挿入（これまでの冒険・これからの冒険・辛口コーチングアドバイス用）
 */
export function insertBlankLineEveryTwoLines(text: string): string {
  if (!text) return text
  const lines = text.split('\n')
  const groups: string[] = []
  for (let i = 0; i < lines.length; i += 2) {
    groups.push(lines.slice(i, i + 2).join('\n'))
  }
  return groups.join('\n\n')
}
