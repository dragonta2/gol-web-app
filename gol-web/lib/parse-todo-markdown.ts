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
  const yy = Number(m[1], 10)
  const mm = Number(m[2], 10)
  const dd = Number(m[3], 10)
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
    points: g ? Number(g[1], 10) : 0,
    body: body ? Number(body[1], 10) : 0,
    mind: mind ? Number(mind[1], 10) : 0,
    spirit: spirit ? Number(spirit[1], 10) : 0,
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

function handleIndentedLine(b: Builder, rest: string): void {
  const t = rest.trim()

  if (/^｜記載日|記載日（人間用）/.test(t)) {
    return
  }

  const dueM = t.match(/^｜期限｜\s*(.+)$/)
  if (dueM) {
    const iso = parseYyMmDdDate(dueM[1])
    b.due_date = iso
    return
  }

  const diffM = t.match(/^｜難易度｜\s*(.+)$/)
  if (diffM) {
    const d = parseDifficultyJp(diffM[1])
    if (d) b.difficulty = d
    return
  }

  const rewM = t.match(/^｜報酬｜\s*(.+)$/)
  if (rewM) {
    const parsed = parseRewardRest(rewM[1])
    if (parsed) {
      b.rewardLineParsed = true
      b.sp_points = parsed.points > 0 ? parsed.points : PRESET_GOLD_BY_DIFFICULTY[b.difficulty]
      b.sp_exp_body = parsed.body
      b.sp_exp_mind = parsed.mind
      b.sp_exp_spirit = parsed.spirit
    }
    return
  }

  if (t.startsWith('｜')) {
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
 * やりたいことリスト（YR-11）形式と従来の簡易形式の両方を解釈する。
 *
 * - 親: `- [] タスク`（`- [x]` 完了行はスキップし、直後の子は付けない）
 * - 説明: `**｜説明｜…**`（複数行可）
 * - メタ: `  - ｜期限｜YYMMDD-W` / `  - ｜難易度｜ふつう` / `  - ｜報酬｜2G｜身体0｜頭脳2｜精神0` / `  - ｜記載日（人間用）｜…`（DBに使わない）
 * - サブタスク: `  - [] 名前` または `  - 名前`
 */
export function parseTodoMarkdown(text: string): ParsedTodoForImport[] {
  const lines = text.split('\n')
  const out: ParsedTodoForImport[] = []
  let current: Builder | null = null

  const flush = () => {
    if (current && current.task_name.trim()) {
      out.push(finalizeBuilder(current))
    }
    current = null
  }

  for (const line of lines) {
    if (TOP_DONE.test(line)) {
      flush()
      continue
    }

    const topM = line.match(TOP_TODO)
    if (topM) {
      flush()
      const title = extractTaskTitle(topM[1])
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

    const indM = line.match(INDENT_BULLET)
    if (indM && current) {
      handleIndentedLine(current, indM[1])
      continue
    }

    if (/^#{1,6}\s/.test(line.trim())) {
      flush()
    }
  }

  flush()
  return out
}
