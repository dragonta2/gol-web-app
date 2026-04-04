import { describe, it, expect } from 'vitest'
import {
  parseTodoMarkdown,
  parseTodoMarkdownWithDiagnostics,
  parseYyMmDdDate,
  weekdayKanjiForIsoDate,
  canonicalYyMmDdWeekdayLabel,
  isTodoLineExcludedByGolSyncedFlag,
} from '@/lib/parse-todo-markdown'

describe('parseYyMmDdDate', () => {
  it('YYMMDD-W を YYYY-MM-DD にする', () => {
    expect(parseYyMmDdDate('260411-土')).toBe('2026-04-11')
  })

  it('曜プレースホルダ -W / -? も6桁日付として解釈する', () => {
    expect(parseYyMmDdDate('260410-W')).toBe('2026-04-10')
    expect(parseYyMmDdDate('260410-w')).toBe('2026-04-10')
    expect(parseYyMmDdDate('260410-?')).toBe('2026-04-10')
  })

  it('不正な日付は null', () => {
    expect(parseYyMmDdDate('2604011-土')).toBeNull()
    expect(parseYyMmDdDate('abc')).toBeNull()
  })
})

describe('weekdayKanjiForIsoDate / canonicalYyMmDdWeekdayLabel', () => {
  it('ISO から曜を返す', () => {
    expect(weekdayKanjiForIsoDate('2026-04-10')).toBe('金')
  })

  it('期限トークンと ISO から 260410-金 を組み立てる', () => {
    expect(canonicalYyMmDdWeekdayLabel('260410-W', '2026-04-10')).toBe('260410-金')
  })
})

describe('parseTodoMarkdown', () => {
  const yid11 = `- [] YID-11｜やりたいことリストとGOL-WebのToDoリストを同期させたい｜260404-Sat
  **｜説明｜やりたいことリストとToDoリストで2重管理になってしまっているのを解消したい**
  **｜説明｜こっちでToDoをつくって、GOL-WEBでも2重でつくるのは、時間がかかり生産的ではない**
  - ｜記載日（人間用）｜260404-土
  - ｜期限｜260411-土
  - ｜難易度｜ふつう
  - ｜報酬｜2G｜身体0｜頭脳2｜精神0
  - [] 調査
  - [] マークダウン側の項目値をあわせる
  - [] 実装
  - [] 確認`

  it('YR-11 例: タスク名・説明・期限・難易度・報酬・サブタスク', () => {
    const [t] = parseTodoMarkdown(yid11)
    expect(t.task_name).toBe('やりたいことリストとGOL-WebのToDoリストを同期させたい')
    expect(t.description).toContain('2重管理')
    expect(t.description).toContain('生産的ではない')
    expect(t.due_date).toBe('2026-04-11')
    expect(t.difficulty).toBe('medium')
    expect(t.sp_points).toBe(2)
    expect(t.sp_exp_body).toBe(0)
    expect(t.sp_exp_mind).toBe(2)
    expect(t.sp_exp_spirit).toBe(0)
    expect(t.subtasks).toEqual(['調査', 'マークダウン側の項目値をあわせる', '実装', '確認'])
    expect(t.source_yid).toBe('YID-11')
    expect(t.due_date_weekday_label).toBe('260411-土')
  })

  it('期限が -W のとき実曜日ラベルを付ける', () => {
    const [t] = parseTodoMarkdown(`- [] T
  - ｜期限｜260410-W`)
    expect(t.due_date).toBe('2026-04-10')
    expect(t.due_date_weekday_label).toBe('260410-金')
  })

  it('従来形式: タスク＋プレーンサブタスク', () => {
    const [t] = parseTodoMarkdown(`- [] タスクA
  - サブ1
  - サブ2`)
    expect(t.task_name).toBe('タスクA')
    expect(t.description).toBeNull()
    expect(t.due_date).toBeNull()
    expect(t.difficulty).toBe('medium')
    expect(t.sp_points).toBe(2)
    expect(t.sp_exp_mind).toBe(2)
    expect(t.subtasks).toEqual(['サブ1', 'サブ2'])
    expect(t.source_yid).toBeNull()
    expect(t.due_date_weekday_label).toBeNull()
  })

  it('- [x] 完了行のあとに続く行は前タスクに付けない', () => {
    const r = parseTodoMarkdown(`- [] 親
  - 子
- [x] 完了済み
  - これは無視`)
    expect(r).toHaveLength(1)
    expect(r[0].task_name).toBe('親')
    expect(r[0].subtasks).toEqual(['子'])
  })

  it('複数トップレベル', () => {
    const r = parseTodoMarkdown(`- [] A
  - a1
- [] B`)
    expect(r).toHaveLength(2)
    expect(r[0].task_name).toBe('A')
    expect(r[1].task_name).toBe('B')
  })

  it('行頭 !- [] / ! - [] は同期対象外', () => {
    const r = parseTodoMarkdown(`!- [] 同期しない
- [] 取り込む`)
    expect(r).toHaveLength(1)
    expect(r[0].task_name).toBe('取り込む')
    const r2 = parseTodoMarkdown(`! - [] 同期しない
- [] OK`)
    expect(r2).toHaveLength(1)
    expect(r2[0].task_name).toBe('OK')
  })

  it('チェックボックス直後が !- または !＋区切りなら同期対象外', () => {
    const r = parseTodoMarkdown(`- [] !-｜同期しないメモ
- [] ! 同期しない
- [] 通常タスク`)
    expect(r).toHaveLength(1)
    expect(r[0].task_name).toBe('通常タスク')
  })

  it('! の直後が区切りでないときは除外しない', () => {
    const r = parseTodoMarkdown(`- [] !Prefix付きタイトル`)
    expect(r).toHaveLength(1)
    expect(r[0].task_name).toBe('!Prefix付きタイトル')
  })

  it('親行に GOL化 / GOL_SYNCED セグメントがあるブロックはインポート対象外', () => {
    const flagged = `- [] YID-11｜同期タスク｜GOL化
  **｜説明｜説明文**
  - [] サブ`
    expect(parseTodoMarkdown(flagged)).toHaveLength(0)

    const en = `- [] YID-12｜英語フラグ｜GOL_SYNCED
  - サブ`
    expect(parseTodoMarkdown(en)).toHaveLength(0)
    expect(parseTodoMarkdown(`- [] a｜synced_gol`)).toHaveLength(0)
    expect(parseTodoMarkdown(`- [] a｜GOL-SYNCED`)).toHaveLength(0)

    const mixed = `- [] YID-1｜未反映のみ｜medium
  - ｜難易度｜ふつう
- [] YID-2｜GOL済み｜GOL化
  - サブ`
    const r = parseTodoMarkdown(mixed)
    expect(r).toHaveLength(1)
    expect(r[0].task_name).toBe('未反映のみ')
    expect(r[0].source_yid).toBe('YID-1')
  })
})

describe('isTodoLineExcludedByGolSyncedFlag', () => {
  it('フラグセグメントを検出する', () => {
    expect(isTodoLineExcludedByGolSyncedFlag('YID-1｜タイトル｜GOL化')).toBe(true)
    expect(isTodoLineExcludedByGolSyncedFlag('タイトル｜gol_synced')).toBe(true)
    expect(isTodoLineExcludedByGolSyncedFlag('YID-1｜ただのタスク')).toBe(false)
  })
})

describe('parseTodoMarkdownWithDiagnostics', () => {
  it('期限が不正なとき警告', () => {
    const { todos, diagnostics } = parseTodoMarkdownWithDiagnostics(`- [] T
  - ｜期限｜bad`)
    expect(todos[0].due_date).toBeNull()
    expect(diagnostics.some((d) => d.message.includes('変換できません'))).toBe(true)
  })

  it('報酬が解釈できないとき警告', () => {
    const { diagnostics } = parseTodoMarkdownWithDiagnostics(`- [] T
  - ｜報酬｜なし`)
    expect(diagnostics.some((d) => d.message.includes('報酬行を解釈'))).toBe(true)
  })

  it('説明の ** が欠けた行は警告しサブタスクにしない', () => {
    const { todos, diagnostics } = parseTodoMarkdownWithDiagnostics(`- [] T
  **｜説明｜閉じ忘れ`)
    expect(diagnostics.length).toBeGreaterThan(0)
    expect(todos[0].subtasks.some((s) => s.includes('説明'))).toBe(false)
  })
})
