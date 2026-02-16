/**
 * 1日分のスコアデルタ集計（確定ボタンで profiles に反映する値の計算）
 * 習慣・ToDo・AI判定・権利消費を合算する
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { RIGHT_COLUMNS_BY_INDEX } from '@/lib/rights';
import { isWeekendOrHoliday } from '@/lib/date-utils';

export type DayDeltas = {
  points_delta: number;
  exp_body_delta: number;
  exp_mind_delta: number;
  exp_spirit_delta: number;
};

/** スコア内訳（ToDo・習慣・AI・権利ごと） */
export type ScoreBreakdownItem = {
  points_delta: number;
  exp_body_delta: number;
  exp_mind_delta: number;
  exp_spirit_delta: number;
};

export type ScoreBreakdown = {
  total: DayDeltas;
  todo: ScoreBreakdownItem;
  habits_good: ScoreBreakdownItem;
  habits_bad: ScoreBreakdownItem;
  ai: ScoreBreakdownItem;
  rights: { points_delta: number }; // 権利はポイントのみ
};

const EMPTY_ITEM: ScoreBreakdownItem = {
  points_delta: 0,
  exp_body_delta: 0,
  exp_mind_delta: 0,
  exp_spirit_delta: 0,
};

/**
 * 指定した日誌（1日分）のポイント/EXPデルタを集計する
 * 習慣ログ・ToDoログ・AI判定・権利消費を合算し、確定時に profiles に適用する値を返す
 */
export async function calculateDayDeltas(
  supabase: SupabaseClient,
  dailyLogId: string
): Promise<DayDeltas | null> {
  const deltas: DayDeltas = {
    points_delta: 0,
    exp_body_delta: 0,
    exp_mind_delta: 0,
    exp_spirit_delta: 0,
  };

  // 1. daily_log 取得（user_id, log_date, ai_*, right_*）
  const logColumns = [
    'user_id',
    'log_date',
    'ai_points_earned',
    'ai_exp_body',
    'ai_exp_mind',
    'ai_exp_spirit',
    ...RIGHT_COLUMNS_BY_INDEX,
  ].join(',');
  const { data: dailyLog, error: logError } = await supabase
    .from('daily_logs')
    .select(logColumns)
    .eq('id', dailyLogId)
    .single();

  if (logError || !dailyLog || !('log_date' in dailyLog)) {
    return null;
  }

  const logDate = dailyLog.log_date as string;
  const dailyLogRecord = dailyLog as Record<string, unknown>;

  // 2. 習慣ログ + 習慣マスタ でデルタ加算（各習慣のチェックごとにその習慣のゴルド/EXPを加算。親は見出しのみでチェックされないため子のみ加算）
  const { data: habitLogs } = await supabase
    .from('habit_logs')
    .select('habit_id, is_checked, count')
    .eq('daily_log_id', dailyLogId);

  if (habitLogs && habitLogs.length > 0) {
    const habitIds = habitLogs.map((h) => h.habit_id);
    const { data: habits } = await supabase
      .from('habits')
      .select('id, habit_type, points, exp_body, exp_mind, exp_spirit, input_type, exclude_weekends')
      .in('id', [...new Set(habitIds)]);

    const habitMap = new Map((habits || []).map((h) => [h.id, h]));
    const isWeekend = isWeekendOrHoliday(logDate);

    for (const log of habitLogs) {
      const habit = habitMap.get(log.habit_id);
      if (!habit || !log.is_checked) continue;
      const count = habit.input_type === 'number' ? (log.count ?? 0) : 1;
      if (count <= 0) continue;
      const badExcluded = habit.habit_type === 'bad' && habit.exclude_weekends === true && isWeekend;
      if (badExcluded) continue;
      const sign = habit.habit_type === 'bad' ? -1 : 1;
      deltas.points_delta += sign * (habit.points ?? 0) * count;
      deltas.exp_body_delta += sign * (habit.exp_body ?? 0) * count;
      deltas.exp_mind_delta += sign * (habit.exp_mind ?? 0) * count;
      deltas.exp_spirit_delta += sign * (habit.exp_spirit ?? 0) * count;
    }
  }

  // 3. ToDoログ でデルタ加算
  const { data: todoLogs } = await supabase
    .from('todo_logs')
    .select('points_earned, exp_body_earned, exp_mind_earned, exp_spirit_earned')
    .eq('daily_log_id', dailyLogId);

  if (todoLogs) {
    for (const t of todoLogs) {
      deltas.points_delta += t.points_earned ?? 0;
      deltas.exp_body_delta += t.exp_body_earned ?? 0;
      deltas.exp_mind_delta += t.exp_mind_earned ?? 0;
      deltas.exp_spirit_delta += t.exp_spirit_earned ?? 0;
    }
  }

  // 4. AI判定分を加算
  deltas.points_delta += Number(dailyLogRecord['ai_points_earned']) || 0;
  deltas.exp_body_delta += Number(dailyLogRecord['ai_exp_body']) || 0;
  deltas.exp_mind_delta += Number(dailyLogRecord['ai_exp_mind']) || 0;
  deltas.exp_spirit_delta += Number(dailyLogRecord['ai_exp_spirit']) || 0;

  // 5. 権利消費（利用ゴルド）を減算: daily_log の right_*_count と権利設定の points が必要
  const { data: profile } = await supabase
    .from('profiles')
    .select('rights_config')
    .eq('id', dailyLogRecord['user_id'])
    .single();

  const rightsPoints = parseRightsPoints(profile?.rights_config);
  for (let i = 0; i < Math.min(RIGHT_COLUMNS_BY_INDEX.length, rightsPoints.length); i++) {
    const col = RIGHT_COLUMNS_BY_INDEX[i];
    const count = Number(dailyLogRecord[col]) ?? 0;
    const pointsPer = rightsPoints[i] ?? 0;
    deltas.points_delta -= count * pointsPer;
  }

  return deltas;
}

/**
 * 指定した日誌（1日分）のポイント/EXPデルタを内訳付きで集計する
 * 確定時の総計表示と、ToDo・習慣・悪習慣・AI・権利の内訳表示に使用
 */
export async function calculateDayDeltasWithBreakdown(
  supabase: SupabaseClient,
  dailyLogId: string
): Promise<ScoreBreakdown | null> {
  const breakdown: ScoreBreakdown = {
    total: { points_delta: 0, exp_body_delta: 0, exp_mind_delta: 0, exp_spirit_delta: 0 },
    todo: { ...EMPTY_ITEM },
    habits_good: { ...EMPTY_ITEM },
    habits_bad: { ...EMPTY_ITEM },
    ai: { ...EMPTY_ITEM },
    rights: { points_delta: 0 },
  };

  const logColumns = [
    'user_id',
    'log_date',
    'ai_points_earned',
    'ai_exp_body',
    'ai_exp_mind',
    'ai_exp_spirit',
    ...RIGHT_COLUMNS_BY_INDEX,
  ].join(',');
  const { data: dailyLog, error: logError } = await supabase
    .from('daily_logs')
    .select(logColumns)
    .eq('id', dailyLogId)
    .single();

  if (logError || !dailyLog || !('log_date' in dailyLog)) {
    return null;
  }

  const logDate = dailyLog.log_date as string;
  const dailyLogRecord = dailyLog as Record<string, unknown>;

  // 1. 習慣ログ（各習慣のチェックごとにその習慣のゴルド/EXPを加算）
  const { data: habitLogs } = await supabase
    .from('habit_logs')
    .select('habit_id, is_checked, count')
    .eq('daily_log_id', dailyLogId);

  if (habitLogs && habitLogs.length > 0) {
    const habitIds = [...new Set(habitLogs.map((h) => h.habit_id))];
    const { data: habits } = await supabase
      .from('habits')
      .select('id, habit_type, points, exp_body, exp_mind, exp_spirit, input_type, exclude_weekends')
      .in('id', habitIds);

    const habitMap = new Map((habits || []).map((h) => [h.id, h]));
    const isWeekend = isWeekendOrHoliday(logDate);

    for (const log of habitLogs) {
      const habit = habitMap.get(log.habit_id);
      if (!habit || !log.is_checked) continue;
      const count = habit.input_type === 'number' ? (log.count ?? 0) : 1;
      if (count <= 0) continue;
      const badExcluded = habit.habit_type === 'bad' && habit.exclude_weekends === true && isWeekend;
      if (badExcluded) continue;
      const sign = habit.habit_type === 'bad' ? -1 : 1;
      const pts = sign * (habit.points ?? 0) * count;
      const eb = sign * (habit.exp_body ?? 0) * count;
      const em = sign * (habit.exp_mind ?? 0) * count;
      const es = sign * (habit.exp_spirit ?? 0) * count;
      const target = habit.habit_type === 'bad' ? breakdown.habits_bad : breakdown.habits_good;
      target.points_delta += pts;
      target.exp_body_delta += eb;
      target.exp_mind_delta += em;
      target.exp_spirit_delta += es;
    }
  }

  // 2. ToDoログ
  const { data: todoLogs } = await supabase
    .from('todo_logs')
    .select('points_earned, exp_body_earned, exp_mind_earned, exp_spirit_earned')
    .eq('daily_log_id', dailyLogId);

  if (todoLogs) {
    for (const t of todoLogs) {
      breakdown.todo.points_delta += t.points_earned ?? 0;
      breakdown.todo.exp_body_delta += t.exp_body_earned ?? 0;
      breakdown.todo.exp_mind_delta += t.exp_mind_earned ?? 0;
      breakdown.todo.exp_spirit_delta += t.exp_spirit_earned ?? 0;
    }
  }

  // 3. AI判定分
  breakdown.ai.points_delta = Number(dailyLogRecord['ai_points_earned']) || 0;
  breakdown.ai.exp_body_delta = Number(dailyLogRecord['ai_exp_body']) || 0;
  breakdown.ai.exp_mind_delta = Number(dailyLogRecord['ai_exp_mind']) || 0;
  breakdown.ai.exp_spirit_delta = Number(dailyLogRecord['ai_exp_spirit']) || 0;

  // 4. 権利消費（インデックスで rights_config とカラムを対応。配列順＝表示順）
  const { data: profile } = await supabase
    .from('profiles')
    .select('rights_config')
    .eq('id', dailyLogRecord['user_id'])
    .single();

  const rightsPoints = parseRightsPoints(profile?.rights_config);
  for (let i = 0; i < Math.min(RIGHT_COLUMNS_BY_INDEX.length, rightsPoints.length); i++) {
    const col = RIGHT_COLUMNS_BY_INDEX[i];
    const rawVal = dailyLogRecord[col];
    const count = Number(rawVal) ?? 0;
    const pointsPer = rightsPoints[i] ?? 0;
    breakdown.rights.points_delta -= count * pointsPer;
  }

  // 5. 合計を算出
  breakdown.total.points_delta =
    breakdown.todo.points_delta +
    breakdown.habits_good.points_delta +
    breakdown.habits_bad.points_delta +
    breakdown.ai.points_delta +
    breakdown.rights.points_delta;
  breakdown.total.exp_body_delta =
    breakdown.todo.exp_body_delta +
    breakdown.habits_good.exp_body_delta +
    breakdown.habits_bad.exp_body_delta +
    breakdown.ai.exp_body_delta;
  breakdown.total.exp_mind_delta =
    breakdown.todo.exp_mind_delta +
    breakdown.habits_good.exp_mind_delta +
    breakdown.habits_bad.exp_mind_delta +
    breakdown.ai.exp_mind_delta;
  breakdown.total.exp_spirit_delta =
    breakdown.todo.exp_spirit_delta +
    breakdown.habits_good.exp_spirit_delta +
    breakdown.habits_bad.exp_spirit_delta +
    breakdown.ai.exp_spirit_delta;

  return breakdown;
}

/**
 * 設定APIの DEFAULT_RIGHTS と同じ順（A,B,C,D,E,F,O,U,X）のデフォルトポイント。
 * rights_config が空のとき設定APIはこの9件を返すため、日誌の right_*_count もこの順で使われる。
 */
const DEFAULT_RIGHTS_POINTS_BY_INDEX = [5, 4, 1, 0, 3, 10, 5, 1, 10];

function toPointsNumber(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') return parseInt(v, 10) || 0;
  return 0;
}

/**
 * rights_config から各権利のポイント配列を取得（表示順＝RIGHT_COLUMNS_BY_INDEX のインデックス順）
 * 配列形式・レガシー形式に対応。空のときは設定APIと同様デフォルト9件のポイントを使用。
 */
function parseRightsPoints(config: unknown): number[] {
  if (Array.isArray(config)) {
    const arr = config.slice(0, RIGHT_COLUMNS_BY_INDEX.length).map((r: any) =>
      toPointsNumber(r?.points)
    );
    if (arr.length > 0) return arr;
  }
  if (config && typeof config === 'object') {
    const obj = config as Record<string, unknown>;
    // { rights: [...] } 形式
    if (Array.isArray(obj.rights) && (obj.rights as any[]).length > 0) {
      return (obj.rights as any[])
        .slice(0, RIGHT_COLUMNS_BY_INDEX.length)
        .map((r: any) => toPointsNumber(r?.points));
    }
    // レガシー形式: { A: { points }, B: { points }, ... }
    const LEGACY_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'O', 'U', 'X'];
    const hasLegacyKeys = LEGACY_ORDER.some((code) => code in obj);
    if (hasLegacyKeys) {
      return LEGACY_ORDER.map((code) => {
        const c = obj[code] as any;
        return toPointsNumber(c?.points);
      });
    }
    // {} や { rights: [] } など中身が空のオブジェクト → デフォルトにフォールバック
  }
  // rights_config が null/undefined/空オブジェクトのとき設定APIは DEFAULT_RIGHTS を返すため、同じ順でデフォルトポイントを使用
  return [...DEFAULT_RIGHTS_POINTS_BY_INDEX];
}
