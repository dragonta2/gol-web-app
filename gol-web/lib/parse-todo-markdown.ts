import type { Difficulty } from '@/lib/types'
import {
  PRESET_GOLD_BY_DIFFICULTY,
  PRESET_EXP_BY_DIFFICULTY,
  distributePresetExp,
} from '@/lib/types'

/** MDインポート用（1タスク分。報酬・期限は省略時は難易度プリセットで埋める） */
export interface ParsedTodoForImport {
  task_name: string
  description: string | null
  difficulty: Difficulty
  sp_points: number
  sp_exp_body: number
  sp_exp_mind: number
  sp_exp_spirit: number
  /** YYYY-MM-DD または null */
  due_date: string | null
  subtasks: string[]
}

export type ParseTodoMarkdownSeverity = 'error' | 'warn'

export interface ParseTodoMarkdownDiagnostic {
  severity: ParseTodoMarkdownSeverity
  /** 1-based 行番号 */
  line: number
  message: string
}

export interface ParseTodoMarkdownResult {
  todos: ParsedTodoForImport[]
  diagnostics: ParseTodoMarkdownDiagnostic[]
}

type Builder = {
  task_name: string
  descriptionParts: string[]
  difficulty: Difficulty
  sp_points: number
  sp_exp_body: number
  sp_exp_mind: number
  sp_exp_spirit: number
  due_date: string | null
  subtasks: string[]
  rewardLineParsed: boolean
}

/** `- []` / `- [ ]` / `- [△]` など任意のチェックボックス内容 */
const TOP_TODO = /^- \[[^\]]*\]\s*(.+)\s*$/
/** 完了 `- [x]` はブロックを閉じる（インポート対象外） */
const TOP_DONE = /^- \[[xX]\]\s*/
const DESC_LINE = /^\s*\*\*｜説明｜(.+?)\*\*\s*$/
const INDENT_BULLET = /^(?: {2}|\t)- (.+)$/

/** YYMMDD-W → YYYY-MM-DD（7桁日付や不正月日は null） */
export function parseYyMmDdDate(input: string): string | null {
  const s = input.trim()
  const m = s.match(/^(\d{2})(\d{2})(\d{2})(?:-\S*)?$/)
  if (!m) return null
  const yy = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  const dd = parseInt(m[3], 10)
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const year = 2000 + yy
  const iso = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return iso
}

function parseDifficultyJp(s: string): Difficulty | null {
  const t = s.trim()
  if (t === 'やさしい' || t === 'easy') return 'easy'
  if (t === 'ふつう' || t === 'medium') return 'medium'
  if (t === 'むずかしい' || t === 'hard') return 'hard'
  return null
}

function extractTaskTitle(raw: string): string {
  const parts = raw.split('｜').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return raw.trim()

  let start = 0
  if (/^YID-\d+$/i.test(parts[0])) start = 1
  if (start >= parts.length) return parts[0]

  for (let j = start; j < parts.length; j++) {
    const seg = parts[j]
    if (seg === 'easy' || seg === 'medium' || seg === 'hard') continue
    if (/^\d{6}-\S+$/.test(seg)) continue
    if (/^\d{7}-/.test(seg)) continue
    return seg
  }
  return parts[start]
}

function parseRewardRest(rest: string): {
  points: number
  body: number
  mind: number
  spirit: number
} | null {
  const g = rest.match(/(\d+)\s*G/i)
  const body = rest.match(/身体\s*(\d+)/)
  const mind = rest.match(/頭脳\s*(\d+)/)
  const spirit = rest.match(/精神\s*(\d+)/)
  if (!g && !body && !mind && !spirit) return null
  return {
    points: g ? parseInt(g[1], 10) : 0,
    body: body ? parseInt(body[1], 10) : 0,
    mind: mind ? parseInt(mind[1], 10) : 0,
    spirit: spirit ? parseInt(spirit[1], 10) : 0,
  }
}

function applyDifficultyDefaults(b: Builder): void {
  const d = b.difficulty
  b.sp_points = PRESET_GOLD_BY_DIFFICULTY[d]
  const dist = distributePresetExp(PRESET_EXP_BY_DIFFICULTY[d], ['mind'])
  b.sp_exp_body = dist.body
  b.sp_exp_mind = dist.mind
  b.sp_exp_spirit = dist.spirit
}

function finalizeBuilder(b: Builder): ParsedTodoForImport {
  if (!b.rewardLineParsed) {
    applyDifficultyDefaults(b)
  } else {
    if (b.sp_points <= 0) {
      b.sp_points = PRESET_GOLD_BY_DIFFICULTY[b.difficulty]
    }
  }

  const description =
    b.descriptionParts.length > 0
      ? b.descriptionParts.join('\n\n').trim() || null
      : null

  return {
    task_name: b.task_name.trim(),
    description,
    difficulty: b.difficulty,
    sp_points: b.sp_points,
    sp_exp_body: b.sp_exp_body,
    sp_exp_mind: b.sp_exp_mind,
    sp_exp_spirit: b.sp_exp_spirit,
    due_date: b.due_date,
    subtasks: [...b.subtasks],
  }
}

function handleIndentedLine(
  b: Builder,
  rest: string,
  lineNum: number,
  diagnostics: ParseTodoMarkdownDiagnostic[],
): void {
  const t = rest.trim()

  if (/^｜記載日|記載日（人間用）/.test(t)) {
    return
  }

  const dueM = t.match(/^｜期限｜\s*(.*)$/)
  if (dueM) {
    const v = dueM[1].trim()
    if (!v) {
      diagnostics.push({
        severity: 'warn',
        line: lineNum,
        message: '｜期限｜の後に日付がありません（例: 260411-土）',
      })
      return
    }
    const iso = parseYyMmDdDate(v)
    b.due_date = iso
    if (!iso) {
      diagnostics.push({
        severity: 'warn',
        line: lineNum,
        message: `期限「${v}」を日付に変換できませんでした（YYMMDD と曜の6+桁推奨）`,
      })
    }
    return
  }

  const diffM = t.match(/^｜難易度｜\s*(.*)$/)
  if (diffM) {
    const v = diffM[1].trim()
    const d = parseDifficultyJp(v)
    if (d) b.difficulty = d
    else if (v) {
      diagnostics.push({
        severity: 'warn',
        line: lineNum,
        message: `難易度「${v}」が認識できません（やさしい・ふつう・むずかしい）`,
      })
    }
    return
  }

  const rewM = t.match(/^｜報酬｜\s*(.*)$/)
  if (rewM) {
    const rrest = rewM[1].trim()
    if (!rrest) {
      diagnostics.push({
        severity: 'warn',
        line: lineNum,
        message: '｜報酬｜の後がありません（例: 2G｜身体0｜頭脳2｜精神0）',
      })
      return
    }
    const parsed = parseRewardRest(rrest)
    if (parsed) {
      b.rewardLineParsed = true
      b.sp_points = parsed.points > 0 ? parsed.points : PRESET_GOLD_BY_DIFFICULTY[b.difficulty]
      b.sp_exp_body = parsed.body
      b.sp_exp_mind = parsed.mind
      b.sp_exp_spirit = parsed.spirit
    } else {
      diagnostics.push({
        severity: 'warn',
        line: lineNum,
        message:
          '報酬行を解釈できません。`数字G`・`身体数字`・`頭脳数字`・`精神数字` を含めてください',
      })
    }
    return
  }

  if (/^報酬｜/.test(t) && !t.startsWith('｜報酬｜')) {
    diagnostics.push({
      severity: 'warn',
      line: lineNum,
      message: '報酬は「｜報酬｜」で始めてください（行頭は全角｜）',
    })
    return
  }

  if (t.startsWith('｜')) {
    diagnostics.push({
      severity: 'warn',
      line: lineNum,
      message: `未対応のメタ行です（無視されます）: ${t.length > 40 ? `${t.slice(0, 40)}…` : t}`,
    })
    return
  }

  const chk = t.match(/^\[[ x△]?\]\s*(.*)$/)
  if (chk) {
    const name = chk[1].trim()
    if (name) b.subtasks.push(name)
    return
  }

  if (t.length > 0) {
    b.subtasks.push(t)
  }
}

/**
 * パース結果と、書式の警告・エラーを返す。
 */
export function parseTodoMarkdownWithDiagnostics(text: string): ParseTodoMarkdownResult {
  const lines = text.split('\n')
  const out: ParsedTodoForImport[] = []
  const diagnostics: ParseTodoMarkdownDiagnostic[] = []
  let current: Builder | null = null

  const flush = () => {
    if (current && current.task_name.trim()) {
      out.push(finalizeBuilder(current))
    }
    current = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    if (TOP_DONE.test(line)) {
      flush()
      continue
    }

    const topM = line.match(TOP_TODO)
    if (topM) {
      flush()
      const title = extractTaskTitle(topM[1])
      if (!title.trim()) {
        diagnostics.push({
          severity: 'error',
          line: lineNum,
          message: 'タスク名が空です（`- [] タスク名` を確認してください）',
        })
        current = null
        continue
      }
      current = {
        task_name: title,
        descriptionParts: [],
        difficulty: 'medium',
        sp_points: 0,
        sp_exp_body: 0,
        sp_exp_mind: 0,
        sp_exp_spirit: 0,
        due_date: null,
        subtasks: [],
        rewardLineParsed: false,
      }
      continue
    }

    const descM = line.match(DESC_LINE)
    if (descM && current) {
      current.descriptionParts.push(descM[1].trim())
      continue
    }

    if (current && /^\s*\*\*｜説明｜/.test(line) && !DESC_LINE.test(line)) {
      diagnostics.push({
        severity: 'warn',
        line: lineNum,
        message:
          '説明行は `**｜説明｜本文**` の形で、行末まで `**` で閉じてください（インデント付きも同じ）',
      })
      continue
    }

    const indM = line.match(INDENT_BULLET)
    if (indM && current) {
      if (/^\*\*｜説明｜/.test(indM[1].trim()) && !DESC_LINE.test(line)) {
        diagnostics.push({
          severity: 'warn',
          line: lineNum,
          message:
            '説明行は `**｜説明｜本文**` で1行に閉じてください（末尾の `**` が欠けている可能性があります）',
        })
        continue
      }
      handleIndentedLine(current, indM[1], lineNum, diagnostics)
      continue
    }

    if (/^#{1,6}\s/.test(line.trim())) {
      flush()
    }
  }

  flush()
  return { todos: out, diagnostics }
}

/**
 * やりたいことリスト（YR-11）形式と従来の簡易形式の両方を解釈する。
 *
 * 警告が必要なときは `parseTodoMarkdownWithDiagnostics` を使う。
 */
export function parseTodoMarkdown(text: string): ParsedTodoForImport[] {
  return parseTodoMarkdownWithDiagnostics(text).todos
}
