import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * AI作成文章の改行ルール（02-gol-design-doc.md 準拠）
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
