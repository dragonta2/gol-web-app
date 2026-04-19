/**
 * AI コーチング・判定用に habit_logs と habits を解釈し、表示用の名前配列を組み立てる。
 *
 * - 悪習慣: 未チェック＝回避（よい結果）。チェック＝実施してしまった。
 * - 親習慣（子あり）の良習慣・ボーナス: 親または子のいずれか1つでもチェックがあれば、
 *   そのグループの未チェックを「未達」に含めない。
 */

export type HabitRowForPrompt = {
  id: string;
  habit_name: string;
  habit_type: 'good' | 'bad' | 'bonus';
  parent_habit_id: string | null;
};

export type HabitLogRow = { habit_id: string; is_checked: boolean };

export type HabitNamesForAiCoaching = {
  /** 良習慣・ボーナスでチェック済みの名前 */
  completedGoodBonus: string[];
  /** 良習慣・ボーナスで未達（親子セットは親名1行にまとめる） */
  missedGoodBonus: string[];
  /** 悪習慣を今日は実施しなかった（回避）と解釈できる行 */
  resistedBad: string[];
  /** 悪習慣を実施してしまった（チェックあり） */
  committedBad: string[];
};

export function buildHabitNamesForAiCoaching(
  habitLogs: HabitLogRow[],
  habits: HabitRowForPrompt[]
): HabitNamesForAiCoaching {
  const checkedById = new Map<string, boolean>();
  for (const log of habitLogs) {
    checkedById.set(log.habit_id, log.is_checked);
  }

  function isChecked(id: string): boolean {
    return checkedById.get(id) ?? false;
  }

  const completedGoodBonus: string[] = [];
  const missedGoodBonus: string[] = [];
  const resistedBad: string[] = [];
  const committedBad: string[] = [];

  const roots = habits.filter((h) => !h.parent_habit_id);
  const childrenOf = (parentId: string) =>
    habits.filter((h) => h.parent_habit_id === parentId).sort((a, b) => a.habit_name.localeCompare(b.habit_name));

  for (const root of roots) {
    const children = childrenOf(root.id);

    if (children.length === 0) {
      if (root.habit_type === 'bad') {
        if (isChecked(root.id)) {
          committedBad.push(root.habit_name);
        } else {
          resistedBad.push(`${root.habit_name}（悪習慣を回避・未実施）`);
        }
      } else if (isChecked(root.id)) {
        completedGoodBonus.push(root.habit_name);
      } else {
        missedGoodBonus.push(root.habit_name);
      }
      continue;
    }

    const parentChecked = isChecked(root.id);
    const childRows = children.map((c) => ({ c, checked: isChecked(c.id) }));
    const anyChecked = parentChecked || childRows.some((x) => x.checked);

    if (root.habit_type === 'bad') {
      if (!anyChecked) {
        resistedBad.push(`${root.habit_name}（悪習慣・親子とも未実施で回避）`);
      } else {
        if (parentChecked) committedBad.push(root.habit_name);
        for (const { c, checked } of childRows) {
          if (checked) committedBad.push(c.habit_name);
        }
      }
    } else if (anyChecked) {
      if (parentChecked) completedGoodBonus.push(root.habit_name);
      for (const { c, checked } of childRows) {
        if (checked) completedGoodBonus.push(c.habit_name);
      }
    } else {
      missedGoodBonus.push(`${root.habit_name}（親習慣：子を含めいずれも未実施）`);
    }
  }

  // 親マスタが取得対象に含まれないなどで、子だけ habits に残っている場合のフォールバック
  for (const h of habits) {
    if (!h.parent_habit_id) continue;
    if (habits.some((p) => p.id === h.parent_habit_id)) continue;

    if (h.habit_type === 'bad') {
      if (isChecked(h.id)) committedBad.push(h.habit_name);
      else resistedBad.push(`${h.habit_name}（悪習慣を回避・未実施）`);
    } else if (isChecked(h.id)) {
      completedGoodBonus.push(h.habit_name);
    } else {
      missedGoodBonus.push(h.habit_name);
    }
  }

  return { completedGoodBonus, missedGoodBonus, resistedBad, committedBad };
}
