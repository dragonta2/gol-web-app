import { describe, expect, it } from 'vitest';
import { buildHabitNamesForAiCoaching, type HabitRowForPrompt } from '@/lib/ai/habit-prompt-lists';

describe('buildHabitNamesForAiCoaching', () => {
  it('悪習慣の未チェックは resisted、チェックは committed（単体）', () => {
    const habits: HabitRowForPrompt[] = [
      { id: 'b1', habit_name: '夜食', habit_type: 'bad', parent_habit_id: null },
    ];
    const r1 = buildHabitNamesForAiCoaching([{ habit_id: 'b1', is_checked: false }], habits);
    expect(r1.resistedBad).toContain('夜食（悪習慣を回避・未実施）');
    expect(r1.committedBad).toHaveLength(0);
    expect(r1.missedGoodBonus).toHaveLength(0);

    const r2 = buildHabitNamesForAiCoaching([{ habit_id: 'b1', is_checked: true }], habits);
    expect(r2.committedBad).toEqual(['夜食']);
    expect(r2.resistedBad).toHaveLength(0);
  });

  it('親子の良習慣で1子だけチェックなら missed は空・completed に子', () => {
    const habits: HabitRowForPrompt[] = [
      { id: 'p1', habit_name: '朝ルーティン', habit_type: 'good', parent_habit_id: null },
      { id: 'c1', habit_name: 'ストレッチ', habit_type: 'good', parent_habit_id: 'p1' },
      { id: 'c2', habit_name: '読書', habit_type: 'good', parent_habit_id: 'p1' },
    ];
    const logs = [
      { habit_id: 'p1', is_checked: false },
      { habit_id: 'c1', is_checked: true },
      { habit_id: 'c2', is_checked: false },
    ];
    const r = buildHabitNamesForAiCoaching(logs, habits);
    expect(r.completedGoodBonus).toEqual(['ストレッチ']);
    expect(r.missedGoodBonus).toHaveLength(0);
  });

  it('親子の良習慣で全未チェックなら missed に親1行', () => {
    const habits: HabitRowForPrompt[] = [
      { id: 'p1', habit_name: '朝ルーティン', habit_type: 'good', parent_habit_id: null },
      { id: 'c1', habit_name: 'ストレッチ', habit_type: 'good', parent_habit_id: 'p1' },
    ];
    const logs = [
      { habit_id: 'p1', is_checked: false },
      { habit_id: 'c1', is_checked: false },
    ];
    const r = buildHabitNamesForAiCoaching(logs, habits);
    expect(r.missedGoodBonus.some((s) => s.includes('朝ルーティン') && s.includes('親習慣'))).toBe(true);
    expect(r.completedGoodBonus).toHaveLength(0);
  });

  it('親子の悪習慣で全未チェックは resisted 1行', () => {
    const habits: HabitRowForPrompt[] = [
      { id: 'p1', habit_name: '無駄スマホ', habit_type: 'bad', parent_habit_id: null },
      { id: 'c1', habit_name: 'SNS', habit_type: 'bad', parent_habit_id: 'p1' },
    ];
    const logs = [
      { habit_id: 'p1', is_checked: false },
      { habit_id: 'c1', is_checked: false },
    ];
    const r = buildHabitNamesForAiCoaching(logs, habits);
    expect(r.resistedBad.some((s) => s.includes('無駄スマホ') && s.includes('親子とも未実施'))).toBe(true);
    expect(r.committedBad).toHaveLength(0);
  });
});
