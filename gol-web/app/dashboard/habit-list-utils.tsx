'use client';

import { memo } from 'react';
import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExpWithIcons } from '@/components/exp-with-icons';

// ─── 型定義 ─────────────────────────────────────────────

export interface Habit {
  id: string;
  user_id: string;
  habit_name: string;
  habit_type: 'good' | 'bad' | 'bonus';
  points: number;
  exp_body: number;
  exp_mind: number;
  exp_spirit: number;
  display_order: number;
  parent_habit_id?: string | null;
  is_custom: boolean;
  input_type: 'checkbox' | 'number';
  exclude_weekends: boolean;
  exclude_from_complete: boolean;
  is_active: boolean;
  is_low_frequency?: boolean;
  description?: string | null;
  note?: string | null;
  difficulty?: string;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  daily_log_id: string;
  habit_id: string;
  is_checked: boolean;
  count: number;
  created_at: string;
  updated_at: string;
}

export interface HabitListProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  dailyLogId: string | null;
  /** 表示中の日付（YYYY-MM-DD）。週末除外ラベル表示に使用 */
  logDate?: string | null;
  /** 日誌確定済みのとき true（チェック・数値入力無効化） */
  isConfirmed?: boolean;
}

export interface HabitWithLog extends Habit {
  checked: boolean;
  count: number;
  habitLogId: string | null;
}

export interface HabitFormData {
  habit_name: string;
  description: string;
  note: string;
  habit_type: 'good' | 'bad' | 'bonus';
  points: number;
  exp_body: number;
  exp_mind: number;
  exp_spirit: number;
  input_type: 'checkbox' | 'number';
  exclude_weekends: boolean;
  exclude_from_complete: boolean;
  parent_habit_id: string;
}

/** モーダル内の子習慣1行 */
export interface ChildHabitRow {
  id: string;
  habit_name: string;
  description: string;
  points: number;
  exp_body: number;
  exp_mind: number;
  exp_spirit: number;
}

// ─── ユーティリティ関数 ─────────────────────────────────

/** 親習慣とその子習慣のツリー（表示用）。親は parent_habit_id == null、子は parent_habit_id === 親.id */
export function buildHabitTree(habits: HabitWithLog[]): { parent: HabitWithLog; children: HabitWithLog[] }[] {
  const parents = habits
    .filter((h) => !h.parent_habit_id)
    .sort((a, b) => a.display_order - b.display_order);
  return parents.map((parent) => {
    const children = habits
      .filter((h) => h.parent_habit_id === parent.id)
      .sort((a, b) => a.display_order - b.display_order);
    return { parent, children };
  });
}

/** 管理モーダル用: 習慣タイプごとに「親+子」または「単体」のグループに分ける。並びは親の display_order。 */
export function buildManagementGroups(habits: Habit[], habitType: 'good' | 'bad' | 'bonus'): { root: Habit; habits: Habit[] }[] {
  const list = habits
    .filter((h) => h.habit_type === habitType)
    .sort((a, b) => a.display_order - b.display_order);
  const roots = list.filter((h) => !h.parent_habit_id);
  return roots.map((root) => {
    const children = list.filter((h) => h.parent_habit_id === root.id).sort((a, b) => a.display_order - b.display_order);
    return { root, habits: [root, ...children] };
  });
}

/** 親習慣の表示用「完了」: 親のチェック or いずれかの子のチェック */
export function isParentCompleted(parent: HabitWithLog, children: HabitWithLog[]): boolean {
  return parent.checked || children.some((c) => c.checked);
}

// ─── コンポーネント ─────────────────────────────────────

/** 習慣のゴルド・EXPの加減算設定値を返す純粋関数 */
export function getHabitPointsExpPartsUtil(habit: HabitWithLog): { g: string; body: number; mind: number; spirit: number } {
  const sign = habit.habit_type === 'bad' ? -1 : 1;
  const g = `${habit.habit_type === 'bad' ? '-' : '+'} ${habit.points}G`;
  return {
    g,
    body: habit.exp_body > 0 ? habit.exp_body * sign : 0,
    mind: habit.exp_mind > 0 ? habit.exp_mind * sign : 0,
    spirit: habit.exp_spirit > 0 ? habit.exp_spirit * sign : 0,
  };
}

/** モバイル展開エリア：ゴルド/EXP表示 + 週末除外・Comp対象外ボタン */
export function HabitMobileDetail({ habit, isConfirmed, onToggleExcludeWeekends, onToggleExcludeFromComplete }: {
  habit: HabitWithLog;
  isConfirmed: boolean;
  onToggleExcludeWeekends: (id: string) => void;
  onToggleExcludeFromComplete: (id: string) => void;
}) {
  const pts = getHabitPointsExpPartsUtil(habit);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="flex items-baseline gap-1 text-xs text-zinc-400 flex-wrap">
        <span>{pts.g}</span>
        {(pts.body !== 0 || pts.mind !== 0 || pts.spirit !== 0) && (
          <>
            <span>｜</span>
            <ExpWithIcons body={pts.body} mind={pts.mind} spirit={pts.spirit} signed />
          </>
        )}
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); onToggleExcludeWeekends(habit.id); }} disabled={isConfirmed} title="土日祝は任意（進捗に影響しません）" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${habit.exclude_weekends ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>週末除外</button>
      <button type="button" onClick={(e) => { e.stopPropagation(); onToggleExcludeFromComplete(habit.id); }} disabled={isConfirmed} title="Completeボーナス対象外" className={`text-xs px-2 py-0.5 rounded transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${habit.exclude_from_complete ? 'text-yellow-400 bg-yellow-900/30' : 'text-zinc-500 bg-zinc-800 hover:bg-zinc-700'} ${isConfirmed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>Comp対象外</button>
    </div>
  );
}

/** 管理モーダル用ソータブルグループラッパー */
export const SortableManagementGroup = memo(function SortableManagementGroup({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <div className="flex items-start gap-1">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          className="mt-3 p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none shrink-0"
          aria-label="ドラッグして並び替え"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
});
