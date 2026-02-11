'use client';

import { useState, useMemo, memo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { FormInput, FormInputSmall, FormLabel } from '@/components/ui/form-input';
import { FormCard, FormCardContent } from '@/components/ui/form-card';
import { toast } from 'sonner';
import { Settings, Edit, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { isWeekendOrHoliday } from '@/lib/date-utils';

interface Habit {
  id: string;
  user_id: string;
  habit_name: string;
  habit_type: 'good' | 'bad' | 'bonus';
  points: number;
  exp_body: number;
  exp_mind: number;
  exp_spirit: number;
  display_order: number;
  is_custom: boolean;
  input_type: 'checkbox' | 'number';
  exclude_weekends: boolean;
  exclude_from_complete: boolean;
  difficulty?: string;
  created_at: string;
  updated_at: string;
}

interface HabitLog {
  id: string;
  daily_log_id: string;
  habit_id: string;
  is_checked: boolean;
  count: number;
  created_at: string;
  updated_at: string;
}

interface HabitListProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  dailyLogId: string | null;
  /** 表示中の日付（YYYY-MM-DD）。週末除外ラベル表示に使用 */
  logDate?: string | null;
  /** 日誌確定済みのとき true（チェック・数値入力無効化） */
  isConfirmed?: boolean;
}

interface HabitWithLog extends Habit {
  checked: boolean;
  count: number;
  habitLogId: string | null;
}

interface HabitFormData {
  habit_name: string;
  habit_type: 'good' | 'bad' | 'bonus';
  points: number;
  exp_body: number;
  exp_mind: number;
  exp_spirit: number;
  input_type: 'checkbox' | 'number';
  exclude_weekends: boolean;
  exclude_from_complete: boolean;
}

function HabitList({ habits, habitLogs, dailyLogId, logDate, isConfirmed = false }: HabitListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const defaultFormData: HabitFormData = {
    habit_name: '',
    habit_type: 'good',
    points: 1,
    exp_body: 0,
    exp_mind: 0,
    exp_spirit: 0,
    input_type: 'checkbox',
    exclude_weekends: false,
    exclude_from_complete: false,
  };
  const [formData, setFormData] = useState<HabitFormData>(defaultFormData);
  /** モーダル内フォーム用。開閉時と入力時のみ更新され、他から上書きされない */
  const [modalFormData, setModalFormData] = useState<HabitFormData>(defaultFormData);

  // habitsとhabit_logsをマージ（useMemoで計算）
  const baseHabitsWithLogs = useMemo<HabitWithLog[]>(() => {
    return habits.map((habit) => {

      const log = habitLogs.find((log) => log.habit_id === habit.id);
      return {
        ...habit,
        checked: log?.is_checked || false,
        count: log?.count || (habit.input_type === 'number' ? 0 : 1),
        habitLogId: log?.id || null,
      };
    });
  }, [habits, habitLogs]);

  // データベース更新後の一時的な状態管理
  const [localUpdates, setLocalUpdates] = useState<Map<string, { checked: boolean; count: number }>>(new Map());

  // 計算された値と一時的な更新をマージ
  const habitsWithLogs = useMemo<HabitWithLog[]>(() => {
    return baseHabitsWithLogs.map((habit) => {
      const update = localUpdates.get(habit.id);
      if (update) {
        return {
          ...habit,
          checked: update.checked,
          count: update.count,
        };
      }
      return habit;
    });
  }, [baseHabitsWithLogs, localUpdates]);

  // アコーディオンの開閉状態を管理
  const [isGoodHabitsExpanded, setIsGoodHabitsExpanded] = useState(true);
  const [isBadHabitsExpanded, setIsBadHabitsExpanded] = useState(true);
  const [isBonusExpanded, setIsBonusExpanded] = useState(true);

  // フィルター適用（習慣では難易度フィルターなし）
  const applyFilters = (habits: HabitWithLog[]) => habits;

  // 週末除外ラベル表示
  const showWeekendExcludedLabel = (habit: HabitWithLog) => habit.exclude_weekends;
  const isWeekendOrHolidayToday = isWeekendOrHoliday(logDate);
  // Completeボーナス対象外ラベル表示
  const showCompExcludedLabel = (habit: HabitWithLog) => habit.exclude_from_complete;

  // 良習慣、悪習慣、ボーナスに分類（フィルター適用後）
  const goodHabits = applyFilters(habitsWithLogs.filter((h) => h.habit_type === 'good'));
  const badHabits = applyFilters(habitsWithLogs.filter((h) => h.habit_type === 'bad'));
  const bonusHabits = applyFilters(habitsWithLogs.filter((h) => h.habit_type === 'bonus'));

  // habit_logsを更新または作成（API経由でサーバー側認証を使用）
  const updateHabitLog = async (habitId: string, isChecked: boolean, count: number) => {
    if (isConfirmed) return;
    if (!dailyLogId) {
      toast.error('この日付の日誌がまだありません', {
        description: '日誌エリアで日付を選ぶか、今日の日付でチェックできます。',
      });
      return;
    }

    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const currentCount = habit.input_type === 'number' ? count : (isChecked ? 1 : 0);

    // 一時的な状態を先に更新（即座にUI反映）
    setLocalUpdates((prev) => {
      const newMap = new Map(prev);
      newMap.set(habitId, {
        checked: isChecked,
        count: currentCount,
      });
      return newMap;
    });

    try {
      const res = await fetch('/api/habit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dailyLogId,
          habitId,
          isChecked,
          count: currentCount,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        toast.error('ログインが必要です', {
          description: '再度ログインしてください',
        });
        setLocalUpdates((prev) => {
          const newMap = new Map(prev);
          newMap.delete(habitId);
          return newMap;
        });
        return;
      }

      if (!res.ok) {
        toast.error('習慣の更新に失敗しました', {
          description: (data?.error ?? data?.details) || 'しばらくしてからお試しください',
        });
        setLocalUpdates((prev) => {
          const newMap = new Map(prev);
          newMap.delete(habitId);
          return newMap;
        });
        return;
      }

      router.refresh();
    } catch (error) {
      console.error('習慣更新エラー:', error);
      setLocalUpdates((prev) => {
        const newMap = new Map(prev);
        newMap.delete(habitId);
        return newMap;
      });
      toast.error('習慣の更新に失敗しました', {
        description: error instanceof Error ? error.message : 'データベースエラーが発生しました',
      });
    }
  };

  // チェックボックス切り替え
  const toggleCheck = async (habitId: string) => {
    const habit = habitsWithLogs.find((h) => h.id === habitId);
    if (!habit) return;

    const newChecked = !habit.checked;
    await updateHabitLog(habitId, newChecked, habit.count);
  };

  // 数値入力の変更
  const updateCount = async (habitId: string, newCount: number) => {
    if (isConfirmed) return;
    const habit = habitsWithLogs.find((h) => h.id === habitId);
    if (!habit) return;

    const count = Math.max(0, newCount);
    await updateHabitLog(habitId, habit.checked, count);
  };

  // ポイント計算（表示用）
  const calculatePoints = (habit: HabitWithLog) => {
    if (!habit.checked) return 0;
    // 悪習慣の場合はマイナス、良習慣・ボーナスはプラス
    if (habit.habit_type === 'bad') {
      // 週末除外が付いている習慣は、週末は減点表示しない（メモ仕様）
      if (habit.exclude_weekends && isWeekendOrHolidayToday) return 0;
      return -habit.points * habit.count;
    }
    return habit.points * habit.count;
  };

  // 習慣のゴルド・EXPの加減算設定値（表示用・ライン揃えのため g と exp を分離）
  const getHabitPointsExpParts = (habit: HabitWithLog): { g: string; exp: string } => {
    const sign = habit.habit_type === 'bad' ? '-' : '+';
    const g = `${sign}${habit.points}G`;
    const expParts: string[] = [];
    if (habit.exp_body > 0) expParts.push(`身体${sign}${habit.exp_body}`);
    if (habit.exp_mind > 0) expParts.push(`頭脳${sign}${habit.exp_mind}`);
    if (habit.exp_spirit > 0) expParts.push(`精神${sign}${habit.exp_spirit}`);
    return { g, exp: expParts.join(' ') };
  };

  // チェック時に加算・減算されるゴルド・EXP（表示用・週末除外考慮）
  const getCheckTimeDeltaParts = (habit: HabitWithLog): { g: string; exp: string } => {
    if (!habit.checked) return { g: '', exp: '' };
    const badWeekendExcluded = habit.habit_type === 'bad' && habit.exclude_weekends && isWeekendOrHolidayToday;
    if (badWeekendExcluded) return { g: '', exp: '' };
    const sign = habit.habit_type === 'bad' ? '-' : '+';
    const gVal = habit.points * habit.count;
    const g = gVal !== 0 ? `${sign}${gVal}G` : '';
    const expParts: string[] = [];
    const body = habit.exp_body * habit.count;
    const mind = habit.exp_mind * habit.count;
    const spirit = habit.exp_spirit * habit.count;
    if (body !== 0) expParts.push(`身体${sign}${Math.abs(body)}`);
    if (mind !== 0) expParts.push(`頭脳${sign}${Math.abs(mind)}`);
    if (spirit !== 0) expParts.push(`精神${sign}${Math.abs(spirit)}`);
    return { g, exp: expParts.join(' ') };
  };

  // Completeボーナスのチェック状態を取得
  const completeBonus = bonusHabits.length > 0 ? bonusHabits[0].checked : false;

  // Completeボーナスの切り替え
  const toggleCompleteBonus = async () => {
    if (bonusHabits.length > 0) {
      await toggleCheck(bonusHabits[0].id);
    }
  };

  // モーダルを開く
  const handleOpenModal = (habitType: 'good' | 'bad' | 'bonus' = 'good') => {
    setEditingHabit(null);
    const initial = {
      ...defaultFormData,
      habit_type: habitType,
    };
    setFormData(initial);
    setModalFormData(initial);
    setIsModalOpen(true);
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingHabit(null);
  };

  // ポイント設定をAIにおまかせ
  const handleAiSuggestPoints = async () => {
    const name = modalFormData.habit_name.trim();
    if (!name) {
      toast.error('習慣名を入力してからお試しください');
      return;
    }
    setAiSuggesting(true);
    try {
      const res = await fetch('/api/ai/habit-points-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habit_name: name,
          habit_type: modalFormData.habit_type,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? '提案の取得に失敗しました');
      }
      setModalFormData((prev) => ({
        ...prev,
        points: data.points ?? prev.points,
        exp_body: data.exp_body ?? prev.exp_body,
        exp_mind: data.exp_mind ?? prev.exp_mind,
        exp_spirit: data.exp_spirit ?? prev.exp_spirit,
      }));
      toast.success('ポイント・EXPを提案しました');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提案の取得に失敗しました');
    } finally {
      setAiSuggesting(false);
    }
  };

  // 習慣管理モーダルを開く
  const handleOpenManagementModal = () => {
    setIsManagementModalOpen(true);
  };

  // 習慣管理モーダルを閉じる
  const handleCloseManagementModal = () => {
    setIsManagementModalOpen(false);
    setEditingHabit(null);
  };

  // 習慣編集モーダルを開く
  const handleOpenEditModal = (habit: Habit) => {
    setEditingHabit(habit);
    const initial = {
      habit_name: habit.habit_name,
      habit_type: habit.habit_type,
      points: habit.points,
      exp_body: habit.exp_body,
      exp_mind: habit.exp_mind,
      exp_spirit: habit.exp_spirit,
      input_type: habit.input_type,
      exclude_weekends: habit.exclude_weekends,
      exclude_from_complete: habit.exclude_from_complete,
    };
    setFormData(initial);
    setModalFormData(initial);
    setIsManagementModalOpen(false);
    setIsModalOpen(true);
  };

  // 習慣を更新
  const handleUpdateHabit = async () => {
    if (!modalFormData.habit_name.trim() || !editingHabit) {
      toast.error('習慣名を入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('habits')
        .update({
          habit_name: modalFormData.habit_name.trim(),
          habit_type: modalFormData.habit_type,
          points: modalFormData.points,
          exp_body: modalFormData.exp_body,
          exp_mind: modalFormData.exp_mind,
          exp_spirit: modalFormData.exp_spirit,
          input_type: 'checkbox',
          exclude_weekends: modalFormData.exclude_weekends,
          exclude_from_complete: modalFormData.exclude_from_complete,
        })
        .eq('id', editingHabit.id);

      if (error) {
        console.error('習慣更新エラー:', error);
        toast.error('習慣の更新に失敗しました', {
          description: error.message || 'データベースエラーが発生しました',
        });
        return;
      }

      toast.success('習慣を更新しました');
      handleCloseModal();
      router.refresh();
    } catch (err) {
      console.error('予期しないエラー:', err);
      toast.error('エラーが発生しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 習慣を削除
  const handleDeleteHabit = async (habit: Habit) => {
    if (!window.confirm(`「${habit.habit_name}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', habit.id);

      if (error) {
        console.error('習慣削除エラー:', error);
        toast.error('習慣の削除に失敗しました', {
          description: error.message || 'データベースエラーが発生しました',
        });
        return;
      }

      toast.success('習慣を削除しました');
      router.refresh();
    } catch (err) {
      console.error('予期しないエラー:', err);
      toast.error('エラーが発生しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    }
  };

  // 習慣の並び替え（上に移動）
  const handleMoveUp = async (habit: Habit) => {
    const currentOrder = habit.display_order;
    if (currentOrder === 0) return;

    // 同じ種類の習慣を取得してソート
    const sameTypeHabits = habits
      .filter((h) => h.habit_type === habit.habit_type)
      .sort((a, b) => a.display_order - b.display_order);

    const currentIndex = sameTypeHabits.findIndex((h) => h.id === habit.id);
    if (currentIndex <= 0) return;

    const prevHabit = sameTypeHabits[currentIndex - 1];

    try {
      // 2つの習慣のdisplay_orderを入れ替え
      await supabase
        .from('habits')
        .update({ display_order: prevHabit.display_order })
        .eq('id', habit.id);

      await supabase
        .from('habits')
        .update({ display_order: currentOrder })
        .eq('id', prevHabit.id);

      toast.success('習慣の順序を変更しました');
      router.refresh();
    } catch (err) {
      console.error('並び替えエラー:', err);
      toast.error('並び替えに失敗しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    }
  };

  // 習慣の並び替え（下に移動）
  const handleMoveDown = async (habit: Habit) => {
    const currentOrder = habit.display_order;

    // 同じ種類の習慣を取得してソート
    const sameTypeHabits = habits
      .filter((h) => h.habit_type === habit.habit_type)
      .sort((a, b) => a.display_order - b.display_order);

    const currentIndex = sameTypeHabits.findIndex((h) => h.id === habit.id);
    if (currentIndex >= sameTypeHabits.length - 1) return;

    const nextHabit = sameTypeHabits[currentIndex + 1];

    try {
      // 2つの習慣のdisplay_orderを入れ替え
      await supabase
        .from('habits')
        .update({ display_order: nextHabit.display_order })
        .eq('id', habit.id);

      await supabase
        .from('habits')
        .update({ display_order: currentOrder })
        .eq('id', nextHabit.id);

      toast.success('習慣の順序を変更しました');
      router.refresh();
    } catch (err) {
      console.error('並び替えエラー:', err);
      toast.error('並び替えに失敗しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    }
  };

  // 習慣を保存（新規作成または更新）
  const handleSaveHabit = async () => {
    if (!modalFormData.habit_name.trim()) {
      toast.error('習慣名を入力してください');
      return;
    }
    const pointsLabel = modalFormData.habit_type === 'good' ? '加点ポイント' : modalFormData.habit_type === 'bad' ? '減点ポイント' : 'ボーナスポイント';
    const numericFields = [
      { label: pointsLabel, value: modalFormData.points },
      { label: '身体EXP', value: modalFormData.exp_body },
      { label: '頭脳EXP', value: modalFormData.exp_mind },
      { label: '精神EXP', value: modalFormData.exp_spirit },
    ];
    for (const f of numericFields) {
      if (Number.isNaN(f.value) || f.value < 0) {
        toast.error(`${f.label}は0以上の数値で入力してください`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingHabit) {
        // 更新（API経由でサーバー側認証を使用）
        const res = await fetch('/api/habits', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            habitId: editingHabit.id,
            habit_name: modalFormData.habit_name.trim(),
            habit_type: modalFormData.habit_type,
            points: modalFormData.points,
            exp_body: modalFormData.exp_body,
            exp_mind: modalFormData.exp_mind,
            exp_spirit: modalFormData.exp_spirit,
            input_type: 'checkbox',
            exclude_weekends: modalFormData.exclude_weekends,
            exclude_from_complete: modalFormData.exclude_from_complete,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          toast.error('ログインが必要です', {
            description: '再度ログインしてください',
          });
          return;
        }
        if (!res.ok) {
          toast.error('習慣の更新に失敗しました', {
            description: (data?.error ?? data?.details) || 'しばらくしてからお試しください',
          });
          return;
        }

        toast.success('習慣を更新しました');
      } else {
        // 新規作成（API経由でサーバー側認証を使用）
        const res = await fetch('/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            habit_name: modalFormData.habit_name.trim(),
            habit_type: modalFormData.habit_type,
            points: modalFormData.points,
            exp_body: modalFormData.exp_body,
            exp_mind: modalFormData.exp_mind,
            exp_spirit: modalFormData.exp_spirit,
            input_type: 'checkbox',
            exclude_weekends: modalFormData.exclude_weekends,
            exclude_from_complete: modalFormData.exclude_from_complete,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          toast.error('ログインが必要です', {
            description: '再度ログインしてください',
          });
          return;
        }
        if (!res.ok) {
          toast.error('習慣の作成に失敗しました', {
            description: (data?.error ?? data?.details) || 'しばらくしてからお試しください',
          });
          return;
        }

        toast.success('習慣を作成しました');
      }

      // モーダルを閉じる
      handleCloseModal();

      // ページをリフレッシュしてデータを再取得
      router.refresh();
    } catch (err) {
      console.error('予期しないエラー:', err);
      toast.error('エラーが発生しました', {
        description: err instanceof Error ? err.message : '予期しないエラーが発生しました',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      {/* 良習慣実行 */}
      <div>
        <button
          onClick={() => setIsGoodHabitsExpanded(!isGoodHabitsExpanded)}
          className="w-full text-left mb-2 sm:mb-3 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
          aria-expanded={isGoodHabitsExpanded}
          aria-controls="good-habits-content"
        >
          <h3 className="text-base sm:text-lg font-medium text-zinc-300">
            良習慣実行（やった場合にチェック）
          </h3>
          {isGoodHabitsExpanded ? (
            <ChevronUp className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          )}
        </button>
        {isGoodHabitsExpanded && (
          <FormCard id="good-habits-content" className="p-3 sm:p-4 overflow-hidden">
          <div className="space-y-3 w-full min-w-0">
          {goodHabits.map((habit) => (
            <div key={habit.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-base w-full">
              {/* チェックボックス */}
              <button
                id={`habit-${habit.id}`}
                onClick={() => !isConfirmed && toggleCheck(habit.id)}
                onKeyDown={(e) => {
                  if (isConfirmed) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCheck(habit.id);
                  }
                }}
                aria-label={`${habit.habit_name}を${habit.checked ? '未完了' : '完了'}にする`}
                aria-checked={habit.checked}
                aria-disabled={isConfirmed}
                role="checkbox"
                tabIndex={isConfirmed ? -1 : 0}
                disabled={isConfirmed}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  habit.checked
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'bg-transparent border-zinc-600 hover:border-zinc-400'
                } ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {habit.checked && (
                  <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>

              {/* 習慣名 */}
              <label
                htmlFor={`habit-${habit.id}`}
                className={`block truncate min-w-0 ${isConfirmed ? 'cursor-default text-zinc-500' : 'cursor-pointer'} ${habit.checked ? 'text-zinc-100' : 'text-zinc-400'}`}
              >
                {habit.habit_name}
              </label>

              {/* 右側グループ: 設定ポイント → 週末除外 → Comp対象外 → チェック時の増減（列幅固定で縦揃え） */}
              <div className="flex items-center justify-end gap-2 shrink-0">
                <div className="w-16" />
                {/* 1. 設定ポイント（開始位置・幅に余裕） */}
                <div className="flex items-baseline gap-1 text-xs text-zinc-500 whitespace-nowrap w-[11rem] min-w-[11rem]" title="ゴルド・EXPの加減算設定">
                  <span className="w-9 text-right shrink-0">{getHabitPointsExpParts(habit).g}</span>
                  <span className="min-w-0 truncate">{getHabitPointsExpParts(habit).exp}</span>
                </div>
                {/* 2. 週末除外（固定幅で縦揃え） */}
                <div className="w-[4.5rem] flex justify-end shrink-0">
                  {showWeekendExcludedLabel(habit) && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        isWeekendOrHolidayToday
                          ? 'text-cyan-300/90 bg-cyan-900/30'
                          : 'text-zinc-500 bg-zinc-800'
                      }`}
                      title="土日祝は任意（進捗に影響しません）"
                    >
                      週末除外
                    </span>
                  )}
                </div>
                {/* 3. Comp対象外（固定幅で縦揃え） */}
                <div className="w-[5.5rem] flex justify-end shrink-0">
                  {showCompExcludedLabel(habit) && (
                    <span className="text-xs px-2 py-0.5 rounded text-zinc-500 bg-zinc-800" title="Completeボーナス対象外">
                      Comp対象外
                    </span>
                  )}
                </div>
                {/* 4. チェック時の増減（ゴルド・EXPすべて・幅に余裕） */}
                <div className={`flex items-baseline gap-1 text-base font-medium whitespace-nowrap w-[13rem] min-w-[13rem] justify-end shrink-0 ${
                  habit.habit_type === 'bad' && habit.checked ? 'text-red-400' : 'text-cyan-400'
                }`} title="チェック時に加算・減算される数値">
                  {(() => {
                    const { g, exp } = getCheckTimeDeltaParts(habit);
                    if (!g && !exp) return null;
                    return (
                      <>
                        {g && <span className="shrink-0">{g}</span>}
                        {exp && <span className="min-w-0 truncate">{exp}</span>}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}

          {/* ボタン */}
          <div className="flex gap-3 pt-2 mt-3 border-t border-zinc-800">
            <Button
              onClick={() => handleOpenModal('good')}
              variant="ghost"
              size="sm"
              aria-label="新しい良習慣を追加する"
              className="text-base text-cyan-400 hover:text-cyan-300 h-auto p-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              [+ 良習慣を追加]
            </Button>
            <Button
              onClick={handleOpenManagementModal}
              variant="ghost"
              size="sm"
              aria-label="習慣を管理する"
              className="text-base text-zinc-500 hover:text-zinc-400 h-auto p-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              <Settings className="w-4 h-4 mr-1" />
              習慣を管理
            </Button>
          </div>
          </div>
          </FormCard>
        )}
      </div>

      {/* 悪習慣 */}
      <div>
        <button
          onClick={() => setIsBadHabitsExpanded(!isBadHabitsExpanded)}
          className="w-full text-left mb-2 sm:mb-3 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
          aria-expanded={isBadHabitsExpanded}
          aria-controls="bad-habits-content"
        >
          <h3 className="text-base sm:text-lg font-medium text-zinc-300">
            悪習慣（やってしまった場合にチェック）
          </h3>
          {isBadHabitsExpanded ? (
            <ChevronUp className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          )}
        </button>
        {isBadHabitsExpanded && (
          <FormCard id="bad-habits-content" className="p-3 sm:p-4 overflow-hidden">
          <div className="space-y-3 w-full min-w-0">
          {badHabits.map((habit) => (
            <div key={habit.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-base w-full">
              {/* チェックボックス */}
              <button
                id={`habit-${habit.id}`}
                onClick={() => !isConfirmed && toggleCheck(habit.id)}
                onKeyDown={(e) => {
                  if (isConfirmed) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCheck(habit.id);
                  }
                }}
                aria-label={`${habit.habit_name}を${habit.checked ? '未完了' : '完了'}にする`}
                aria-checked={habit.checked}
                aria-disabled={isConfirmed}
                role="checkbox"
                tabIndex={isConfirmed ? -1 : 0}
                disabled={isConfirmed}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  habit.checked
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'bg-transparent border-zinc-600 hover:border-zinc-400'
                } ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {habit.checked && (
                  <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>

              {/* 習慣名 */}
              <label
                htmlFor={`habit-${habit.id}`}
                className={`block cursor-pointer truncate min-w-0 ${habit.checked ? 'text-zinc-100' : 'text-zinc-400'}`}
              >
                {habit.habit_name}
              </label>

              {/* 右側グループ: 設定ポイント → 週末除外 → Comp対象外 → チェック時の増減（列幅固定で縦揃え） */}
              <div className="flex items-center justify-end gap-2 shrink-0">
                <div className="w-16" />
                {/* 1. 設定ポイント */}
                <div className="flex items-baseline gap-1 text-xs text-zinc-500 whitespace-nowrap w-[11rem] min-w-[11rem]" title="ゴルド・EXPの加減算設定">
                  <span className="w-9 text-right shrink-0">{getHabitPointsExpParts(habit).g}</span>
                  <span className="min-w-0 truncate">{getHabitPointsExpParts(habit).exp}</span>
                </div>
                {/* 2. 週末除外 */}
                <div className="w-[4.5rem] flex justify-end shrink-0">
                  {showWeekendExcludedLabel(habit) && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        isWeekendOrHolidayToday
                          ? 'text-cyan-300/90 bg-cyan-900/30'
                          : 'text-zinc-500 bg-zinc-800'
                      }`}
                      title="土日祝は任意（進捗に影響しません）"
                    >
                      週末除外
                    </span>
                  )}
                </div>
                {/* 3. Comp対象外 */}
                <div className="w-[5.5rem] flex justify-end shrink-0">
                  {showCompExcludedLabel(habit) && (
                    <span className="text-xs px-2 py-0.5 rounded text-zinc-500 bg-zinc-800" title="Completeボーナス対象外">
                      Comp対象外
                    </span>
                  )}
                </div>
                {/* 4. チェック時の増減（ゴルド・EXPすべて・幅に余裕） */}
                <div className={`flex items-baseline gap-1 text-base font-medium whitespace-nowrap w-[13rem] min-w-[13rem] justify-end shrink-0 ${
                  habit.habit_type === 'bad' && habit.checked ? 'text-red-400' : 'text-cyan-400'
                }`} title="チェック時に加算・減算される数値">
                  {(() => {
                    const { g, exp } = getCheckTimeDeltaParts(habit);
                    if (!g && !exp) return null;
                    return (
                      <>
                        {g && <span className="shrink-0">{g}</span>}
                        {exp && <span className="min-w-0 truncate">{exp}</span>}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}

          {/* ボタン */}
          <div className="flex gap-3 pt-2 mt-3 border-t border-zinc-800">
            <Button
              onClick={() => handleOpenModal('bad')}
              variant="ghost"
              size="sm"
              aria-label="新しい悪習慣を追加する"
              className="text-base text-cyan-400 hover:text-cyan-300 h-auto p-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              [+ 悪習慣を追加]
            </Button>
            <Button
              onClick={handleOpenManagementModal}
              variant="ghost"
              size="sm"
              aria-label="習慣を管理する"
              className="text-base text-zinc-500 hover:text-zinc-400 h-auto p-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              <Settings className="w-4 h-4 mr-1" />
              習慣を管理
            </Button>
          </div>
          </div>
          </FormCard>
        )}
      </div>

      {/* ボーナス */}
      {bonusHabits.length > 0 && (
        <div>
          <button
            onClick={() => setIsBonusExpanded(!isBonusExpanded)}
            className="w-full text-left mb-2 sm:mb-3 flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
            aria-expanded={isBonusExpanded}
            aria-controls="bonus-content"
          >
            <h3 className="text-base sm:text-lg font-medium text-zinc-300">
              ボーナス
            </h3>
            {isBonusExpanded ? (
              <ChevronUp className="w-5 h-5 text-zinc-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400 flex-shrink-0" />
            )}
          </button>
          {isBonusExpanded && (
            <FormCard id="bonus-content" className="p-3 sm:p-4">
            <div className="flex items-center gap-2 text-base">
              {/* チェックボックス */}
              <button
                id={`bonus-${bonusHabits[0].id}`}
                onClick={() => !isConfirmed && toggleCompleteBonus()}
                onKeyDown={(e) => {
                  if (isConfirmed) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCompleteBonus();
                  }
                }}
                aria-label={`${bonusHabits[0].habit_name}を${completeBonus ? '未完了' : '完了'}にする`}
                aria-checked={completeBonus}
                aria-disabled={isConfirmed}
                role="checkbox"
                tabIndex={isConfirmed ? -1 : 0}
                disabled={isConfirmed}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  completeBonus
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'bg-transparent border-zinc-600 hover:border-zinc-400'
                } ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {completeBonus && (
                  <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>

              {/* ボーナス名 */}
              <label
                htmlFor={`bonus-${bonusHabits[0].id}`}
                className={`flex-1 cursor-pointer ${completeBonus ? 'text-zinc-100' : 'text-zinc-400'}`}
              >
                {bonusHabits[0].habit_name}
              </label>

              {/* スペーサー（列揃え） */}
              <div className="w-16" />

              {/* 1. 設定ポイント */}
              <div className="flex items-baseline gap-1 text-xs text-zinc-500 whitespace-nowrap w-[11rem] min-w-[11rem]" title="ゴルド・EXPの加減算設定">
                <span className="w-9 text-right shrink-0">{getHabitPointsExpParts(bonusHabits[0]).g}</span>
                <span className="min-w-0 truncate">{getHabitPointsExpParts(bonusHabits[0]).exp}</span>
              </div>
              {/* 2. 週末除外 */}
              <div className="w-[4.5rem] flex justify-end shrink-0">
                {showWeekendExcludedLabel(bonusHabits[0]) && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      isWeekendOrHolidayToday ? 'text-cyan-300/90 bg-cyan-900/30' : 'text-zinc-500 bg-zinc-800'
                    }`}
                    title="土日祝は任意（進捗に影響しません）"
                  >
                    週末除外
                  </span>
                )}
              </div>
              {/* 3. Comp対象外 */}
              <div className="w-[5.5rem] flex justify-end shrink-0">
                {showCompExcludedLabel(bonusHabits[0]) && (
                  <span className="text-xs px-2 py-0.5 rounded text-zinc-500 bg-zinc-800" title="Completeボーナス対象外">
                    Comp対象外
                  </span>
                )}
              </div>
              {/* 4. チェック時の増減（ゴルド・EXPすべて・幅に余裕） */}
              <div className="flex items-baseline gap-1 text-base font-medium whitespace-nowrap w-[13rem] min-w-[13rem] justify-end shrink-0 text-cyan-400" title="チェック時に加算・減算される数値">
                {(() => {
                  const { g, exp } = getCheckTimeDeltaParts(bonusHabits[0]);
                  if (!g && !exp) return null;
                  return (
                    <>
                      {g && <span className="shrink-0">{g}</span>}
                      {exp && <span className="min-w-0 truncate">{exp}</span>}
                    </>
                  );
                })()}
              </div>
            </div>
            </FormCard>
          )}
        </div>
      )}

      {/* モーダル（習慣追加） */}
      <Modal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={
          editingHabit
            ? '習慣を編集'
            : modalFormData.habit_type === 'good'
              ? '良習慣を追加'
              : modalFormData.habit_type === 'bad'
                ? '悪習慣を追加'
                : 'ボーナスを追加'
        }
        description={editingHabit ? '習慣の内容を編集します' : '新しい習慣を追加して、日々の成長を記録しましょう'}
        footer={
          <>
            <Button
              onClick={handleSaveHabit}
              disabled={isSubmitting}
              aria-label={editingHabit ? '習慣を更新する' : '習慣を作成する'}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {isSubmitting ? (editingHabit ? '更新中...' : '作成中...') : (editingHabit ? '更新' : '作成')}
            </Button>
            <Button
              onClick={handleCloseModal}
              disabled={isSubmitting}
              variant="outline"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            >
              キャンセル
            </Button>
          </>
        }
      >
            {/* 習慣名 */}
            <FormInput
              id="habit_name"
              label="習慣名"
              required
              type="text"
              value={modalFormData.habit_name}
              onChange={(e) => setModalFormData((prev) => ({ ...prev, habit_name: e.target.value }))}
              placeholder="例: 筋トレ、読書、タバコを吸わない"
            />

            {/* 入力タイプは当面チェックリストのみのため選択肢なし（常に checkbox） */}

            {/* ポイント設定をAIにおまかせ */}
            <div className="mb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAiSuggestPoints}
                disabled={aiSuggesting || !modalFormData.habit_name.trim()}
                className="gap-2 bg-zinc-800/50 border-zinc-600 text-cyan-400 hover:bg-zinc-700 hover:text-cyan-300"
                aria-label="習慣名からポイント・EXPをAIに提案してもらう"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                {aiSuggesting ? '提案中...' : 'ポイント設定をAIにおまかせ'}
              </Button>
              <p className="text-xs text-zinc-400 mt-2">
                習慣名と種類から、ポイント・EXPを提案します。反映後も編集できます。
              </p>
              <ul className="text-xs text-zinc-400 mt-1 list-disc list-inside space-y-0.5">
                <li>良習慣はゴルド +1・EXPは、身体/頭脳/精神のどれかを +1。</li>
                <li>悪習慣はゴルド -1・EXPは、身体/頭脳/精神のどれかを -1。</li>
                <li>習慣名から、どの属性値に振るか判断します。</li>
              </ul>
            </div>

            {/* ポイント（種類に応じたラベル：加点/減点/ボーナス） */}
            <div>
              <FormLabel htmlFor="points">
                {modalFormData.habit_type === 'good' ? '加点ポイント（ゴルド）' : modalFormData.habit_type === 'bad' ? '減点ポイント（ゴルド）' : 'ボーナスポイント（ゴルド）'}
              </FormLabel>
              <input
                id="points"
                type="number"
                min="0"
                value={modalFormData.points}
                onChange={(e) => setModalFormData((prev) => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                className="mt-2 w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* 報酬設定（EXP） */}
            <FormCard variant="nested" className="p-4 space-y-3">
              <h4 className="text-base font-medium text-yellow-400 mb-3">EXP設定</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInputSmall
                  id="exp_body"
                  label="身体EXP"
                  type="number"
                  min="0"
                  value={modalFormData.exp_body}
                  onChange={(e) => setModalFormData((prev) => ({ ...prev, exp_body: parseInt(e.target.value) || 0 }))}
                />
                <FormInputSmall
                  id="exp_mind"
                  label="頭脳EXP"
                  type="number"
                  min="0"
                  value={modalFormData.exp_mind}
                  onChange={(e) => setModalFormData((prev) => ({ ...prev, exp_mind: parseInt(e.target.value) || 0 }))}
                />
                <FormInputSmall
                  id="exp_spirit"
                  label="精神EXP"
                  type="number"
                  min="0"
                  value={modalFormData.exp_spirit}
                  onChange={(e) => setModalFormData((prev) => ({ ...prev, exp_spirit: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </FormCard>

            {/* オプション設定 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="exclude_weekends"
                  checked={modalFormData.exclude_weekends}
                  onChange={(e) => setModalFormData((prev) => ({ ...prev, exclude_weekends: e.target.checked }))}
                  className="w-4 h-4 text-cyan-600 bg-zinc-800 border-zinc-700 rounded focus:ring-cyan-500"
                />
                <Label htmlFor="exclude_weekends" className="text-base text-zinc-300 cursor-pointer">
                  週末を除外する
                </Label>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {modalFormData.habit_type === 'bad' ? (
                  <>
                    ユーザーの任意で、週末はマストではない悪習慣に設定します。
                    <br />
                    ONの場合、週末にチェックが入ったとしても減点されることはありません。
                  </>
                ) : (
                  <>
                    ユーザーの任意で、週末はマスト実行ではない良習慣に設定します。
                    <br />
                    ONの場合でも、週末に実行することも可能でポイントも加算されます。
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="exclude_from_complete"
                  checked={modalFormData.exclude_from_complete}
                  onChange={(e) => setModalFormData((prev) => ({ ...prev, exclude_from_complete: e.target.checked }))}
                  className="w-4 h-4 text-cyan-600 bg-zinc-800 border-zinc-700 rounded focus:ring-cyan-500"
                />
                <Label htmlFor="exclude_from_complete" className="text-base text-zinc-300 cursor-pointer">
                  Completeボーナス対象外にする
                </Label>
              </div>
            </div>

      </Modal>

      {/* 習慣管理モーダル */}
      <Modal
        open={isManagementModalOpen}
        onOpenChange={setIsManagementModalOpen}
        title="習慣を管理"
        description="習慣の編集、削除、並び替えができます"
        maxWidth="2xl"
      >
        <div className="space-y-6">
          {/* 良習慣 */}
          <div>
            <h4 className="text-base font-medium text-cyan-400 mb-3">良習慣</h4>
            <div className="space-y-2">
              {habits
                .filter((h) => h.habit_type === 'good')
                .sort((a, b) => a.display_order - b.display_order)
                .map((habit, index, arr) => (
                  <div
                    key={habit.id}
                    className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-base text-zinc-500 w-8">{index + 1}</span>
                      <span className="flex-1 text-base text-zinc-100">{habit.habit_name}</span>
                      <span className="text-base text-zinc-400">
                        {habit.points}G / {habit.exp_body + habit.exp_mind + habit.exp_spirit}ex
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => handleMoveUp(habit)}
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        aria-label={`${habit.habit_name}を上に移動する`}
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300"
                      >
                        ↑
                      </Button>
                      <Button
                        onClick={() => handleMoveDown(habit)}
                        variant="ghost"
                        size="sm"
                        disabled={index === arr.length - 1}
                        aria-label={`${habit.habit_name}を下に移動する`}
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300"
                      >
                        ↓
                      </Button>
                      <Button
                        onClick={() => handleOpenEditModal(habit)}
                        variant="ghost"
                        size="sm"
                        aria-label={`${habit.habit_name}を編集する`}
                        className="h-7 px-2 text-base text-cyan-400 hover:text-cyan-300"
                      >
                        編集
                      </Button>
                      {habit.is_custom && (
                        <Button
                          onClick={() => handleDeleteHabit(habit)}
                          variant="ghost"
                          size="sm"
                          aria-label={`${habit.habit_name}を削除する`}
                          className="h-7 px-2 text-base text-red-400 hover:text-red-300"
                        >
                          削除
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* 悪習慣 */}
          <div>
            <h4 className="text-base font-medium text-red-400 mb-3">悪習慣</h4>
            <div className="space-y-2">
              {habits
                .filter((h) => h.habit_type === 'bad')
                .sort((a, b) => a.display_order - b.display_order)
                .map((habit, index, arr) => (
                  <div
                    key={habit.id}
                    className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-base text-zinc-500 w-8">{index + 1}</span>
                      <span className="flex-1 text-base text-zinc-100">{habit.habit_name}</span>
                      <span className="text-base text-zinc-400">
                        {habit.points}G / {habit.exp_body + habit.exp_mind + habit.exp_spirit}ex
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => handleMoveUp(habit)}
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        aria-label={`${habit.habit_name}を上に移動する`}
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300"
                      >
                        ↑
                      </Button>
                      <Button
                        onClick={() => handleMoveDown(habit)}
                        variant="ghost"
                        size="sm"
                        disabled={index === arr.length - 1}
                        aria-label={`${habit.habit_name}を下に移動する`}
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300"
                      >
                        ↓
                      </Button>
                      <Button
                        onClick={() => handleOpenEditModal(habit)}
                        variant="ghost"
                        size="sm"
                        aria-label={`${habit.habit_name}を編集する`}
                        className="h-7 px-2 text-base text-cyan-400 hover:text-cyan-300"
                      >
                        編集
                      </Button>
                      {habit.is_custom && (
                        <Button
                          onClick={() => handleDeleteHabit(habit)}
                          variant="ghost"
                          size="sm"
                          aria-label={`${habit.habit_name}を削除する`}
                          className="h-7 px-2 text-base text-red-400 hover:text-red-300"
                        >
                          削除
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* ボーナス */}
          {habits.filter((h) => h.habit_type === 'bonus').length > 0 && (
            <div>
              <h4 className="text-base font-medium text-yellow-400 mb-3">ボーナス</h4>
              <div className="space-y-2">
                {habits
                  .filter((h) => h.habit_type === 'bonus')
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((habit, index, arr) => (
                    <div
                      key={habit.id}
                      className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-base text-zinc-500 w-8">{index + 1}</span>
                        <span className="flex-1 text-base text-zinc-100">{habit.habit_name}</span>
                        <span className="text-base text-zinc-400">
                          {habit.points}G / {habit.exp_body + habit.exp_mind + habit.exp_spirit}ex
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => handleMoveUp(habit)}
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                          aria-label={`${habit.habit_name}を上に移動する`}
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300"
                        >
                          ↑
                        </Button>
                        <Button
                          onClick={() => handleMoveDown(habit)}
                          variant="ghost"
                          size="sm"
                          disabled={index === arr.length - 1}
                          aria-label={`${habit.habit_name}を下に移動する`}
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300"
                        >
                          ↓
                        </Button>
                        <Button
                          onClick={() => handleOpenEditModal(habit)}
                          variant="ghost"
                          size="sm"
                          aria-label={`${habit.habit_name}を編集する`}
                          className="h-7 px-2 text-base text-cyan-400 hover:text-cyan-300"
                        >
                          編集
                        </Button>
                        {habit.is_custom && (
                          <Button
                            onClick={() => handleDeleteHabit(habit)}
                            variant="ghost"
                            size="sm"
                            aria-label={`${habit.habit_name}を削除する`}
                            className="h-7 px-2 text-base text-red-400 hover:text-red-300"
                          >
                            削除
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// React.memoでメモ化（propsが変わったときだけ再レンダリング）
export default memo(HabitList);
