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
import { Settings, Edit, ChevronDown, ChevronUp } from 'lucide-react';

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

function HabitList({ habits, habitLogs, dailyLogId }: HabitListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [formData, setFormData] = useState<HabitFormData>({
    habit_name: '',
    habit_type: 'good',
    points: 1,
    exp_body: 0,
    exp_mind: 0,
    exp_spirit: 0,
    input_type: 'checkbox',
    exclude_weekends: false,
    exclude_from_complete: false,
  });

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

  // 良習慣、悪習慣、ボーナスに分類（フィルター適用後）
  const goodHabits = applyFilters(habitsWithLogs.filter((h) => h.habit_type === 'good'));
  const badHabits = applyFilters(habitsWithLogs.filter((h) => h.habit_type === 'bad'));
  const bonusHabits = applyFilters(habitsWithLogs.filter((h) => h.habit_type === 'bonus'));

  // habit_logsを更新または作成
  const updateHabitLog = async (habitId: string, isChecked: boolean, count: number) => {
    if (!dailyLogId) {
      console.error('dailyLogId is null');
      return;
    }

    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const existingLog = habitLogs.find((log) => log.habit_id === habitId);
    const wasChecked = existingLog?.is_checked || false;
    const previousCount = existingLog?.count || 0;
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
      // ユーザー情報を取得
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }

      // 現在のプロファイルを取得
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('points, exp_body, exp_mind, exp_spirit')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('プロファイル情報の取得に失敗しました');
      }

      // ポイント・EXPの差分を計算
      let pointsDelta = 0;
      let expBodyDelta = 0;
      let expMindDelta = 0;
      let expSpiritDelta = 0;

      if (habit.habit_type === 'bad') {
        // 悪習慣: チェックが入ったら（やってしまったら）マイナス、外れたら（回避したら）プラス
        if (isChecked && !wasChecked) {
          // 新しくチェックが入った → マイナス
          pointsDelta = -habit.points * currentCount;
          expBodyDelta = -habit.exp_body * currentCount;
          expMindDelta = -habit.exp_mind * currentCount;
          expSpiritDelta = -habit.exp_spirit * currentCount;
        } else if (!isChecked && wasChecked) {
          // チェックが外れた → プラス（元に戻す）
          pointsDelta = habit.points * previousCount;
          expBodyDelta = habit.exp_body * previousCount;
          expMindDelta = habit.exp_mind * previousCount;
          expSpiritDelta = habit.exp_spirit * previousCount;
        } else if (isChecked && wasChecked && habit.input_type === 'number') {
          // 数値入力で既にチェック済みの場合、差分を計算
          const countDelta = currentCount - previousCount;
          pointsDelta = -habit.points * countDelta;
          expBodyDelta = -habit.exp_body * countDelta;
          expMindDelta = -habit.exp_mind * countDelta;
          expSpiritDelta = -habit.exp_spirit * countDelta;
        }
      } else {
        // 良習慣・ボーナス: チェックが入ったらプラス、外れたらマイナス
        if (isChecked && !wasChecked) {
          // 新しくチェックが入った → プラス
          pointsDelta = habit.points * currentCount;
          expBodyDelta = habit.exp_body * currentCount;
          expMindDelta = habit.exp_mind * currentCount;
          expSpiritDelta = habit.exp_spirit * currentCount;
        } else if (!isChecked && wasChecked) {
          // チェックが外れた → マイナス（元に戻す）
          pointsDelta = -habit.points * previousCount;
          expBodyDelta = -habit.exp_body * previousCount;
          expMindDelta = -habit.exp_mind * previousCount;
          expSpiritDelta = -habit.exp_spirit * previousCount;
        } else if (isChecked && wasChecked && habit.input_type === 'number') {
          // 数値入力で既にチェック済みの場合、差分を計算
          const countDelta = currentCount - previousCount;
          pointsDelta = habit.points * countDelta;
          expBodyDelta = habit.exp_body * countDelta;
          expMindDelta = habit.exp_mind * countDelta;
          expSpiritDelta = habit.exp_spirit * countDelta;
        }
      }

      // プロファイルのポイント・EXPを更新（差分がある場合のみ）
      // 注意: プロファイル更新を先に行い、成功したらhabit_logsを更新する
      // これにより、プロファイル更新が失敗した場合はhabit_logsも更新されない（整合性を保つ）
      if (pointsDelta !== 0 || expBodyDelta !== 0 || expMindDelta !== 0 || expSpiritDelta !== 0) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            points: Math.max(0, profile.points + pointsDelta),
            exp_body: Math.max(0, profile.exp_body + expBodyDelta),
            exp_mind: Math.max(0, profile.exp_mind + expMindDelta),
            exp_spirit: Math.max(0, profile.exp_spirit + expSpiritDelta),
          })
          .eq('id', user.id);

        if (updateError) {
          throw new Error(`プロファイル更新エラー: ${updateError.message}`);
        }
      }

      // habit_logsを更新または作成（プロファイル更新が成功した後）
      if (existingLog) {
        // 既存のログを更新
        const { error } = await supabase
          .from('habit_logs')
          .update({
            is_checked: isChecked,
            count: currentCount,
          })
          .eq('id', existingLog.id);

        if (error) {
          // habit_logs更新エラー時は、プロファイルを元に戻す必要がある
          // ただし、プロファイル更新は既に成功しているため、ロールバック処理を実行
          if (pointsDelta !== 0 || expBodyDelta !== 0 || expMindDelta !== 0 || expSpiritDelta !== 0) {
            await supabase
              .from('profiles')
              .update({
                points: Math.max(0, profile.points - pointsDelta),
                exp_body: Math.max(0, profile.exp_body - expBodyDelta),
                exp_mind: Math.max(0, profile.exp_mind - expMindDelta),
                exp_spirit: Math.max(0, profile.exp_spirit - expSpiritDelta),
              })
              .eq('id', user.id);
          }
          throw error;
        }
      } else {
        // 新しいログを作成（チェックを入れた場合のみ）
        if (isChecked) {
          const { error } = await supabase.from('habit_logs').insert({
            daily_log_id: dailyLogId,
            habit_id: habitId,
            is_checked: isChecked,
            count: currentCount,
          });

          if (error) {
            // habit_logs作成エラー時は、プロファイルを元に戻す
            if (pointsDelta !== 0 || expBodyDelta !== 0 || expMindDelta !== 0 || expSpiritDelta !== 0) {
              await supabase
                .from('profiles')
                .update({
                  points: Math.max(0, profile.points - pointsDelta),
                  exp_body: Math.max(0, profile.exp_body - expBodyDelta),
                  exp_mind: Math.max(0, profile.exp_mind - expMindDelta),
                  exp_spirit: Math.max(0, profile.exp_spirit - expSpiritDelta),
                })
                .eq('id', user.id);
            }
            throw error;
          }
        }
      }

      // 成功時はページをリフレッシュして最新データを取得
      router.refresh();
    } catch (error) {
      console.error('習慣更新エラー:', error);
      // エラー時は元の状態に戻す
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
      return -habit.points * habit.count;
    }
    return habit.points * habit.count;
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
    setFormData({
      habit_name: '',
      habit_type: habitType,
      points: 1,
      exp_body: 0,
      exp_mind: 0,
      exp_spirit: 0,
      input_type: 'checkbox',
      exclude_weekends: false,
      exclude_from_complete: false,
    });
    setIsModalOpen(true);
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingHabit(null);
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
    setFormData({
      habit_name: habit.habit_name,
      habit_type: habit.habit_type,
      points: habit.points,
      exp_body: habit.exp_body,
      exp_mind: habit.exp_mind,
      exp_spirit: habit.exp_spirit,
      input_type: habit.input_type,
      exclude_weekends: habit.exclude_weekends,
      exclude_from_complete: habit.exclude_from_complete,
    });
    setIsManagementModalOpen(false);
    setIsModalOpen(true);
  };

  // 習慣を更新
  const handleUpdateHabit = async () => {
    if (!formData.habit_name.trim() || !editingHabit) {
      toast.error('習慣名を入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('habits')
        .update({
          habit_name: formData.habit_name.trim(),
          habit_type: formData.habit_type,
          points: formData.points,
          exp_body: formData.exp_body,
          exp_mind: formData.exp_mind,
          exp_spirit: formData.exp_spirit,
          input_type: formData.input_type,
          exclude_weekends: formData.exclude_weekends,
          exclude_from_complete: formData.exclude_from_complete,
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
    if (!formData.habit_name.trim()) {
      toast.error('習慣名を入力してください');
      return;
    }
    const pointsLabel = formData.habit_type === 'good' ? '加点ポイント' : formData.habit_type === 'bad' ? '減点ポイント' : 'ボーナスポイント';
    const numericFields = [
      { label: pointsLabel, value: formData.points },
      { label: '身体EXP', value: formData.exp_body },
      { label: '頭脳EXP', value: formData.exp_mind },
      { label: '精神EXP', value: formData.exp_spirit },
    ];
    for (const f of numericFields) {
      if (Number.isNaN(f.value) || f.value < 0) {
        toast.error(`${f.label}は0以上の数値で入力してください`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 現在のユーザーを取得
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast.error('ログインが必要です', {
          description: '再度ログインしてください',
        });
        return;
      }

      if (editingHabit) {
        // 更新
        const { error } = await supabase
          .from('habits')
          .update({
            habit_name: formData.habit_name.trim(),
            habit_type: formData.habit_type,
            points: formData.points,
            exp_body: formData.exp_body,
            exp_mind: formData.exp_mind,
            exp_spirit: formData.exp_spirit,
            input_type: formData.input_type,
            exclude_weekends: formData.exclude_weekends,
            exclude_from_complete: formData.exclude_from_complete,
            difficulty: 'medium',
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
      } else {
        // 新規作成
        // 最大display_orderを取得
        const { data: maxOrderHabit } = await supabase
          .from('habits')
          .select('display_order')
          .eq('user_id', user.id)
          .order('display_order', { ascending: false })
          .limit(1)
          .single();

        const displayOrder = maxOrderHabit ? maxOrderHabit.display_order + 1 : 0;

        // 習慣を作成
        const { data: newHabit, error } = await supabase
          .from('habits')
          .insert({
            user_id: user.id,
            habit_name: formData.habit_name.trim(),
            habit_type: formData.habit_type,
            points: formData.points,
            exp_body: formData.exp_body,
            exp_mind: formData.exp_mind,
            exp_spirit: formData.exp_spirit,
            input_type: formData.input_type,
            exclude_weekends: formData.exclude_weekends,
            exclude_from_complete: formData.exclude_from_complete,
            difficulty: 'medium',
            is_custom: true,
            display_order: displayOrder,
          })
          .select()
          .single();

        if (error) {
          console.error('習慣作成エラー:', error);
          toast.error('習慣の作成に失敗しました', {
            description: error.message || 'データベースエラーが発生しました',
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
    <div className="space-y-4 sm:space-y-6">
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
          <FormCard id="good-habits-content" className="p-3 sm:p-4 space-y-3">
          {goodHabits.map((habit) => (
            <div key={habit.id} className="flex items-center gap-3 text-base">
              {/* チェックボックス */}
              <button
                id={`habit-${habit.id}`}
                onClick={() => toggleCheck(habit.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCheck(habit.id);
                  }
                }}
                aria-label={`${habit.habit_name}を${habit.checked ? '未完了' : '完了'}にする`}
                aria-checked={habit.checked}
                role="checkbox"
                tabIndex={0}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  habit.checked
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'bg-transparent border-zinc-600 hover:border-zinc-400'
                }`}
              >
                {habit.checked && (
                  <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>

              {/* 習慣名、難易度、タグ */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <label
                    htmlFor={`habit-${habit.id}`}
                    className={`flex-1 cursor-pointer ${habit.checked ? 'text-zinc-100' : 'text-zinc-400'}`}
                  >
                    {habit.habit_name}
                  </label>
                </div>
              </div>

              {/* 数値入力（input_typeがnumberの場合のみ表示） */}
              {habit.input_type === 'number' ? (
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={habit.count}
                  onChange={(e) => updateCount(habit.id, parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 bg-zinc-800 border-zinc-600 text-zinc-100 text-center text-base focus:border-cyan-500"
                />
              ) : (
                <div className="w-16"></div>
              )}

              {/* ポイント表示 */}
              <span className={`text-base font-medium whitespace-nowrap min-w-[3.5rem] text-right ${
                habit.habit_type === 'bad' && habit.checked ? 'text-red-400' : 'text-cyan-400'
              }`}>
                {habit.checked && calculatePoints(habit) !== 0 ? (
                  calculatePoints(habit) > 0 ? `(+${calculatePoints(habit)}G)` : `(${calculatePoints(habit)}G)`
                ) : ''}
              </span>
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
          <FormCard id="bad-habits-content" className="p-3 sm:p-4 space-y-3">
          {badHabits.map((habit) => (
            <div key={habit.id} className="flex items-center gap-3 text-base">
              {/* チェックボックス */}
              <button
                id={`habit-${habit.id}`}
                onClick={() => toggleCheck(habit.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCheck(habit.id);
                  }
                }}
                aria-label={`${habit.habit_name}を${habit.checked ? '未完了' : '完了'}にする`}
                aria-checked={habit.checked}
                role="checkbox"
                tabIndex={0}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  habit.checked
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'bg-transparent border-zinc-600 hover:border-zinc-400'
                }`}
              >
                {habit.checked && (
                  <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>

              {/* 習慣名 */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <label
                    htmlFor={`habit-${habit.id}`}
                    className={`flex-1 cursor-pointer ${habit.checked ? 'text-zinc-100' : 'text-zinc-400'}`}
                  >
                    {habit.habit_name}
                  </label>
                </div>
              </div>

              {/* スペーサー（良習慣の数値入力と揃える） */}
              <div className="w-16"></div>

              {/* ポイント表示 */}
              <span className={`text-base font-medium whitespace-nowrap min-w-[3.5rem] text-right ${
                habit.habit_type === 'bad' && habit.checked ? 'text-red-400' : 'text-cyan-400'
              }`}>
                {habit.checked && calculatePoints(habit) !== 0 ? (
                  calculatePoints(habit) > 0 ? `(+${calculatePoints(habit)}G)` : `(${calculatePoints(habit)}G)`
                ) : ''}
              </span>
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
                onClick={toggleCompleteBonus}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCompleteBonus();
                  }
                }}
                aria-label={`${bonusHabits[0].habit_name}を${completeBonus ? '未完了' : '完了'}にする`}
                aria-checked={completeBonus}
                role="checkbox"
                tabIndex={0}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  completeBonus
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'bg-transparent border-zinc-600 hover:border-zinc-400'
                }`}
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

              {/* スペーサー（良習慣の数値入力と揃える） */}
              <div className="w-16"></div>

              {/* ポイント表示 */}
              <span className="text-base text-cyan-400 font-medium whitespace-nowrap min-w-[3.5rem] text-right">
                {completeBonus ? `(+${bonusHabits[0].points}G)` : ''}
              </span>
            </div>
            </FormCard>
          )}
        </div>
      )}

      {/* モーダル（習慣追加） */}
      <Modal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingHabit ? '習慣を編集' : '+ 新規習慣を作成'}
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
              value={formData.habit_name}
              onChange={(e) => setFormData({ ...formData, habit_name: e.target.value })}
              placeholder="例: 筋トレ、読書、タバコを吸わない"
            />

            {/* 入力タイプ */}
            <div>
              <FormLabel htmlFor="input_type">入力タイプ</FormLabel>
              <select
                id="input_type"
                value={formData.input_type}
                onChange={(e) => setFormData({ ...formData, input_type: e.target.value as 'checkbox' | 'number' })}
                className="mt-2 w-full pl-4 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent custom-select-arrow"
              >
                <option value="checkbox">チェックボックス</option>
                <option value="number">数値入力（回数・距離など）</option>
              </select>
            </div>

            {/* ポイント（種類に応じたラベル：加点/減点/ボーナス） */}
            <div>
              <FormLabel htmlFor="points">
                {formData.habit_type === 'good' ? '加点ポイント（ゴルド）' : formData.habit_type === 'bad' ? '減点ポイント（ゴルド）' : 'ボーナスポイント（ゴルド）'}
              </FormLabel>
              <input
                id="points"
                type="number"
                min="0"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
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
                  value={formData.exp_body}
                  onChange={(e) => setFormData({ ...formData, exp_body: parseInt(e.target.value) || 0 })}
                />
                <FormInputSmall
                  id="exp_mind"
                  label="頭脳EXP"
                  type="number"
                  min="0"
                  value={formData.exp_mind}
                  onChange={(e) => setFormData({ ...formData, exp_mind: parseInt(e.target.value) || 0 })}
                />
                <FormInputSmall
                  id="exp_spirit"
                  label="精神EXP"
                  type="number"
                  min="0"
                  value={formData.exp_spirit}
                  onChange={(e) => setFormData({ ...formData, exp_spirit: parseInt(e.target.value) || 0 })}
                />
              </div>
            </FormCard>

            {/* オプション設定 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="exclude_weekends"
                  checked={formData.exclude_weekends}
                  onChange={(e) => setFormData({ ...formData, exclude_weekends: e.target.checked })}
                  className="w-4 h-4 text-cyan-600 bg-zinc-800 border-zinc-700 rounded focus:ring-cyan-500"
                />
                <Label htmlFor="exclude_weekends" className="text-base text-zinc-300 cursor-pointer">
                  週末を除外する
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="exclude_from_complete"
                  checked={formData.exclude_from_complete}
                  onChange={(e) => setFormData({ ...formData, exclude_from_complete: e.target.checked })}
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
                      {habit.input_type === 'number' && (
                        <span className="text-base text-zinc-500">数値入力</span>
                      )}
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
