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
 *
 * OpenAI 応答によっては `\r` のみ・`\r\n` 混在があり、`\n{3,}` 系の圧縮が効かず
 * 緊張コーチングだけ空行が異常に大きく見えることがあるため、先に改行を正規化する。
 */
export function applyAiTextLineBreaks(text: string): string {
  if (!text) return text
  let t = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
  return t
    .replace(/。/g, '。\n')
    .replace(/？/g, '？\n')   // 全角
    .replace(/\?/g, '?\n')   // 半角
    .replace(/\n{3,}/g, '\n\n') // 連続改行は最大2つに
    .trimEnd()
}

/**
 * 2行ごとに空行を挿入（あらすじ・緊張/弛緩コーチングなど）
 */
export function insertBlankLineEveryTwoLines(text: string): string {
  if (!text) return text
  const lines = text.split('\n')
  const groups: string[] = []
  for (let i = 0; i < lines.length; i += 2) {
    groups.push(lines.slice(i, i + 2).join('\n'))
  }
  const out = groups.join('\n\n')
  return out.replace(/\n{3,}/g, '\n\n')
}

/**
 * コーチング冒頭「◯◯よ。」直後の空き行を **常に一定** にする。
 * 先頭の余計な改行・BOM を除き、最初に現れる「…よ[。．]」の直後を **空行 1 行分**（`\n\n`）に統一する。
 * （`^...$` の全体マッチは先頭改行で失敗しやすいため、プレフィックスのみマッチする）
 */
export function normalizeCoachingGreetingParagraphGap(text: string): string {
  if (!text) return text
  let s = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^\uFEFF/, '')
    .replace(/^\n+/, '')
  const m = s.match(/^([^\n]*よ[。．])/)
  if (!m) {
    return s.replace(/\n{3,}/g, '\n\n')
  }
  // LLM が Markdown の「行末スペース2つ＋改行」(  \n) を入れることがあり、^\n+ だけでは残る → 空行が倍加する
  const after = s.slice(m[1].length).replace(/^\s+/u, '')
  return `${m[1]}\n\n${after}`.replace(/\n{3,}/g, '\n\n')
}
