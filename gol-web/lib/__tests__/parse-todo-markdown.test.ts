import { describe, it, expect } from 'vitest'
import { parseTodoMarkdown, parseYyMmDdDate } from '@/lib/parse-todo-markdown'

describe('parseYyMmDdDate', () => {
  it('YYMMDD-W を YYYY-MM-DD にする', () => {
    expect(parseYyMmDdDate('260411-土')).toBe('2026-04-11')
  })

  it('不正な日付は null', () => {
    expect(parseYyMmDdDate('2604011-土')).toBeNull()
    expect(parseYyMmDdDate('abc')).toBeNull()
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
})
